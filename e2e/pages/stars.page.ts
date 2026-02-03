import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class StarsPage extends BasePage {
  readonly heading: Locator;
  readonly openSearchButton: Locator;
  readonly searchInput: Locator;
  readonly sortButton: Locator;
  readonly repositoryCards: Locator;
  readonly emptyState: Locator;
  readonly sidebar: Locator;
  readonly createRadarButton: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: /my stars|starred/i });
    this.openSearchButton = page.getByRole('button', { name: /open search/i });
    this.searchInput = page.getByPlaceholder(/search your starred/i);
    this.sortButton = page.getByRole('button', { name: /sort|order/i });
    this.repositoryCards = page.locator('article').filter({ hasText: /stars:/i });
    this.emptyState = page.getByText(/no starred repositories/i);
    this.sidebar = page.getByRole('navigation');
    this.createRadarButton = page.getByRole('button', { name: /create radar/i });
  }

  async goto() {
    await super.goto('/stars');
    await this.waitForLoadingToFinish();
  }

  async expectToBeOnStarsPage() {
    await expect(this.heading).toBeVisible();
  }

  async search(query: string) {
    // Click the "Open search" button to expand the collapsible search
    await this.openSearchButton.click();
    // Wait for the search input to appear
    await expect(this.searchInput).toBeVisible();
    await this.searchInput.fill(query);
    await this.waitForLoadingToFinish();
  }

  async getRepositoryCount() {
    return this.repositoryCards.count();
  }

  async clickCreateRadar() {
    await this.createRadarButton.click();
  }
}
