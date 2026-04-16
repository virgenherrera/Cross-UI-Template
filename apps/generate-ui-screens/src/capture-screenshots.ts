import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StoryEntry {
  id: string;
  title: string;
  name: string;
  type: "story" | "docs";
  tags?: string[];
}

interface StorybookIndex {
  entries: Record<string, StoryEntry>;
}

interface FlowMeta {
  id: string;
  title: string;
  name: string;
}

interface CaptureProject {
  name: string;
  viewport: { width: number; height: number };
  theme: "dark" | "light";
  locale: "en" | "es";
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORYBOOK_URL = process.env.STORYBOOK_URL ?? "http://localhost:6006";
const SNAPSHOTS_DIR = join(import.meta.dirname, "../../../.generated/snapshots");
const TAB_CONCURRENCY = 6;

// Single project for simplified pipeline. To re-enable multi-variant capture,
// uncomment the full PROJECTS array below and comment out the single-entry one.
const PROJECTS: CaptureProject[] = [
  { name: "web-desktop-light-en", viewport: { width: 1280, height: 720 }, theme: "light", locale: "en" },
];

// // Full multi-variant matrix (24 combinations):
// const PROJECTS: CaptureProject[] = [
//   // Desktop (native app)
//   { name: "desktop-dark-en", viewport: { width: 1280, height: 720 }, theme: "dark", locale: "en" },
//   { name: "desktop-dark-es", viewport: { width: 1280, height: 720 }, theme: "dark", locale: "es" },
//   { name: "desktop-light-en", viewport: { width: 1280, height: 720 }, theme: "light", locale: "en" },
//   { name: "desktop-light-es", viewport: { width: 1280, height: 720 }, theme: "light", locale: "es" },
//   // Web Phone
//   { name: "web-phone-dark-en", viewport: { width: 375, height: 812 }, theme: "dark", locale: "en" },
//   { name: "web-phone-dark-es", viewport: { width: 375, height: 812 }, theme: "dark", locale: "es" },
//   { name: "web-phone-light-en", viewport: { width: 375, height: 812 }, theme: "light", locale: "en" },
//   { name: "web-phone-light-es", viewport: { width: 375, height: 812 }, theme: "light", locale: "es" },
//   // Web Tablet
//   { name: "web-tablet-dark-en", viewport: { width: 768, height: 1024 }, theme: "dark", locale: "en" },
//   { name: "web-tablet-dark-es", viewport: { width: 768, height: 1024 }, theme: "dark", locale: "es" },
//   { name: "web-tablet-light-en", viewport: { width: 768, height: 1024 }, theme: "light", locale: "en" },
//   { name: "web-tablet-light-es", viewport: { width: 768, height: 1024 }, theme: "light", locale: "es" },
//   // Web Desktop
//   { name: "web-desktop-dark-en", viewport: { width: 1280, height: 720 }, theme: "dark", locale: "en" },
//   { name: "web-desktop-dark-es", viewport: { width: 1280, height: 720 }, theme: "dark", locale: "es" },
//   { name: "web-desktop-light-en", viewport: { width: 1280, height: 720 }, theme: "light", locale: "en" },
//   { name: "web-desktop-light-es", viewport: { width: 1280, height: 720 }, theme: "light", locale: "es" },
//   // Android Phone
//   { name: "android-phone-dark-en", viewport: { width: 375, height: 812 }, theme: "dark", locale: "en" },
//   { name: "android-phone-dark-es", viewport: { width: 375, height: 812 }, theme: "dark", locale: "es" },
//   { name: "android-phone-light-en", viewport: { width: 375, height: 812 }, theme: "light", locale: "en" },
//   { name: "android-phone-light-es", viewport: { width: 375, height: 812 }, theme: "light", locale: "es" },
//   // Android Tablet
//   { name: "android-tablet-dark-en", viewport: { width: 768, height: 1024 }, theme: "dark", locale: "en" },
//   { name: "android-tablet-dark-es", viewport: { width: 768, height: 1024 }, theme: "dark", locale: "es" },
//   { name: "android-tablet-light-en", viewport: { width: 768, height: 1024 }, theme: "light", locale: "en" },
//   { name: "android-tablet-light-es", viewport: { width: 768, height: 1024 }, theme: "light", locale: "es" },
// ];

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

async function fetchStorybookIndex(): Promise<StorybookIndex> {
  const response = await fetch(`${STORYBOOK_URL}/index.json`);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch Storybook index (${response.status}). Is Storybook running on ${STORYBOOK_URL}?`,
    );
  }
  return response.json() as Promise<StorybookIndex>;
}

/**
 * Discover flow stories from the Storybook index.
 *
 * Flow stories live under "Flows/" title prefix.
 * Each flow's meta has `parameters.flow.steps` listing the story export names
 * in order. The index.json doesn't include parameters, so we derive step order
 * from the story entries themselves — they are already ordered by export order.
 *
 * Returns a map of flow-name -> ordered list of step story entries.
 */
function discoverFlows(index: StorybookIndex): Map<string, FlowMeta[]> {
  const entries = Object.values(index.entries).filter(
    (entry) => entry.type === "story" && entry.title.startsWith("Flows/"),
  );

  const flows = new Map<string, FlowMeta[]>();

  for (const entry of entries) {
    // title is e.g. "Flows/SplashToHome"
    const flowName = entry.title.replace("Flows/", "");

    if (!flows.has(flowName)) {
      flows.set(flowName, []);
    }
    flows.get(flowName)!.push({
      id: entry.id,
      title: entry.title,
      name: entry.name,
    });
  }

  return flows;
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

async function checkStorybookRunning(): Promise<void> {
  try {
    const response = await fetch(STORYBOOK_URL, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) {
      throw new Error(`Storybook responded with status ${response.status}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Storybook is not running on ${STORYBOOK_URL}. Start it first with: pnpm run spec:dev\n  Cause: ${message}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Screenshot capture for a single project across all flows
// ---------------------------------------------------------------------------

async function captureProjectFlows(
  browser: import("playwright").Browser,
  project: CaptureProject,
  flows: Map<string, FlowMeta[]>,
): Promise<void> {
  const page = await browser.newPage();

  try {
    await page.setViewportSize(project.viewport);

    for (const [flowName, steps] of flows) {
      const outputDir = join(SNAPSHOTS_DIR, project.name, flowName);
      mkdirSync(outputDir, { recursive: true });

      for (const step of steps) {
        const url = `${STORYBOOK_URL}/iframe.html?id=${step.id}&viewMode=story&globals=theme:${project.theme};locale:${project.locale}`;
        await page.goto(url, { waitUntil: "domcontentloaded" });

        // Wait for Storybook root content to render
        await page
          .locator("#storybook-root > *")
          .first()
          .waitFor({ state: "visible", timeout: 10_000 });

        await page.screenshot({
          path: join(outputDir, `${step.name}.png`),
          type: "png",
          fullPage: true,
        });
      }
    }
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------------
// Batch runner
// ---------------------------------------------------------------------------

async function runInBatches<T>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(fn));
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("Checking Storybook availability...");
  await checkStorybookRunning();

  console.log("Discovering flow stories...");
  const index = await fetchStorybookIndex();
  const flows = discoverFlows(index);

  if (flows.size === 0) {
    console.log("No flow stories found (stories under Flows/ title prefix). Nothing to capture.");
    return;
  }

  console.log(`Found ${flows.size} flow(s):`);
  for (const [flowName, steps] of flows) {
    console.log(`  ${flowName}: ${steps.length} step(s) [${steps.map((s) => s.name).join(", ")}]`);
  }

  console.log(`\nLaunching browser for ${PROJECTS.length} project combinations...`);
  console.log(`Tab concurrency: ${TAB_CONCURRENCY}`);

  const browser = await chromium.launch();

  try {
    await runInBatches(PROJECTS, TAB_CONCURRENCY, async (project) => {
      console.log(`  [${project.name}] Capturing...`);
      await captureProjectFlows(browser, project, flows);
      console.log(`  [${project.name}] Done.`);
    });
  } finally {
    await browser.close();
  }

  console.log(`\nAll screenshots saved to ${SNAPSHOTS_DIR}`);
}

main().catch((error: unknown) => {
  console.error("Capture failed:", error);
  process.exit(1);
});
