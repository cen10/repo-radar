import { test, expect } from './fixtures';

test.describe('Starred Repositories', () => {
  test('displays starred repositories list', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/stars');
    await expect(authenticatedPage).toHaveURL('/stars');

    // Wait for either repos to load or empty state
    await expect(
      authenticatedPage
        .locator('[data-testid="repo-card"]')
        .first()
        .or(authenticatedPage.getByText(/no starred repositories/i))
    ).toBeVisible({ timeout: 10000 });
  });

  test('can search starred repositories', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/stars');

    const searchInput = authenticatedPage.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();

    await searchInput.fill('test');
    // Search should filter results
    await authenticatedPage.waitForTimeout(500);
  });
});
