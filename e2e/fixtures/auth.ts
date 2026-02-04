import { type Page, type Route } from '@playwright/test';

const GITHUB_TOKEN_KEY = 'github_access_token';

export const mockSupabaseUser = {
  id: 'e2e-test-user-id',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'e2e-test@example.com',
  email_confirmed_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  user_metadata: {
    user_name: 'e2e-test-user',
    full_name: 'E2E Test User',
    avatar_url: 'https://avatars.githubusercontent.com/u/0',
  },
  app_metadata: {
    provider: 'github',
  },
};

function createMockSession(githubToken: string) {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: 'mock-supabase-access-token',
    refresh_token: 'mock-supabase-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    provider_token: githubToken,
    provider_refresh_token: null,
    user: mockSupabaseUser,
  };
}

function getSupabaseStorageKey(): string {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  try {
    const url = new URL(supabaseUrl);
    const projectRef = url.hostname.split('.')[0];
    return `sb-${projectRef}-auth-token`;
  } catch {
    return 'sb-localhost-auth-token';
  }
}

/**
 * Sets up authenticated state in browser localStorage.
 * Injects a mock Supabase session and GitHub token.
 */
export async function setupAuthState(page: Page, githubToken: string) {
  const session = createMockSession(githubToken);
  const storageKey = getSupabaseStorageKey();

  await page.addInitScript(
    ({ storageKey, session, githubToken, tokenKey }) => {
      localStorage.setItem(storageKey, JSON.stringify(session));
      localStorage.setItem(tokenKey, githubToken);
    },
    { storageKey, session, githubToken, tokenKey: GITHUB_TOKEN_KEY }
  );
}

/**
 * Sets up mock for Supabase auth/user endpoint.
 */
export async function setupAuthMocks(page: Page) {
  const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  if (!supabaseUrl) return;

  await page.route(`${supabaseUrl}/auth/v1/user`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockSupabaseUser),
    });
  });
}
