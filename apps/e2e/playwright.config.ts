import { defineConfig } from "@playwright/test";

/**
 * Playwright configuration for Android WebView E2E tests.
 *
 * The custom runner (`src/run-e2e.ts`) is the primary E2E entry point —
 * it uses `_android` directly via the Playwright library API.
 *
 * This config is kept for Playwright CLI usage (e.g. `playwright test`).
 * It defines a single Android project that connects to the device via ADB.
 *
 * IMPORTANT: The Dioxus app must already be running on the emulator
 * (started via `dx serve --android`) before invoking the Playwright CLI.
 *
 * TODO: iOS visual regression — Playwright doesn't support iOS WebView (WKWebView
 * has no CDP). Investigate alternatives: Appium screenshot + pixelmatch, Swift
 * snapshot testing, or BrowserStack App Percy for cloud-based iOS visual comparison.
 *
 * See https://playwright.dev/docs/api/class-android
 */
export default defineConfig({
  testDir: "./tests",
  snapshotDir: "../../.generated/snapshots",
  snapshotPathTemplate: "{snapshotDir}/{projectName}/{arg}{ext}",
  fullyParallel: false, // Android tests must run serially — single WebView connection
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Serial execution — one ADB connection at a time
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "../../.generated/reports/e2e" }],
  ],
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.005,
      // Use CSS pixel resolution to match golden PNGs (375×812).
      // Without this, Android WebView screenshots are at native DPR (~3×).
      scale: "css",
    },
  },
  use: {
    trace: "on-first-retry",
    // No baseURL — Android WebView is already running the app.
    // No browser launch — we connect to the device WebView via ADB/CDP.
  },
  // No webServer block — the app runs on the emulator, not a local web server.
  projects: [
    // Single project targeting the Android WebView.
    // Name must match a snapshot directory under .generated/snapshots/.
    // Start with phone-light-en; expand to all 8 combinations when confirmed green.
    {
      name: "phone-light-en",
      testMatch: "**/*.spec.ts",
      use: {
        // Viewport dimensions should match the phone-light-en golden PNGs (375×812).
        // In practice the WebView renders at the emulator's native resolution;
        // adjust here if pixel-perfect matching requires a different size.
        viewport: { width: 375, height: 812 },
      },
    },

    // // Full 8-combination matrix (uncomment when phone-light-en is green):
    // { name: "phone-light-es", testMatch: "**/*.spec.ts", use: { viewport: { width: 375, height: 812 } } },
    // { name: "phone-dark-en",  testMatch: "**/*.spec.ts", use: { viewport: { width: 375, height: 812 } } },
    // { name: "phone-dark-es",  testMatch: "**/*.spec.ts", use: { viewport: { width: 375, height: 812 } } },
    // { name: "tablet-light-en", testMatch: "**/*.spec.ts", use: { viewport: { width: 768, height: 1024 } } },
    // { name: "tablet-light-es", testMatch: "**/*.spec.ts", use: { viewport: { width: 768, height: 1024 } } },
    // { name: "tablet-dark-en",  testMatch: "**/*.spec.ts", use: { viewport: { width: 768, height: 1024 } } },
    // { name: "tablet-dark-es",  testMatch: "**/*.spec.ts", use: { viewport: { width: 768, height: 1024 } } },
  ],
});
