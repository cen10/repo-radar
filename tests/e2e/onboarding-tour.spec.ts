import { test, expect } from './fixtures';

test.describe('Onboarding Tour', () => {
  // Helper to get the visible tour step (Shepherd keeps hidden steps in DOM)
  const visibleStep = (page: import('@playwright/test').Page) =>
    page.locator('.shepherd-element:not([hidden])');

  test('shows tour for new users on first visit', async ({ firstTimeUserPage }) => {
    await firstTimeUserPage.goto('/stars');

    await expect(visibleStep(firstTimeUserPage)).toBeVisible();
    await expect(visibleStep(firstTimeUserPage)).toContainText(/welcome to repo radar/i);
  });

  test('can complete the tour by clicking through all steps', async ({ firstTimeUserPage }) => {
    await firstTimeUserPage.goto('/stars');

    // Step 1: Welcome
    await expect(visibleStep(firstTimeUserPage)).toContainText(/welcome to repo radar/i);
    await firstTimeUserPage.getByRole('button', { name: 'Next' }).click();

    // Step 2: Help button
    await expect(visibleStep(firstTimeUserPage)).toContainText(/help menu/i);
    await firstTimeUserPage.getByRole('button', { name: 'Next' }).click();

    // Step 3: My Stars / repo-link
    await expect(visibleStep(firstTimeUserPage)).toContainText(/read-only/i);
    await firstTimeUserPage.getByRole('button', { name: 'Next' }).click();

    // Step 4: Sidebar radars - need to click a radar to continue
    await expect(visibleStep(firstTimeUserPage)).toContainText(/click any radar/i);

    await firstTimeUserPage.locator('[data-tour="sidebar-radars"] a').first().click();
    await firstTimeUserPage.waitForURL(/\/radar\//);

    // Step 5: Radar intro
    await expect(visibleStep(firstTimeUserPage)).toContainText(/use radars to collect/i);
    await firstTimeUserPage.getByRole('button', { name: 'Next' }).click();

    // Step 6: Radar icon
    await expect(visibleStep(firstTimeUserPage)).toContainText(/radar icon/i);
    await firstTimeUserPage.getByRole('button', { name: 'Next' }).click();

    // Step 7: Click repo card - need to click to continue
    await expect(visibleStep(firstTimeUserPage)).toContainText(/click on the repo card/i);

    await firstTimeUserPage.locator('[data-tour="repo-card"]').first().click();
    await firstTimeUserPage.waitForURL(/\/repo\//);

    // Step 8: Repo header
    await expect(visibleStep(firstTimeUserPage)).toContainText(/repository page/i);
    await firstTimeUserPage.getByRole('button', { name: 'Next' }).click();

    // Step 9: Releases - final step
    await expect(visibleStep(firstTimeUserPage)).toContainText(/release/i);
    await firstTimeUserPage.getByRole('button', { name: 'Finish' }).click();

    await expect(visibleStep(firstTimeUserPage)).not.toBeVisible();
  });

  test('does not show tour after completion', async ({ firstTimeUserPage }) => {
    await firstTimeUserPage.goto('/stars');

    // Complete the tour quickly by pressing Escape to cancel
    await expect(visibleStep(firstTimeUserPage)).toBeVisible();
    await firstTimeUserPage.keyboard.press('Escape');
    await expect(visibleStep(firstTimeUserPage)).not.toBeVisible();

    await firstTimeUserPage.reload();

    await expect(visibleStep(firstTimeUserPage)).not.toBeVisible();
  });

  test('can cancel tour with Escape key', async ({ firstTimeUserPage }) => {
    await firstTimeUserPage.goto('/stars');

    await expect(visibleStep(firstTimeUserPage)).toBeVisible();
    await firstTimeUserPage.keyboard.press('Escape');
    await expect(visibleStep(firstTimeUserPage)).not.toBeVisible();
  });

  test('can cancel tour with X button', async ({ firstTimeUserPage }) => {
    await firstTimeUserPage.goto('/stars');

    await expect(visibleStep(firstTimeUserPage)).toBeVisible();
    await firstTimeUserPage.locator('.shepherd-cancel-icon:visible').click();
    await expect(visibleStep(firstTimeUserPage)).not.toBeVisible();
  });

  test('can navigate back during tour', async ({ firstTimeUserPage }) => {
    await firstTimeUserPage.goto('/stars');

    await firstTimeUserPage.getByRole('button', { name: 'Next' }).click();
    await expect(visibleStep(firstTimeUserPage)).toContainText(/help menu/i);

    await firstTimeUserPage.getByRole('button', { name: 'Back' }).click();
    await expect(visibleStep(firstTimeUserPage)).toContainText(/welcome to repo radar/i);
  });

  test('does not show tour for returning users', async ({ returningUserPage }) => {
    await returningUserPage.goto('/stars');

    await expect(visibleStep(returningUserPage)).not.toBeVisible();
  });
});
