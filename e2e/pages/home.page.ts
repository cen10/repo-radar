import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Page object for the Home/Landing page
 */
export class HomePage extends BasePage {
  readonly heading: Locator;
  readonly signInButton: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: /repo radar/i });
    this.signInButton = page.getByRole('button', {
      name: /sign in with github/i,
    });
  }

  async goto() {
    await super.goto('/');
  }

  async expectToBeOnHomePage() {
    await expect(this.heading).toBeVisible();
    await expect(this.signInButton).toBeVisible();
  }

  async clickSignIn() {
    await this.signInButton.click();
  }
}
