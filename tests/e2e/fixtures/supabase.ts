import { type Page, type Route } from '@playwright/test';

// In-memory mock storage for Supabase data during E2E tests
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

/**
 * Sets up mock Supabase API routes for E2E testing.
 * Intercepts calls to Supabase REST API and returns mock responses.
 */
export async function setupSupabaseMocks(page: Page, mockUserId: string) {
  const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  if (!supabaseUrl) return;

  // Per-test mock storage (local to avoid parallel test interference)
  const mockRadars = new Map<string, MockRadar>();
  const mockRadarRepos = new Map<string, MockRadarRepo>();

  // Mock Supabase radars endpoint
  await page.route(`${supabaseUrl}/rest/v1/radars*`, async (route: Route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());

    if (method === 'HEAD') {
      // HEAD request for counting radars (used by count check)
      const radars = Array.from(mockRadars.values());
      const total = radars.length;
      const rangeEnd = total > 0 ? total - 1 : 0;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'content-range': `0-${rangeEnd}/${total}`,
        },
        body: '',
      });
    } else if (method === 'GET') {
      const idParam = url.searchParams.get('id');
      const acceptHeader = request.headers()['accept'] || '';
      const isSingleQuery = acceptHeader.includes('application/vnd.pgrst.object+json');

      if (idParam && isSingleQuery) {
        // Single radar query by ID (e.g., getRadar)
        const radarId = idParam.replace('eq.', '');
        const radar = mockRadars.get(radarId);

        if (radar) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(radar),
          });
        } else {
          // Return PostgREST "no rows" error for .single() query
          await route.fulfill({
            status: 406,
            contentType: 'application/json',
            body: JSON.stringify({
              code: 'PGRST116',
              message: 'The result contains 0 rows',
            }),
          });
        }
      } else {
        // Return list of radars with repo counts
        const radars = Array.from(mockRadars.values());
        const total = radars.length;
        const rangeEnd = total > 0 ? total - 1 : 0;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'content-range': `0-${rangeEnd}/${total}`,
          },
          body: JSON.stringify(radars),
        });
      }
    } else if (method === 'POST') {
      // Create a new radar
      const body = request.postDataJSON();
      const newRadar: MockRadar = {
        id: `mock-radar-${Date.now()}`,
        user_id: mockUserId,
        name: body.name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        radar_repos: [{ count: 0 }],
      };
      mockRadars.set(newRadar.id, newRadar);

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
      await route.fulfill({
        status: 501,
        contentType: 'application/json',
        body: JSON.stringify({
          error: `Method ${method} not mocked for radars endpoint`,
          hint: 'Add mock support in e2e/fixtures/supabase.ts',
        }),
      });
    }
  });

  // Mock radar_repos endpoint
  await page.route(`${supabaseUrl}/rest/v1/radar_repos*`, async (route: Route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());

    if (method === 'HEAD') {
      // HEAD request for counting repos (used by addRepoToRadar limit check)
      const radarIdParam = url.searchParams.get('radar_id');
      let repos = Array.from(mockRadarRepos.values());
      if (radarIdParam) {
        const radarId = radarIdParam.replace('eq.', '');
        repos = repos.filter((r) => r.radar_id === radarId);
      }
      const total = repos.length;
      const rangeEnd = total > 0 ? total - 1 : 0;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'content-range': `0-${rangeEnd}/${total}`,
        },
        body: '',
      });
    } else if (method === 'GET') {
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
      await route.fulfill({
        status: 501,
        contentType: 'application/json',
        body: JSON.stringify({
          error: `Method ${method} not mocked for radar_repos endpoint`,
          hint: 'Add mock support in e2e/fixtures/supabase.ts',
        }),
      });
    }
  });
}
