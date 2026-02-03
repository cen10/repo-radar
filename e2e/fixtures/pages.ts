import { test as base, type Page } from '@playwright/test';
import { setupAuthState, setupAuthMocks, mockSupabaseUser } from './auth';
import { setupSupabaseMocks } from './supabase';
import { StarsPage } from '../pages/stars.page';
import { RadarsPage } from '../pages/radars.page';

export const test = base.extend<{
  authenticatedPage: Page;
  starsPage: StarsPage;
  radarsPage: RadarsPage;
}>({
  authenticatedPage: async ({ page }, use, testInfo) => {
    const githubToken = process.env.VITE_TEST_GITHUB_TOKEN;
    if (!githubToken) {
      testInfo.skip(true, 'VITE_TEST_GITHUB_TOKEN not set - skipping authenticated test');
      return;
    }
    await setupAuthState(page, githubToken);
    await setupAuthMocks(page);
    await setupSupabaseMocks(page, mockSupabaseUser.id);
    await use(page);
  },

  starsPage: async ({ authenticatedPage }, use) => {
    await use(new StarsPage(authenticatedPage));
  },

  radarsPage: async ({ authenticatedPage }, use) => {
    await use(new RadarsPage(authenticatedPage));
  },
});
