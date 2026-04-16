/**
 * Custom E2E visual regression runner using Playwright LIBRARY (not test CLI).
 *
 * The Playwright test CLI hangs in the Claude Code sandbox, but the library
 * works perfectly. This script replicates the SplashToHome visual regression
 * tests using pixelmatch for image comparison.
 *
 * Usage: node --experimental-strip-types src/run-e2e.ts
 */

import { chromium } from "playwright";
import type { Browser, BrowserContext } from "playwright";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ColorScheme = "dark" | "light";

interface E2EProject {
  name: string;
  viewport: { width: number; height: number };
  colorScheme: ColorScheme;
  locale: string;
}

interface FlowStep {
  name: string;
  action: (ctx: StepContext) => Promise<void>;
}

interface Flow {
  name: string;
  steps: FlowStep[];
}

interface StepContext {
  context: BrowserContext;
  page: import("playwright").Page;
}

interface ComparisonResult {
  project: string;
  flow: string;
  step: string;
  passed: boolean;
  diffRatio: number;
  message: string;
  expectedPath: string;
  actualPath: string;
  diffPath: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const APP_URL = process.env.APP_URL ?? "http://localhost:8080";
const ROOT_DIR = join(import.meta.dirname, "../../..");
const SNAPSHOTS_DIR = join(ROOT_DIR, ".generated/snapshots");
const DIFFS_DIR = join(ROOT_DIR, ".generated/reports/e2e-diffs");
const MAX_DIFF_RATIO = 0.005;
const PIXELMATCH_THRESHOLD = 0.1;

// ---------------------------------------------------------------------------
// Web projects — 3 viewports × 2 themes × 2 locales = 12 combinations
// ---------------------------------------------------------------------------

// Single project for simplified pipeline. To re-enable multi-variant testing,
// uncomment the full WEB_PROJECTS array below and comment out the single-entry one.
const WEB_PROJECTS: E2EProject[] = [
  { name: "web-desktop-light-en", viewport: { width: 1280, height: 720 }, colorScheme: "light", locale: "en" },
];

// // Full multi-variant matrix (12 combinations):
// const WEB_PROJECTS: E2EProject[] = [
//   // Phone (375x812)
//   { name: "web-phone-dark-en", viewport: { width: 375, height: 812 }, colorScheme: "dark", locale: "en" },
//   { name: "web-phone-dark-es", viewport: { width: 375, height: 812 }, colorScheme: "dark", locale: "es" },
//   { name: "web-phone-light-en", viewport: { width: 375, height: 812 }, colorScheme: "light", locale: "en" },
//   { name: "web-phone-light-es", viewport: { width: 375, height: 812 }, colorScheme: "light", locale: "es" },
//   // Tablet (768x1024)
//   { name: "web-tablet-dark-en", viewport: { width: 768, height: 1024 }, colorScheme: "dark", locale: "en" },
//   { name: "web-tablet-dark-es", viewport: { width: 768, height: 1024 }, colorScheme: "dark", locale: "es" },
//   { name: "web-tablet-light-en", viewport: { width: 768, height: 1024 }, colorScheme: "light", locale: "en" },
//   { name: "web-tablet-light-es", viewport: { width: 768, height: 1024 }, colorScheme: "light", locale: "es" },
//   // Desktop (1280x720)
//   { name: "web-desktop-dark-en", viewport: { width: 1280, height: 720 }, colorScheme: "dark", locale: "en" },
//   { name: "web-desktop-dark-es", viewport: { width: 1280, height: 720 }, colorScheme: "dark", locale: "es" },
//   { name: "web-desktop-light-en", viewport: { width: 1280, height: 720 }, colorScheme: "light", locale: "en" },
//   { name: "web-desktop-light-es", viewport: { width: 1280, height: 720 }, colorScheme: "light", locale: "es" },
// ];

// ---------------------------------------------------------------------------
// Flows — maps to reference snapshots in .generated/snapshots/{project}/{flow}/
// ---------------------------------------------------------------------------

function discoverFlows(): Flow[] {
  // Discover flows from the first available project's snapshot directory
  const sampleProject = WEB_PROJECTS[0];
  const projectDir = join(SNAPSHOTS_DIR, sampleProject.name);

  if (!existsSync(projectDir)) {
    throw new Error(
      `Reference snapshots not found at ${projectDir}.\nRun artifact capture first: pnpm run artifacts:capture`,
    );
  }

  const flowDirs = readdirSync(projectDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  if (flowDirs.length === 0) {
    throw new Error(`No flow directories found in ${projectDir}`);
  }

  return flowDirs.map((flowName) => {
    const stepFiles = readdirSync(join(projectDir, flowName))
      .filter((f) => f.endsWith(".png"))
      .sort(); // Sorted alphabetically — "Step 1 ..." < "Step 2 ..."

    return {
      name: flowName,
      steps: stepFiles.map((fileName) => {
        const stepName = fileName.replace(".png", "");
        return {
          name: stepName,
          action: buildStepAction(stepName),
        };
      }),
    };
  });
}

/**
 * Build the Playwright action for a given step name.
 *
 * Recognized patterns:
 *   - "Step 1 Splash" → navigate to /, wait for splash-screen
 *   - "Step 2 Home"   → wait for splash to disappear, wait for home-screen
 *   - Fallback        → wait 2s (unknown step, still capture screenshot)
 */
function buildStepAction(stepName: string): (ctx: StepContext) => Promise<void> {
  const lower = stepName.toLowerCase();

  if (lower.includes("splash")) {
    return async ({ page }: StepContext) => {
      await page.goto("/");
      await page.waitForLoadState("domcontentloaded");
      await page
        .locator("[data-testid='splash-screen']")
        .waitFor({ state: "visible", timeout: 10_000 });
    };
  }

  if (lower.includes("home")) {
    return async ({ page }: StepContext) => {
      // Wait for splash to disappear (auto-navigation)
      await page
        .locator("[data-testid='splash-screen']")
        .waitFor({ state: "hidden", timeout: 10_000 });
      // Wait for home content
      await page
        .locator("[data-testid='home-screen']")
        .waitFor({ state: "visible", timeout: 10_000 });
    };
  }

  // Fallback for future steps
  return async ({ page }: StepContext) => {
    await page.waitForTimeout(2_000);
  };
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

async function checkAppRunning(): Promise<void> {
  try {
    const response = await fetch(APP_URL, { signal: AbortSignal.timeout(5_000) });
    if (!response.ok) {
      throw new Error(`App responded with status ${response.status}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `App is not running on ${APP_URL}. Start your dev server first\n  Cause: ${message}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Image comparison
// ---------------------------------------------------------------------------

function compareScreenshots(
  expectedPath: string,
  actualBuffer: Buffer,
): { diffRatio: number; diffPng: PNG } {
  const expected = PNG.sync.read(readFileSync(expectedPath));
  const actual = PNG.sync.read(actualBuffer);

  // Size mismatch → auto-fail
  if (expected.width !== actual.width || expected.height !== actual.height) {
    throw new Error(
      `Size mismatch: expected ${expected.width}×${expected.height}, ` +
      `got ${actual.width}×${actual.height}`,
    );
  }

  const diff = new PNG({ width: expected.width, height: expected.height });

  const mismatchedPixels = pixelmatch(
    expected.data,
    actual.data,
    diff.data,
    expected.width,
    expected.height,
    { threshold: PIXELMATCH_THRESHOLD },
  );

  const totalPixels = expected.width * expected.height;
  const diffRatio = mismatchedPixels / totalPixels;

  return { diffRatio, diffPng: diff };
}

// ---------------------------------------------------------------------------
// Run one project through all flows
// ---------------------------------------------------------------------------

async function runProject(
  browser: Browser,
  project: E2EProject,
  flows: Flow[],
): Promise<ComparisonResult[]> {
  const results: ComparisonResult[] = [];

  const context = await browser.newContext({
    viewport: project.viewport,
    colorScheme: project.colorScheme,
    extraHTTPHeaders: { "Accept-Language": project.locale },
    baseURL: APP_URL,
  });

  const page = await context.newPage();

  try {
    for (const flow of flows) {
      for (const step of flow.steps) {
        const expectedPath = join(SNAPSHOTS_DIR, project.name, flow.name, `${step.name}.png`);
        const diffDir = join(DIFFS_DIR, project.name, flow.name);
        const actualPath = join(diffDir, `${step.name}-actual.png`);
        const diffPath = join(diffDir, `${step.name}-diff.png`);
        const expectedCopyPath = join(diffDir, `${step.name}-expected.png`);

        // Check reference exists
        if (!existsSync(expectedPath)) {
          results.push({
            project: project.name,
            flow: flow.name,
            step: step.name,
            passed: false,
            diffRatio: 1,
            message: `Reference not found: ${expectedPath}`,
            expectedPath,
            actualPath,
            diffPath,
          });
          continue;
        }

        try {
          // Execute step action (navigate, wait for elements)
          await step.action({ context, page });

          // Take screenshot
          const screenshotBuffer = await page.screenshot({ type: "png", fullPage: true });

          // Compare
          const { diffRatio, diffPng } = compareScreenshots(expectedPath, screenshotBuffer);
          const passed = diffRatio <= MAX_DIFF_RATIO;

          if (!passed) {
            // Save diff artifacts
            mkdirSync(diffDir, { recursive: true });
            writeFileSync(actualPath, screenshotBuffer);
            writeFileSync(diffPath, PNG.sync.write(diffPng));
            writeFileSync(expectedCopyPath, readFileSync(expectedPath));
          }

          results.push({
            project: project.name,
            flow: flow.name,
            step: step.name,
            passed,
            diffRatio,
            message: passed
              ? `PASS: diff ${(diffRatio * 100).toFixed(1)}%`
              : `FAIL: diff ${(diffRatio * 100).toFixed(1)}% exceeds ${(MAX_DIFF_RATIO * 100).toFixed(1)}% threshold`,
            expectedPath,
            actualPath,
            diffPath,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          results.push({
            project: project.name,
            flow: flow.name,
            step: step.name,
            passed: false,
            diffRatio: 1,
            message: errorMessage,
            expectedPath,
            actualPath,
            diffPath,
          });
        }
      }
    }
  } finally {
    await page.close();
    await context.close();
  }

  return results;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function printResults(results: ComparisonResult[]): void {
  const totalSteps = results.length;
  let passCount = 0;
  let failCount = 0;

  for (const r of results) {
    const icon = r.passed ? "\u2713" : "\u2717";
    const status = r.passed ? "PASS" : "FAIL";
    const stepLabel = `${r.step}`.padEnd(20);
    console.log(
      `[${r.project}] ${stepLabel} ${icon} ${status} (${r.message})`,
    );

    if (r.passed) {
      passCount++;
    } else {
      failCount++;
    }
  }

  console.log("");
  console.log(`SUMMARY: ${passCount} passed, ${failCount} failed`);

  if (failCount > 0) {
    console.log(`Diff images saved to ${DIFFS_DIR}/`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("Checking app availability...");
  await checkAppRunning();

  console.log("Discovering flows from reference snapshots...");
  const flows = discoverFlows();

  const totalSteps = flows.reduce((sum, f) => sum + f.steps.length, 0);
  console.log(
    `\nE2E Visual Regression \u2014 ${WEB_PROJECTS.length} projects \u00d7 ${totalSteps} steps = ${WEB_PROJECTS.length * totalSteps} comparisons\n`,
  );

  for (const flow of flows) {
    console.log(`  Flow: ${flow.name} (${flow.steps.length} steps: ${flow.steps.map((s) => s.name).join(", ")})`);
  }
  console.log("");

  console.log("Launching browser...");
  const browser = await chromium.launch();

  const allResults: ComparisonResult[] = [];

  try {
    for (const project of WEB_PROJECTS) {
      console.log(`  [${project.name}] Running...`);
      const results = await runProject(browser, project, flows);
      allResults.push(...results);
    }
  } finally {
    await browser.close();
  }

  console.log("");
  printResults(allResults);

  const hasFailed = allResults.some((r) => !r.passed);
  const exitCode = hasFailed ? 1 : 0;
  console.log(`\nExit code: ${exitCode}`);
  process.exit(exitCode);
}

main().catch((error: unknown) => {
  console.error("E2E run failed:", error);
  process.exit(1);
});
