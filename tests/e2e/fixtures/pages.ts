import { test as base, type Page } from '@playwright/test';
import { setupAuthState, setupAuthMocks, mockSupabaseUser } from './auth';
import { setupSupabaseMocks } from './supabase';
import { setupGitHubMocks } from './github';
import { StarsPage } from '../pages/stars.page';
import { RadarsPage } from '../pages/radars.page';

/**
 * Mock token for E2E tests - no real API calls are made.
 * All GitHub API requests are intercepted by setupGitHubMocks.
 */
const MOCK_GITHUB_TOKEN = 'mock-github-token-for-e2e-tests';

export const test = base.extend<{
  authenticatedPage: Page;
  newUserPage: Page;
  starsPage: StarsPage;
  radarsPage: RadarsPage;
}>({
  // Authenticated page with all mocks set up (tour completed)
  authenticatedPage: async ({ page }, use) => {
    await setupAuthState(page, MOCK_GITHUB_TOKEN);
    await setupAuthMocks(page);
    await setupSupabaseMocks(page, mockSupabaseUser.id);
    await setupGitHubMocks(page);
    await use(page);
  },

  // Authenticated page for new users (tour NOT completed, with seeded data)
  newUserPage: async ({ page }, use) => {
    await setupAuthState(page, MOCK_GITHUB_TOKEN, { skipOnboardingCompletion: true });
    await setupAuthMocks(page);
    await setupSupabaseMocks(page, mockSupabaseUser.id, { seedDefaultRadar: true });
    await setupGitHubMocks(page);
    await use(page);
  },

  starsPage: async ({ authenticatedPage }, use) => {
    await use(new StarsPage(authenticatedPage));
  },

  radarsPage: async ({ authenticatedPage }, use) => {
    await use(new RadarsPage(authenticatedPage));
  },
});
