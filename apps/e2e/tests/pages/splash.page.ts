import type { Locator, Page } from "@playwright/test";

export class SplashPage {
  readonly splashContent: Locator;

  constructor(private readonly page: Page) {
    this.splashContent = page.locator("[data-testid='splash-screen']");
  }

  /**
   * Wait for the splash screen to be visible.
   *
   * Unlike a web app, the Android WebView renders the app directly — there is
   * no URL to navigate to. The app launches at the splash screen automatically
   * when started via `dx serve --android`. We simply wait for the element.
   */
  async goto() {
    await this.splashContent.waitFor({ state: "visible", timeout: 15_000 });
  }

  async waitForNavigation() {
    await this.splashContent.waitFor({ state: "hidden", timeout: 15_000 });
  }
}
