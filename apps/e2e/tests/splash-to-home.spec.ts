import { test, expect } from "./fixtures/locale.fixture";
import { SplashPage } from "./pages/splash.page";
import { HomePage } from "./pages/home.page";

test.describe("SplashToHome Flow", () => {
  test("splash screen matches reference", async ({ page }) => {
    // Arrange
    const splash = new SplashPage(page);
    await splash.goto();

    // Act (already on splash)

    // Assert
    await expect(page).toHaveScreenshot("SplashToHome/Step 1 Splash.png", {
      maxDiffPixelRatio: 0.005,
    });
  });

  test("splash navigates to home", async ({ page }) => {
    // Arrange
    const splash = new SplashPage(page);
    await splash.goto();

    // Act
    await splash.waitForNavigation();

    // Assert
    const home = new HomePage(page);
    await home.waitForContent();
    await expect(page).toHaveScreenshot("SplashToHome/Step 2 Home.png", {
      maxDiffPixelRatio: 0.005,
    });
  });
});
