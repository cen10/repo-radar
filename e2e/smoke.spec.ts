import { test, expect } from './fixtures';

test.describe('Smoke Tests', () => {
  test('home page loads and displays correctly', async ({ homePage }) => {
    await homePage.goto();
    await homePage.expectToBeOnHomePage();

    await expect(homePage.page.getByText(/track momentum and activity/i)).toBeVisible();
    await expect(homePage.page.getByText(/track growth/i)).toBeVisible();
    await expect(homePage.page.getByText(/release updates/i)).toBeVisible();
    await expect(homePage.page.getByText(/activity alerts/i)).toBeVisible();
  });

  test('unauthenticated user is redirected to home from protected routes', async ({
    starsPage,
    homePage,
  }) => {
    await starsPage.goto();
    await expect(starsPage.page).toHaveURL('/');
    await homePage.expectToBeOnHomePage();
  });
});
