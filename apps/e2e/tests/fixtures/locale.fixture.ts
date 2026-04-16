import { test as base, expect } from "@playwright/test";

export const test = base.extend({
  page: async ({ page, locale }, use) => {
    if (locale) {
      await page.setExtraHTTPHeaders({ "Accept-Language": locale });
    }
    await use(page);
  },
});

export { expect };
