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

    // Step 2: My Stars heading
    await expect(visibleStep(firstTimeUserPage)).toContainText(/starred github repositories/i);
    await firstTimeUserPage.getByRole('button', { name: 'Next' }).click();

    // Step 3: Explore link
    await expect(visibleStep(firstTimeUserPage)).toContainText(/explore page/i);
    await firstTimeUserPage.getByRole('button', { name: 'Next' }).click();

    // Step 4: Sidebar radars - need to click a radar to continue
    await expect(visibleStep(firstTimeUserPage)).toContainText(/click.*to continue/i);

    await firstTimeUserPage.locator('[data-tour="sidebar-radars"]').click();
    await firstTimeUserPage.waitForURL(/\/radar\//);

    // Step 5: Radar intro
    await expect(visibleStep(firstTimeUserPage)).toContainText(/react ecosystem radar/i);
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

    // Step 9: Repo detail radar icon
    await expect(visibleStep(firstTimeUserPage)).toContainText(/add or remove.*radars/i);
    await firstTimeUserPage.getByRole('button', { name: 'Next' }).click();

    // Step 10: Releases
    await expect(visibleStep(firstTimeUserPage)).toContainText(/release/i);
    await firstTimeUserPage.getByRole('button', { name: 'Next' }).click();

    // Step 11: Help button - final step
    await expect(visibleStep(firstTimeUserPage)).toContainText(/help menu/i);
    await firstTimeUserPage.getByRole('button', { name: 'Finish' }).click();

    await expect(visibleStep(firstTimeUserPage)).not.toBeVisible();
  });

  test('does not show tour after completion', async ({ firstTimeUserPage }) => {
    await firstTimeUserPage.goto('/stars');

    // Complete the tour quickly by pressing Escape and confirming exit
    await expect(visibleStep(firstTimeUserPage)).toBeVisible();
    await firstTimeUserPage.keyboard.press('Escape');
    await firstTimeUserPage.getByRole('button', { name: /exit tour/i }).click();
    await expect(visibleStep(firstTimeUserPage)).not.toBeVisible();

    await firstTimeUserPage.reload();

    await expect(visibleStep(firstTimeUserPage)).not.toBeVisible();
  });

  test('can cancel tour with Escape key', async ({ firstTimeUserPage }) => {
    await firstTimeUserPage.goto('/stars');

    await expect(visibleStep(firstTimeUserPage)).toBeVisible();
    await firstTimeUserPage.keyboard.press('Escape');

    // Confirmation modal appears - wait for the Exit Tour button to be clickable
    const exitButton = firstTimeUserPage.getByRole('button', { name: /^exit tour$/i });
    await expect(exitButton).toBeVisible();

    await exitButton.click();
    await expect(visibleStep(firstTimeUserPage)).not.toBeVisible();
  });

  test('can cancel tour with X button', async ({ firstTimeUserPage }) => {
    await firstTimeUserPage.goto('/stars');

    await expect(visibleStep(firstTimeUserPage)).toBeVisible();
    await firstTimeUserPage.locator('.shepherd-cancel-icon:visible').click();

    // Confirmation modal appears - wait for the Exit Tour button to be clickable
    const exitButton = firstTimeUserPage.getByRole('button', { name: /^exit tour$/i });
    await expect(exitButton).toBeVisible();

    await exitButton.click();
    await expect(visibleStep(firstTimeUserPage)).not.toBeVisible();
  });

  test('can continue tour after clicking X button', async ({ firstTimeUserPage }) => {
    await firstTimeUserPage.goto('/stars');

    await expect(visibleStep(firstTimeUserPage)).toBeVisible();
    await firstTimeUserPage.locator('.shepherd-cancel-icon:visible').click();

    // Confirmation modal appears - wait for the Continue Tour button
    const continueButton = firstTimeUserPage.getByRole('button', { name: /continue tour/i });
    await expect(continueButton).toBeVisible();

    await continueButton.click();

    // Modal closes, tour continues
    await expect(continueButton).not.toBeVisible();
    await expect(visibleStep(firstTimeUserPage)).toBeVisible();
  });

  test('can navigate back during tour', async ({ firstTimeUserPage }) => {
    await firstTimeUserPage.goto('/stars');

    await firstTimeUserPage.getByRole('button', { name: 'Next' }).click();
    await expect(visibleStep(firstTimeUserPage)).toContainText(/starred github repositories/i);

    await firstTimeUserPage.getByRole('button', { name: 'Back' }).click();
    await expect(visibleStep(firstTimeUserPage)).toContainText(/welcome to repo radar/i);
  });

  test('does not show tour for returning users', async ({ returningUserPage }) => {
    await returningUserPage.goto('/stars');

    await expect(visibleStep(returningUserPage)).not.toBeVisible();
  });

  test.describe('Mobile viewport', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('does not auto-start tour on mobile', async ({ firstTimeUserPage }) => {
      await firstTimeUserPage.goto('/stars');

      // Tour tooltip should not appear on mobile viewport
      await expect(visibleStep(firstTimeUserPage)).not.toBeVisible();

      // Neither overlay should appear on mobile:
      // 1. Our fallback overlay (would persist if startTour() called without OnboardingTour mounted)
      // 2. Shepherd's modal overlay (would appear if tour somehow started)
      await expect(firstTimeUserPage.locator('.tour-fallback-overlay')).not.toBeVisible();
      await expect(
        firstTimeUserPage.locator('.shepherd-modal-overlay-container')
      ).not.toBeVisible();
    });

    // Note: Demo mode mobile overlay behavior is tested in unit tests
    // (tests/unit/contexts/onboarding-context.test.tsx) because E2E tests
    // can't properly activate demo mode (MSW doesn't start in Playwright).
  });
});
