import { test, expect } from './fixtures';

test.describe('Authentication', () => {
  test('authenticated user can access stars page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/stars');
    await expect(authenticatedPage).toHaveURL('/stars');
    await expect(authenticatedPage.getByRole('heading', { name: /starred/i })).toBeVisible();
  });

  test('authenticated user is redirected from home to stars', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    await expect(authenticatedPage).toHaveURL('/stars');
  });
});
