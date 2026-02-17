import { test, expect } from './fixtures';

test.describe('Starred Repositories', () => {
  test('displays starred repositories list', async ({ starsPage }) => {
    await starsPage.goto();
    await expect(starsPage.page).toHaveURL('/stars');

    // Wait for either repos to load or empty state
    await expect(starsPage.repositoryCards.first().or(starsPage.emptyState)).toBeVisible({
      timeout: 10000,
    });
  });

  test('can search starred repositories', async ({ starsPage }) => {
    await starsPage.goto();

    // Search is always visible in the header
    await expect(starsPage.searchInput).toBeVisible();
    await starsPage.search('react');
  });
});
