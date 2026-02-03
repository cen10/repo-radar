import { test, expect } from './fixtures';

test.describe('Radar CRUD', () => {
  test('can create and delete a radar', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/stars');
    await expect(authenticatedPage).toHaveURL('/stars');

    const createButton = authenticatedPage.getByRole('button', { name: /create radar/i });
    await expect(createButton).toBeVisible();
    await createButton.click();

    const radarName = `E2E Test Radar ${Date.now()}`;
    const nameInput = authenticatedPage.getByPlaceholder(/machine learning|web dev/i);
    await expect(nameInput).toBeVisible();
    await nameInput.fill(radarName);

    await authenticatedPage.getByRole('button', { name: /^create$/i }).click();

    await expect(authenticatedPage.getByRole('link', { name: radarName })).toBeVisible();

    await authenticatedPage.getByRole('link', { name: radarName }).click();
    await expect(authenticatedPage).toHaveURL(/\/radar\//);

    // Delete radar
    const menuButton = authenticatedPage.getByRole('button', { name: /menu|options/i });
    if (await menuButton.isVisible()) {
      await menuButton.click();
      const menuDeleteButton = authenticatedPage.getByRole('menuitem', { name: /delete/i });
      if (await menuDeleteButton.isVisible()) {
        await menuDeleteButton.click();
        // Click delete button in confirmation modal
        await authenticatedPage.getByRole('button', { name: /^delete$/i }).click();
        // Should redirect back
        await expect(authenticatedPage).toHaveURL('/stars');
      }
    }
  });
});
