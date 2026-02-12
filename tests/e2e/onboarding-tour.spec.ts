import { test, expect } from './fixtures';

test.describe('Onboarding Tour', () => {
  // Helper to get the visible tour step (Shepherd keeps hidden steps in DOM)
  const visibleStep = (page: import('@playwright/test').Page) =>
    page.locator('.shepherd-element:not([hidden])');

  test('shows tour for new users on first visit', async ({ newUserPage }) => {
    await newUserPage.goto('/stars');

    // Welcome step should be visible
    await expect(visibleStep(newUserPage)).toBeVisible();
    await expect(visibleStep(newUserPage)).toContainText(/welcome to repo radar/i);
  });

  test('can complete the tour by clicking through all steps', async ({ newUserPage }) => {
    await newUserPage.goto('/stars');

    // Step 1: Welcome
    await expect(visibleStep(newUserPage)).toContainText(/welcome to repo radar/i);
    await newUserPage.getByRole('button', { name: 'Next' }).click();

    // Step 2: Help button
    await expect(visibleStep(newUserPage)).toContainText(/help menu/i);
    await newUserPage.getByRole('button', { name: 'Next' }).click();

    // Step 3: My Stars / repo-link
    await expect(visibleStep(newUserPage)).toContainText(/read-only/i);
    await newUserPage.getByRole('button', { name: 'Next' }).click();

    // Step 4: Sidebar radars - need to click a radar to continue
    await expect(visibleStep(newUserPage)).toContainText(/click any radar/i);

    // Click the first radar in sidebar to continue tour
    await newUserPage.locator('[data-tour="sidebar-radars"] a').first().click();
    await newUserPage.waitForURL(/\/radar\//);

    // Step 5: Radar intro
    await expect(visibleStep(newUserPage)).toContainText(/use radars to collect/i);
    await newUserPage.getByRole('button', { name: 'Next' }).click();

    // Step 6: Radar icon
    await expect(visibleStep(newUserPage)).toContainText(/radar icon/i);
    await newUserPage.getByRole('button', { name: 'Next' }).click();

    // Step 7: Click repo card - need to click to continue
    await expect(visibleStep(newUserPage)).toContainText(/click on the repo card/i);

    // Click the first repo card to continue tour
    await newUserPage.locator('[data-tour="repo-card"]').first().click();
    await newUserPage.waitForURL(/\/repo\//);

    // Step 8: Repo header
    await expect(visibleStep(newUserPage)).toContainText(/repository page/i);
    await newUserPage.getByRole('button', { name: 'Next' }).click();

    // Step 9: Releases - final step
    await expect(visibleStep(newUserPage)).toContainText(/release/i);
    await newUserPage.getByRole('button', { name: 'Finish' }).click();

    // Tour should be dismissed
    await expect(visibleStep(newUserPage)).not.toBeVisible();
  });

  test('does not show tour after completion', async ({ newUserPage }) => {
    await newUserPage.goto('/stars');

    // Complete the tour quickly by pressing Escape to cancel
    await expect(visibleStep(newUserPage)).toBeVisible();
    await newUserPage.keyboard.press('Escape');
    await expect(visibleStep(newUserPage)).not.toBeVisible();

    // Refresh the page
    await newUserPage.reload();

    // Tour should not appear again
    await expect(visibleStep(newUserPage)).not.toBeVisible();
  });

  test('can cancel tour with Escape key', async ({ newUserPage }) => {
    await newUserPage.goto('/stars');

    await expect(visibleStep(newUserPage)).toBeVisible();
    await newUserPage.keyboard.press('Escape');
    await expect(visibleStep(newUserPage)).not.toBeVisible();
  });

  test('can cancel tour with X button', async ({ newUserPage }) => {
    await newUserPage.goto('/stars');

    await expect(visibleStep(newUserPage)).toBeVisible();
    await newUserPage.locator('.shepherd-cancel-icon:visible').click();
    await expect(visibleStep(newUserPage)).not.toBeVisible();
  });

  test('can navigate back during tour', async ({ newUserPage }) => {
    await newUserPage.goto('/stars');

    // Navigate forward
    await newUserPage.getByRole('button', { name: 'Next' }).click();
    await expect(visibleStep(newUserPage)).toContainText(/help menu/i);

    // Navigate back
    await newUserPage.getByRole('button', { name: 'Back' }).click();
    await expect(visibleStep(newUserPage)).toContainText(/welcome to repo radar/i);
  });

  test('does not show tour for returning users', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/stars');

    // Tour should not appear for users who have completed it
    await expect(visibleStep(authenticatedPage)).not.toBeVisible();
  });
});
