import { type Page, type Route } from '@playwright/test';

const GITHUB_TOKEN_KEY = 'github_access_token';
const ONBOARDING_KEY = 'repo-radar-onboarding';

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

export function createMockSession(githubToken: string) {
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

function getSupabaseProjectRef(): string {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  try {
    const url = new URL(supabaseUrl);
    return url.hostname.split('.')[0];
  } catch {
    return 'localhost';
  }
}

interface SetupAuthOptions {
  /** Skip marking onboarding tour as completed (for testing the tour itself) */
  skipOnboardingCompletion?: boolean;
}

/**
 * Sets up authenticated state using cookies (for @supabase/ssr client).
 * The SSR client reads auth from cookies, not localStorage.
 * Also sets localStorage for GitHub token and onboarding state.
 */
export async function setupAuthState(
  page: Page,
  githubToken: string,
  options: SetupAuthOptions = {}
) {
  const { skipOnboardingCompletion = false } = options;
  const session = createMockSession(githubToken);
  const projectRef = getSupabaseProjectRef();

  // Set auth cookies for @supabase/ssr client
  // The SSR client stores auth in cookies with names like:
  // sb-<project-ref>-auth-token.0, sb-<project-ref>-auth-token.1, etc.
  // For simplicity, we'll use a single cookie with the full session
  const cookieName = `sb-${projectRef}-auth-token`;
  const cookieValue = encodeURIComponent(JSON.stringify(session));

  await page.context().addCookies([
    {
      name: cookieName,
      value: cookieValue,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  // Also set localStorage for GitHub token and onboarding state
  await page.addInitScript(
    ({ githubToken, tokenKey, onboardingKey, skipOnboarding }) => {
      localStorage.setItem(tokenKey, githubToken);
      if (!skipOnboarding) {
        localStorage.setItem(onboardingKey, JSON.stringify({ hasCompletedTour: true }));
      }
    },
    {
      githubToken,
      tokenKey: GITHUB_TOKEN_KEY,
      onboardingKey: ONBOARDING_KEY,
      skipOnboarding: skipOnboardingCompletion,
    }
  );
}

/**
 * Sets up mocks for Supabase auth endpoints.
 */
export async function setupAuthMocks(page: Page, githubToken: string = 'mock-github-token') {
  const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  if (!supabaseUrl) return;

  // Mock /auth/v1/user endpoint
  await page.route(`${supabaseUrl}/auth/v1/user`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockSupabaseUser),
    });
  });

  // Mock /auth/v1/token endpoint (session refresh)
  await page.route(`${supabaseUrl}/auth/v1/token*`, async (route: Route) => {
    const session = createMockSession(githubToken);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session),
    });
  });
}
