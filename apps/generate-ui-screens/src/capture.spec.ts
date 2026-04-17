import { test } from "@playwright/test";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { discoverStories } from "./discovery";

const SNAPSHOTS_DIR = join(__dirname, "../../.generated/snapshots");

test.describe("Artifact Capture", () => {
  let stories: Awaited<ReturnType<typeof discoverStories>>;

  test.beforeAll(async () => {
    stories = await discoverStories("http://localhost:6006");
  });

  test("capture all stories", async ({ page }) => {
    for (const story of stories) {
      const componentDir = story.title.replace(/\//g, "-");
      const outputDir = join(SNAPSHOTS_DIR, componentDir);
      mkdirSync(outputDir, { recursive: true });

      const url = `http://localhost:6006/iframe.html?id=${story.id}&viewMode=story`;
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page
        .locator("#storybook-root > *")
        .first()
        .waitFor({ state: "visible" });

      await page.screenshot({
        path: join(outputDir, `${story.name}.png`),
        type: "png",
        fullPage: true,
      });
    }
  });
});
