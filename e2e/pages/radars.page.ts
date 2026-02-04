import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Page object for Radar CRUD operations.
 * Radars are created from the /stars page and viewed at /radar/:id.
 */
export class RadarsPage extends BasePage {
  readonly createRadarButton: Locator;
  readonly radarNameInput: Locator;
  readonly createSubmitButton: Locator;
  readonly menuButton: Locator;
  readonly deleteMenuItem: Locator;
  readonly deleteConfirmButton: Locator;
  readonly repositoryCards: Locator;

  constructor(page: Page) {
    super(page);
    this.createRadarButton = page.getByRole('button', { name: /create radar|new radar/i });
    this.radarNameInput = page.getByPlaceholder(/machine learning|web dev/i);
    this.createSubmitButton = page.getByRole('button', { name: /^create$/i });
    this.menuButton = page.getByRole('button', { name: /menu|options/i });
    this.deleteMenuItem = page.getByRole('menuitem', { name: /delete/i });
    this.deleteConfirmButton = page.getByRole('button', { name: /^delete$/i });
    this.repositoryCards = page.getByRole('article').filter({ hasText: /stars:/i });
  }

  /**
   * Navigate to the stars page where radar creation is available.
   */
  async goto() {
    await super.goto('/stars');
    // Wait for content to be ready (positive signal vs absence of spinner)
    await this.createRadarButton.waitFor({ state: 'visible' });
  }

  /**
   * Create a new radar with the given name.
   * Returns the generated radar name.
   */
  async createRadar(name: string): Promise<string> {
    await expect(this.createRadarButton).toBeVisible();
    await this.createRadarButton.click();

    await expect(this.radarNameInput).toBeVisible();
    await this.radarNameInput.fill(name);

    await this.createSubmitButton.click();

    // Wait for radar to appear in sidebar
    await expect(this.getRadarLink(name)).toBeVisible();

    return name;
  }

  /**
   * Get a locator for a radar link by name.
   */
  getRadarLink(name: string): Locator {
    return this.page.getByRole('link', { name });
  }

  /**
   * Navigate to a radar by clicking its link in the sidebar.
   */
  async navigateToRadar(name: string) {
    await this.getRadarLink(name).click();
    await expect(this.page).toHaveURL(/\/radar\//);
  }

  /**
   * Delete the currently viewed radar.
   * Must be on a radar detail page (/radar/:id).
   */
  async deleteCurrentRadar() {
    await expect(this.menuButton).toBeVisible();
    await this.menuButton.click();

    await expect(this.deleteMenuItem).toBeVisible();
    await this.deleteMenuItem.click();

    await expect(this.deleteConfirmButton).toBeVisible();
    await this.deleteConfirmButton.click();

    await expect(this.page).toHaveURL('/stars');
  }

  /**
   * Create a radar, navigate to it, then delete it.
   * Useful for cleanup or testing the full CRUD flow.
   */
  async createAndDeleteRadar(name: string) {
    await this.createRadar(name);
    await this.navigateToRadar(name);
    await this.deleteCurrentRadar();
  }
}
