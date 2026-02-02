import { type Page, type Locator } from '@playwright/test';

/**
 * Base page object containing common methods and locators
 * shared across all page objects.
 */
export class BasePage {
  readonly page: Page;
  readonly loadingSpinner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loadingSpinner = page.getByRole('status', { name: /loading/i });
  }

  async goto(path: string) {
    await this.page.goto(path);
  }

  async waitForLoadingToFinish() {
    // Wait for any loading spinners to disappear
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
      // Ignore if no spinner found
    });
  }

  async getPageTitle() {
    return this.page.title();
  }
}
