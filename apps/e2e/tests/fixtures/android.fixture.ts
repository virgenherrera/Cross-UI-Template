import { test as base, type Page } from "@playwright/test";
import { execSync } from "node:child_process";

// Playwright's _android API is experimental (underscore-prefixed)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { _android: android } = require("playwright");

// VERIFICATION: Before first use, confirm WebView debugging works:
// 1. Build and run the app on Android emulator
// 2. Open chrome://inspect in Chrome
// 3. The WebView should appear under "Remote Target"
// 4. If not visible, add WebView.setWebContentsDebuggingEnabled(true) to MainActivity.kt
// Android WebView 113+ enables debugging automatically for debuggable apps

const ANDROID_PKG = process.env.ANDROID_PKG ?? "com.example.myapp";

interface AndroidFixtures {
  androidPage: Page;
}

/**
 * Restart the Dioxus app via ADB and return a fresh WebView page.
 *
 * `page.reload()` breaks the Playwright CDP connection on Android WebView.
 * Instead we force-stop and relaunch via ADB, then re-attach to the WebView.
 * This guarantees the Dioxus router starts at "/" (SplashScreen).
 */
async function restartAppAndGetPage(device: import("playwright").AndroidDevice): Promise<Page> {
  execSync(`adb shell am force-stop ${ANDROID_PKG}`);
  await new Promise((resolve) => setTimeout(resolve, 1_000));
  execSync(`adb shell am start -n ${ANDROID_PKG}/dev.dioxus.main.MainActivity`);
  await new Promise((resolve) => setTimeout(resolve, 3_000));

  const webview = await device.webView({ pkg: ANDROID_PKG });
  const page = await webview.page();

  await page
    .locator("[data-testid='splash-screen']")
    .waitFor({ state: "visible", timeout: 15_000 });

  return page;
}

export const test = base.extend<AndroidFixtures>({
  androidPage: async ({}, use) => {
    const [device] = await android.devices();
    if (!device) {
      throw new Error(
        "No Android device found. Ensure an emulator is running or a device is connected via ADB.",
      );
    }

    let page: Page;

    try {
      const webview = await device.webView({ pkg: ANDROID_PKG });
      page = await webview.page();
    } catch {
      page = await restartAppAndGetPage(device);
      await use(page);
      await device.close();
      return;
    }

    // Check if splash is already visible — if not, restart the app
    const splashVisible = await page
      .locator("[data-testid='splash-screen']")
      .isVisible()
      .catch(() => false);

    if (!splashVisible) {
      page = await restartAppAndGetPage(device);
    }

    await use(page);

    await device.close();
  },
});

export { expect } from "@playwright/test";
