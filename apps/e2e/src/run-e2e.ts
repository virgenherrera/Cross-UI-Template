/**
 * Custom E2E visual regression runner using Playwright LIBRARY (not test CLI).
 *
 * Connects to an Android emulator via ADB/CDP using the Playwright `_android`
 * experimental API. The Dioxus app must already be running on the emulator
 * (started via `dx serve --android` or the VSCode launcher) BEFORE this runs.
 *
 * Usage: node --experimental-strip-types src/run-e2e.ts
 */

// Playwright's _android API is experimental (underscore-prefixed) but is
// exported from the ESM build of playwright-core.
import { _android as android } from "playwright";
import type { AndroidDevice, Page } from "playwright";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface E2EProject {
  name: string;
}

interface FlowStep {
  name: string;
  action: (page: Page) => Promise<void>;
}

interface Flow {
  name: string;
  steps: FlowStep[];
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

/** Bundle ID of the Dioxus app running on the Android emulator. */
const ANDROID_PKG = process.env.ANDROID_PKG ?? "mx.virgensystems.formo";

const ROOT_DIR = join(import.meta.dirname, "../../..");
const SNAPSHOTS_DIR = join(ROOT_DIR, ".generated/snapshots");
const DIFFS_DIR = join(ROOT_DIR, ".generated/reports/e2e-diffs");
// Cross-engine comparison (Storybook/Chrome vs Dioxus/Android WebView) has
// inherent rendering differences. 5% allows font/anti-aliasing variance.
const MAX_DIFF_RATIO = 0.05;
const PIXELMATCH_THRESHOLD = 0.1;

// ---------------------------------------------------------------------------
// Android projects — one per snapshot directory (8 combinations)
//
// The golden PNGs live at:
//   .generated/snapshots/{project}/{flow}/{step}.png
//
// Each project name maps directly to a snapshot directory that was captured
// by the ui-spec-designer pipeline (Storybook molds → Puppeteer screenshots).
// ---------------------------------------------------------------------------

// Single project for simplified initial pipeline. Expand to full matrix once
// the Android WebView connection is confirmed green.
const ANDROID_PROJECTS: E2EProject[] = [
  { name: "phone-light-en" },
];

// // Full 8-combination matrix (uncomment when ready):
// const ANDROID_PROJECTS: E2EProject[] = [
//   { name: "phone-light-en" },
//   { name: "phone-light-es" },
//   { name: "phone-dark-en" },
//   { name: "phone-dark-es" },
//   { name: "tablet-light-en" },
//   { name: "tablet-light-es" },
//   { name: "tablet-dark-en" },
//   { name: "tablet-dark-es" },
// ];

// ---------------------------------------------------------------------------
// Flows — discovered from snapshot directories
// ---------------------------------------------------------------------------

function discoverFlows(projectName: string): Flow[] {
  const projectDir = join(SNAPSHOTS_DIR, projectName);

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
 * Before any flow starts the page has been navigated to "/" via
 * `navigateToSplash`, so the splash-screen is always the first thing visible.
 *
 * Recognized patterns:
 *   - "Step 1 Splash" → wait for splash-screen to be visible
 *   - "Step 2 Home"   → wait for splash-screen to disappear, wait for home-screen
 *   - Fallback        → wait 2 s (unknown step, still capture screenshot)
 */
function buildStepAction(stepName: string): (page: Page) => Promise<void> {
  const lower = stepName.toLowerCase();

  if (lower.includes("splash")) {
    return async (page: Page) => {
      await page
        .locator("[data-testid='splash-screen']")
        .waitFor({ state: "visible", timeout: 10_000 });
    };
  }

  if (lower.includes("home")) {
    return async (page: Page) => {
      // Wait for splash to auto-navigate away
      await page
        .locator("[data-testid='splash-screen']")
        .waitFor({ state: "hidden", timeout: 15_000 });
      // Then wait for the home screen
      await page
        .locator("[data-testid='home-screen']")
        .waitFor({ state: "visible", timeout: 15_000 });
    };
  }

  // Fallback for future steps
  return async (page: Page) => {
    await page.waitForTimeout(2_000);
  };
}

// ---------------------------------------------------------------------------
// Splash navigation helper
// ---------------------------------------------------------------------------

/**
 * Restart the Dioxus app via ADB and return a fresh WebView page.
 *
 * `page.reload()` on an Android WebView CDP session breaks the Playwright
 * connection — the CDP socket disconnects during reload. Instead, we use ADB
 * to force-stop and relaunch the app, then re-attach to its WebView.
 *
 * This guarantees we always start at the "/" (SplashScreen) route because
 * the Dioxus router initialises at "/" on every fresh process launch.
 */
async function restartAppAndGetPage(device: AndroidDevice): Promise<Page> {
  console.log("Restarting app via ADB to ensure splash screen is shown from the start...");

  // Force-stop the app process
  execSync(`adb shell am force-stop ${ANDROID_PKG}`, { stdio: "inherit" });
  // Brief pause to let the process fully die
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Relaunch the app (Dioxus Android wraps the app in dev.dioxus.main.MainActivity)
  execSync(
    `adb shell am start -n ${ANDROID_PKG}/dev.dioxus.main.MainActivity`,
    { stdio: "inherit" },
  );

  // Poll for WebView availability — the WebView becomes debuggable once the
  // WASM has loaded and rendered at least one frame. Poll with short intervals
  // to minimize time lost before the 2-second splash timer fires.
  console.log("Waiting for WebView to become available...");
  let page: Page | null = null;
  const pollStart = Date.now();
  while (Date.now() - pollStart < 10_000) {
    try {
      const webview = await device.webView({ pkg: ANDROID_PKG });
      page = await webview.page();
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  if (!page) {
    throw new Error(`WebView did not become available within 10 seconds after app restart.`);
  }

  // Wait for the app to reach ANY known state — we accept home screen too
  // because the 2-second splash timer may fire before we finish attaching.
  await page.waitForSelector(
    "[data-testid='splash-screen'], [data-testid='home-screen']",
    { timeout: 15_000 },
  );

  const onSplash = await page.locator("[data-testid='splash-screen']").isVisible().catch(() => false);
  console.log(`App ready after restart — on ${onSplash ? "splash" : "home"} screen.`);

  return page;
}

/**
 * Ensure the given page shows the splash screen.
 *
 * Fast path: if splash is still visible (we connected quickly), use the
 * existing page. Slow path: restart the app and return a fresh page.
 */
async function ensureSplashVisible(device: AndroidDevice, page: Page): Promise<Page> {
  console.log("Checking for splash screen...");

  const splashAlreadyVisible = await page
    .locator("[data-testid='splash-screen']")
    .isVisible()
    .catch(() => false);

  if (splashAlreadyVisible) {
    console.log("Splash screen already visible — no restart needed.");
    return page;
  }

  console.log("Splash has already navigated away — restarting app...");
  return restartAppAndGetPage(device);
}

// ---------------------------------------------------------------------------
// Image comparison
// ---------------------------------------------------------------------------

async function compareScreenshots(
  expectedPath: string,
  actualBuffer: Buffer,
): Promise<{ diffRatio: number; diffPng: PNG }> {
  const expected = PNG.sync.read(readFileSync(expectedPath));
  const actual = PNG.sync.read(actualBuffer);

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
  device: AndroidDevice,
  project: E2EProject,
  flows: Flow[],
): Promise<ComparisonResult[]> {
  const results: ComparisonResult[] = [];

  for (const flow of flows) {
    // Restart the app at the beginning of each flow so we always start from
    // the splash screen. Each flow is an independent app lifecycle.
    console.log(`  [${project.name}/${flow.name}] Restarting app for fresh flow start...`);
    const page = await restartAppAndGetPage(device);

    // If we landed on home (splash was too fast), the splash step action will
    // fail — that's expected behaviour and will be reported as a test failure.

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
        // Execute step action (wait for elements — no URL navigation)
        await step.action(page);

        // Screenshot at native resolution — golden PNGs are captured at the
        // same viewport + DPR so dimensions match without resize.
        const screenshotBuffer = await page.screenshot({ type: "png", fullPage: false });

        // Direct comparison — same resolution, no resize needed
        const { diffRatio, diffPng } = await compareScreenshots(expectedPath, screenshotBuffer);
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

  return results;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function printResults(results: ComparisonResult[]): void {
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
  console.log(`Connecting to Android device (pkg: ${ANDROID_PKG})...`);

  // Connect to the first available ADB device/emulator
  const [device] = await android.devices();

  if (!device) {
    throw new Error(
      "No Android device found. Ensure the emulator is running and connected via ADB.\n" +
      "  Check: adb devices",
    );
  }

  console.log(`Connected to device: ${device.model()}`);

  try {
    // Discover flows from the first project (all projects share the same flow structure)
    const sampleProject = ANDROID_PROJECTS[0];
    console.log("Discovering flows from reference snapshots...");
    const flows = discoverFlows(sampleProject.name);

    const totalSteps = flows.reduce((sum, f) => sum + f.steps.length, 0);
    console.log(
      `\nE2E Visual Regression \u2014 ${ANDROID_PROJECTS.length} project(s) \u00d7 ${totalSteps} steps = ${ANDROID_PROJECTS.length * totalSteps} comparisons\n`,
    );

    for (const flow of flows) {
      console.log(`  Flow: ${flow.name} (${flow.steps.length} steps: ${flow.steps.map((s) => s.name).join(", ")})`);
    }
    console.log("");

    const allResults: ComparisonResult[] = [];

    for (const project of ANDROID_PROJECTS) {
      console.log(`  [${project.name}] Running...`);
      const results = await runProject(device, project, flows);
      allResults.push(...results);
    }

    console.log("");
    printResults(allResults);

    const hasFailed = allResults.some((r) => !r.passed);
    const exitCode = hasFailed ? 1 : 0;
    console.log(`\nExit code: ${exitCode}`);
    process.exit(exitCode);
  } finally {
    await device.close();
  }
}

main().catch((error: unknown) => {
  console.error("E2E run failed:", error);
  process.exit(1);
});
