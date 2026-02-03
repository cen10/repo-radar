import { test as base, type Page, type Route } from '@playwright/test';

const GITHUB_TOKEN_KEY = 'github_access_token';

// In-memory mock storage for radars during E2E tests
interface MockRadar {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  radar_repos: { count: number }[];
}

interface MockRadarRepo {
  id: string;
  radar_id: string;
  github_repo_id: number;
  added_at: string;
}

const mockRadars: Map<string, MockRadar> = new Map();
const mockRadarRepos: Map<string, MockRadarRepo> = new Map();

const mockSupabaseUser = {
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

async function setupAuthState(page: Page, githubToken: string) {
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
 * Sets up mock Supabase API routes for E2E testing.
 * This intercepts calls to Supabase and returns mock responses.
 */
async function setupSupabaseMocks(page: Page) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  if (!supabaseUrl) return;

  // Clear mock storage at start of each test
  mockRadars.clear();
  mockRadarRepos.clear();

  // Mock Supabase auth/user endpoint
  await page.route(`${supabaseUrl}/auth/v1/user`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockSupabaseUser),
    });
  });

  // Mock Supabase radars endpoint
  await page.route(`${supabaseUrl}/rest/v1/radars*`, async (route: Route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());

    if (method === 'HEAD') {
      // HEAD request for counting radars (used by count check)
      const radars = Array.from(mockRadars.values());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'content-range': `0-${radars.length}/${radars.length}`,
        },
        body: '',
      });
    } else if (method === 'GET') {
      // Return list of radars with repo counts
      const radars = Array.from(mockRadars.values());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'content-range': `0-${radars.length}/${radars.length}`,
        },
        body: JSON.stringify(radars),
      });
    } else if (method === 'POST') {
      // Create a new radar
      const body = request.postDataJSON();
      const newRadar: MockRadar = {
        id: `mock-radar-${Date.now()}`,
        user_id: mockSupabaseUser.id,
        name: body.name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        radar_repos: [{ count: 0 }],
      };
      mockRadars.set(newRadar.id, newRadar);

      // If Prefer header includes return=representation, return the created object
      // For .select().single(), response should be a single object
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newRadar),
      });
    } else if (method === 'DELETE') {
      // Delete a radar
      const idMatch = url.searchParams.get('id');
      if (idMatch) {
        const id = idMatch.replace('eq.', '');
        mockRadars.delete(id);
      }
      await route.fulfill({
        status: 204,
        contentType: 'application/json',
        body: '',
      });
    } else {
      await route.continue();
    }
  });

  // Mock radar_repos endpoint
  await page.route(`${supabaseUrl}/rest/v1/radar_repos*`, async (route: Route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());

    if (method === 'GET') {
      // Filter by radar_id if specified
      const radarIdParam = url.searchParams.get('radar_id');
      let repos = Array.from(mockRadarRepos.values());
      if (radarIdParam) {
        const radarId = radarIdParam.replace('eq.', '');
        repos = repos.filter((r) => r.radar_id === radarId);
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(repos),
      });
    } else if (method === 'POST') {
      // Add repo to radar
      const body = request.postDataJSON();
      const newRepoEntry: MockRadarRepo = {
        id: `mock-radar-repo-${Date.now()}`,
        radar_id: body.radar_id,
        github_repo_id: body.github_repo_id,
        added_at: new Date().toISOString(),
      };
      mockRadarRepos.set(newRepoEntry.id, newRepoEntry);

      // Update radar repo count
      const radar = mockRadars.get(body.radar_id);
      if (radar) {
        radar.radar_repos = [{ count: radar.radar_repos[0].count + 1 }];
      }

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newRepoEntry),
      });
    } else if (method === 'DELETE') {
      // Remove repo from radar
      const radarIdParam = url.searchParams.get('radar_id');
      const repoIdParam = url.searchParams.get('github_repo_id');
      if (radarIdParam && repoIdParam) {
        const radarId = radarIdParam.replace('eq.', '');
        const repoId = parseInt(repoIdParam.replace('eq.', ''), 10);

        // Find and remove the entry
        for (const [key, entry] of mockRadarRepos.entries()) {
          if (entry.radar_id === radarId && entry.github_repo_id === repoId) {
            mockRadarRepos.delete(key);

            // Update radar repo count
            const radar = mockRadars.get(radarId);
            if (radar && radar.radar_repos[0].count > 0) {
              radar.radar_repos = [{ count: radar.radar_repos[0].count - 1 }];
            }
            break;
          }
        }
      }
      await route.fulfill({
        status: 204,
        contentType: 'application/json',
        body: '',
      });
    } else {
      await route.continue();
    }
  });
}

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use, testInfo) => {
    const githubToken = process.env.VITE_TEST_GITHUB_TOKEN;
    if (!githubToken) {
      testInfo.skip(true, 'VITE_TEST_GITHUB_TOKEN not set - skipping authenticated test');
      return;
    }
    await setupAuthState(page, githubToken);
    await setupSupabaseMocks(page);
    await use(page);
  },
});
