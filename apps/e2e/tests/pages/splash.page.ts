import type { Locator, Page } from "@playwright/test";

export class SplashPage {
  readonly splashContent: Locator;

  constructor(private readonly page: Page) {
    this.splashContent = page.locator("[data-testid='splash-screen']");
  }

  async goto() {
    await this.page.goto("/");
    await this.page.waitForLoadState("domcontentloaded");
    await this.splashContent.waitFor({ state: "visible" });
  }

  async waitForNavigation() {
    await this.splashContent.waitFor({ state: "hidden", timeout: 10_000 });
  }
}
