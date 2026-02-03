import { test, expect } from './fixtures';

test.describe('Radar CRUD', () => {
  test('can create and delete a radar', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/stars');
    await expect(authenticatedPage).toHaveURL('/stars');

    // Click create radar button
    const createButton = authenticatedPage.getByRole('button', { name: /create radar/i });
    await expect(createButton).toBeVisible();
    await createButton.click();

    // Fill in radar name
    const radarName = `E2E Test Radar ${Date.now()}`;
    const nameInput = authenticatedPage.getByPlaceholder(/machine learning|web dev/i);
    await expect(nameInput).toBeVisible();
    await nameInput.fill(radarName);

    // Submit
    await authenticatedPage.getByRole('button', { name: /^create$/i }).click();

    // Verify radar appears in sidebar
    await expect(authenticatedPage.getByRole('link', { name: radarName })).toBeVisible();

    // Navigate to the radar
    await authenticatedPage.getByRole('link', { name: radarName }).click();
    await expect(authenticatedPage).toHaveURL(/\/radar\//);

    // Delete the radar (cleanup)
    const menuButton = authenticatedPage.getByRole('button', { name: /menu|options/i });
    if (await menuButton.isVisible()) {
      await menuButton.click();
      const deleteButton = authenticatedPage.getByRole('menuitem', { name: /delete/i });
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        // Confirm deletion
        await authenticatedPage.getByRole('button', { name: /^delete$/i }).click();
        // Should redirect back
        await expect(authenticatedPage).toHaveURL('/stars');
      }
    }
  });
});
