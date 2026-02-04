import { test as base, type Page } from '@playwright/test';
import { setupAuthState, setupAuthMocks, mockSupabaseUser } from './auth';
import { setupSupabaseMocks } from './supabase';
import { setupGitHubMocks, createDefaultGitHubMockStore, type GitHubMockStore } from './github';
import { StarsPage } from '../pages/stars.page';
import { RadarsPage } from '../pages/radars.page';

/**
 * Mock token for E2E tests - no real API calls are made.
 * All GitHub API requests are intercepted by setupGitHubMocks.
 */
const MOCK_GITHUB_TOKEN = 'mock-github-token-for-e2e-tests';

export const test = base.extend<{
  authenticatedPage: Page;
  starsPage: StarsPage;
  radarsPage: RadarsPage;
  githubMockStore: GitHubMockStore;
}>({
  // GitHub mock store - initialized first so tests can customize before page setup
  githubMockStore: async (_fixtures, use) => {
    const store = createDefaultGitHubMockStore();
    await use(store);
  },

  // Authenticated page with all mocks set up
  authenticatedPage: async ({ page, githubMockStore }, use) => {
    await setupAuthState(page, MOCK_GITHUB_TOKEN);
    await setupAuthMocks(page);
    await setupSupabaseMocks(page, mockSupabaseUser.id);
    await setupGitHubMocks(page, githubMockStore);
    await use(page);
  },

  starsPage: async ({ authenticatedPage }, use) => {
    await use(new StarsPage(authenticatedPage));
  },

  radarsPage: async ({ authenticatedPage }, use) => {
    await use(new RadarsPage(authenticatedPage));
  },
});
