import type { Locator, Page } from "@playwright/test";

export class HomePage {
  readonly homeContent: Locator;

  constructor(private readonly page: Page) {
    this.homeContent = page.locator("[data-testid='home-screen']");
  }

  async waitForContent() {
    await this.homeContent.waitFor({ state: "visible" });
  }
}
