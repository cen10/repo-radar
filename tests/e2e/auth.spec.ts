import { test, expect } from './fixtures';

test.describe('Authentication', () => {
  test('unauthenticated user sees home page', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /repo radar/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in with github/i })).toBeVisible();
    await expect(page.getByText(/organize and explore/i)).toBeVisible();
    await expect(page.getByText(/repository stats/i)).toBeVisible();
    await expect(page.getByText(/release updates/i)).toBeVisible();
    await expect(page.getByText(/custom radars/i)).toBeVisible();
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
    await expect(starsPage.heading).toBeVisible();
  });

  test('authenticated user is redirected from home to stars', async ({ returningUserPage }) => {
    await returningUserPage.goto('/');
    await expect(returningUserPage).toHaveURL('/stars');
  });
});
