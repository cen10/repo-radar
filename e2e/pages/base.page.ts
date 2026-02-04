import { type Page } from '@playwright/test';

/**
 * Base page object containing common methods and locators
 * shared across all page objects.
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path: string) {
    await this.page.goto(path);
  }

  async getPageTitle() {
    return this.page.title();
  }
}
