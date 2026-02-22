import { test, expect } from '@playwright/test';

/**
 * E2E tests for the Next.js app (port 3000).
 * These tests verify the Next.js migration works correctly.
 * Run with: npx playwright test --project=nextjs
 */
test.describe('Next.js App', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
  });

  test('unauthenticated user is redirected from /stars to home', async ({ page }) => {
    await page.goto('/stars');
    await expect(page).toHaveURL('/');
  });

  test('unauthenticated user is redirected from /explore to home', async ({ page }) => {
    await page.goto('/explore');
    await expect(page).toHaveURL('/');
  });

  test('unauthenticated user is redirected from /radar/123 to home', async ({ page }) => {
    await page.goto('/radar/123');
    await expect(page).toHaveURL('/');
  });
});
