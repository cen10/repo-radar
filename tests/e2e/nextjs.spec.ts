import { test, expect } from '@playwright/test';

/**
 * E2E tests for the Next.js app (port 3000).
 * These tests verify the Next.js migration works correctly.
 * Run with: npx playwright test --project=nextjs
 *
 * NOTE: Authenticated tests are not currently implemented because:
 * - Next.js middleware runs server-side and validates sessions via supabase.auth.getUser()
 * - This makes real API calls to Supabase that can't be intercepted by Playwright
 * - The Vite app tests + ESLint rules (no-restricted-imports for react-router-dom)
 *   provide the primary safety net for router abstraction bugs
 *
 * To add authenticated tests, options include:
 * 1. MSW with Node.js server support for mocking server-side API calls
 * 2. Real test user credentials (security considerations)
 * 3. Test bypass mechanism in middleware (changes production code)
 */
test.describe('Next.js App', () => {
  test.describe('unauthenticated', () => {
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

  // TODO: Add authenticated tests when server-side API mocking is implemented
  // See note at top of file for implementation options
});
