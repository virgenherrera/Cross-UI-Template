import { defineConfig, devices } from "@playwright/test";

type ColorScheme = "dark" | "light";

function webProject(
  device: string,
  width: number,
  height: number,
  scheme: ColorScheme,
  locale: string,
) {
  return {
    name: `web-${device}-${scheme}-${locale}`,
    use: {
      ...devices["Desktop Chrome"],
      viewport: { width, height },
      colorScheme: scheme,
      locale,
      baseURL: "http://localhost:8080",
    },
  };
}

// Single project for simplified pipeline. To re-enable multi-variant testing,
// uncomment the full webProjects array below and comment out the single-entry one.
const webProjects = [webProject("desktop", 1280, 720, "light", "en")];

// // Full multi-variant matrix (12 combinations):
// const webProjects = [
//   webProject("phone", 375, 812, "dark", "en"),
//   webProject("phone", 375, 812, "dark", "es"),
//   webProject("phone", 375, 812, "light", "en"),
//   webProject("phone", 375, 812, "light", "es"),
//   webProject("tablet", 768, 1024, "dark", "en"),
//   webProject("tablet", 768, 1024, "dark", "es"),
//   webProject("tablet", 768, 1024, "light", "en"),
//   webProject("tablet", 768, 1024, "light", "es"),
//   webProject("desktop", 1280, 720, "dark", "en"),
//   webProject("desktop", 1280, 720, "dark", "es"),
//   webProject("desktop", 1280, 720, "light", "en"),
//   webProject("desktop", 1280, 720, "light", "es"),
// ];

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests",
  snapshotDir: "../../.generated/snapshots",
  snapshotPathTemplate: "{snapshotDir}/{projectName}/{arg}{ext}",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "../../.generated/reports/e2e" }],
  ],
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.005,
    },
  },
  use: {
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm run app:dev",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    ...webProjects,
    // // Android project — uncomment when testing against a real device/emulator:
    // {
    //   name: "android",
    //   testDir: "./tests",
    //   use: {
    //     // Android tests use the androidPage fixture instead of baseURL
    //     // Connection is established via ADB to the device's WebView
    //   },
    //   grep: /@android|@all/,
    //   grepInvert: /@web-only/,
    // },
  ],
});
