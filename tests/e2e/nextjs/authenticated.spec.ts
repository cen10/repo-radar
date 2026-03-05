import type { Page } from '@playwright/test';
import type { MswFixture } from 'next/experimental/testmode/playwright/msw.js';
import nextTestMode from 'next/experimental/testmode/playwright/msw.js';
import { allSupabaseHandlers } from './fixtures/msw-handlers';
import { setupAuthCookie } from './fixtures/auth-setup';

// Destructure from default export (CJS module doesn't support named ESM exports)
const { test, expect } = nextTestMode;

/**
 * E2E tests for the Next.js app - authenticated flows.
 * Uses MSW via Next.js testProxy to intercept server-side Supabase auth calls.
 */
test.describe('Next.js Authenticated Dashboard', () => {
  test.beforeEach(async ({ page, msw }: { page: Page; msw: MswFixture }) => {
    // Register MSW handlers for this test
    msw.use(...allSupabaseHandlers);
    await setupAuthCookie(page);
  });

  test('can view /stars page without redirect', async ({ page }: { page: Page }) => {
    await page.goto('/stars');

    await expect(page).toHaveURL('/stars');
    await expect(page.getByRole('navigation', { name: /main/i })).toBeVisible();
    // Use filter to avoid matching Shepherd tour header which also has banner role
    await expect(page.getByRole('banner').filter({ hasText: /repo radar/i })).toBeVisible();
  });

  test('can view /explore page without redirect', async ({ page }: { page: Page }) => {
    await page.goto('/explore');

    await expect(page).toHaveURL('/explore');
    await expect(page.getByRole('navigation', { name: /main/i })).toBeVisible();
  });

  test('sidebar navigation works', async ({ page }: { page: Page }) => {
    await page.goto('/stars');
    await expect(page.getByRole('navigation', { name: /main/i })).toBeVisible();

    await page.getByRole('link', { name: /explore/i }).click();
    await expect(page).toHaveURL('/explore');
  });
});
