import { test, expect } from "./fixtures/android.fixture";
import { SplashPage } from "./pages/splash.page";
import { HomePage } from "./pages/home.page";

/**
 * SplashToHome visual regression tests for the Android WebView.
 *
 * Prerequisites:
 *   - Android emulator running with the Dioxus app (dx serve --android)
 *   - ADB connected to the emulator (adb devices should show it)
 *   - Golden PNGs captured at .generated/snapshots/{projectName}/SplashToHome/
 *
 * The androidPage fixture connects to the WebView via ADB/CDP.
 * The app is already running — no URL navigation needed.
 */
test.describe("SplashToHome Flow", () => {
  test("splash screen matches reference", async ({ androidPage }) => {
    // Arrange — wait for the splash screen (app already running on device)
    const splash = new SplashPage(androidPage);
    await splash.goto();

    // Assert
    await expect(androidPage).toHaveScreenshot("SplashToHome/Step 1 Splash.png", {
      maxDiffPixelRatio: 0.005,
    });
  });

  test("splash navigates to home", async ({ androidPage }) => {
    // Arrange — wait for splash
    const splash = new SplashPage(androidPage);
    await splash.goto();

    // Act — wait for auto-navigation to complete
    await splash.waitForNavigation();

    // Assert
    const home = new HomePage(androidPage);
    await home.waitForContent();
    await expect(androidPage).toHaveScreenshot("SplashToHome/Step 2 Home.png", {
      maxDiffPixelRatio: 0.005,
    });
  });
});
