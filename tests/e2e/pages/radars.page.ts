import { type Page, type Locator } from '@playwright/test';
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
    await this.createRadarButton.waitFor({ state: 'visible' });
  }

  /**
   * Create a new radar with the given name.
   */
  async createRadar(name: string): Promise<string> {
    await this.createRadarButton.click();
    await this.radarNameInput.fill(name);
    await this.createSubmitButton.click();
    await this.getRadarLink(name).waitFor({ state: 'visible' });
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
    await this.page.waitForURL(/\/radar\//);
  }

  /**
   * Delete the currently viewed radar.
   * Must be on a radar detail page (/radar/:id).
   */
  async deleteCurrentRadar() {
    await this.menuButton.click();
    await this.deleteMenuItem.click();
    await this.deleteConfirmButton.click();
  }
}
