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

    // Search is collapsible - verify the "Open search" button is visible
    await expect(starsPage.openSearchButton).toBeVisible();
    await starsPage.search('react');

    // After searching, verify search input is now visible
    await expect(starsPage.searchInput).toBeVisible();
  });
});
