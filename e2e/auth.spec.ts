import { test, expect } from './fixtures';

test.describe('Authentication', () => {
  test('unauthenticated user sees home page', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /repo radar/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in with github/i })).toBeVisible();
    await expect(page.getByText(/track momentum and activity/i)).toBeVisible();
    await expect(page.getByText(/track growth/i)).toBeVisible();
    await expect(page.getByText(/release updates/i)).toBeVisible();
    await expect(page.getByText(/activity alerts/i)).toBeVisible();
  });

  test('unauthenticated user is redirected to home from protected routes', async ({ page }) => {
    await page.goto('/stars');
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: /repo radar/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in with github/i })).toBeVisible();
  });

  test('authenticated user can access stars page', async ({ starsPage }) => {
    await starsPage.goto();
    await expect(starsPage.page).toHaveURL('/stars');
    await starsPage.expectToBeOnStarsPage();
  });

  test('authenticated user is redirected from home to stars', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    await expect(authenticatedPage).toHaveURL('/stars');
  });
});
