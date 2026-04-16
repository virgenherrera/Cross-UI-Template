import { test as base, type Page } from "@playwright/test";

// Playwright's _android API is experimental (underscore-prefixed)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { _android: android } = require("playwright");

// VERIFICATION: Before first use, confirm WebView debugging works:
// 1. Build and run the app on Android emulator
// 2. Open chrome://inspect in Chrome
// 3. The WebView should appear under "Remote Target"
// 4. If not visible, add WebView.setWebContentsDebuggingEnabled(true) to MainActivity.kt
// Android WebView 113+ enables debugging automatically for debuggable apps

interface AndroidFixtures {
  androidPage: Page;
}

export const test = base.extend<AndroidFixtures>({
  androidPage: async ({}, use) => {
    const [device] = await android.devices();
    if (!device) {
      throw new Error(
        "No Android device found. Ensure an emulator is running or a device is connected via ADB.",
      );
    }

    // TODO: Replace with your app's Android package name from AndroidManifest.xml
    const webview = await device.webView({ pkg: "com.your_app_package" });
    const page = await webview.page();

    await use(page);

    await device.close();
  },
});

export { expect } from "@playwright/test";
