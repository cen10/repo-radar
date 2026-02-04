import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class StarsPage extends BasePage {
  readonly heading: Locator;
  readonly openSearchButton: Locator;
  readonly searchInput: Locator;
  readonly repositoryCards: Locator;
  readonly emptyState: Locator;
  readonly createRadarButton: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: /my stars|starred/i });
    this.openSearchButton = page.getByRole('button', { name: /open search/i });
    this.searchInput = page.getByPlaceholder(/search your starred/i);
    this.repositoryCards = page.getByRole('article').filter({ hasText: /stars:/i });
    this.emptyState = page.getByText(/no starred repositories/i);
    this.createRadarButton = page.getByRole('button', { name: /create radar|new radar/i });
  }

  async goto() {
    await super.goto('/stars');
    await this.createRadarButton.waitFor({ state: 'visible' });
  }

  async search(query: string) {
    await this.openSearchButton.click();
    await this.searchInput.waitFor({ state: 'visible' });
    await this.searchInput.fill(query);
  }

  async addFirstRepoToRadar(radarName: string): Promise<string> {
    const firstRepoCard = this.repositoryCards.first();
    const repoName = await firstRepoCard.getByRole('heading', { level: 3 }).textContent();

    const addToRadarButton = firstRepoCard.getByRole('button', { name: /add to radar/i });
    await addToRadarButton.click();

    const radarCheckbox = this.page.getByRole('checkbox', { name: radarName });
    await radarCheckbox.waitFor({ state: 'visible', timeout: 10000 });
    await radarCheckbox.click();

    // Wait for API call to complete (checkbox becomes checked)
    await expect(radarCheckbox).toBeChecked({ timeout: 5000 });

    const doneButton = this.page.getByRole('button', { name: /done/i });
    await doneButton.click();

    // Wait for dropdown to close
    await radarCheckbox.waitFor({ state: 'hidden', timeout: 5000 });

    return repoName ?? '';
  }
}
