/**
 * MSW handlers for demo mode.
 * Intercepts GitHub and Supabase API calls, returning mock data.
 */

// Force full page reload on HMR to avoid MSW getting out of sync with React state.
// This is also in browser.ts - both are needed since HMR guards are per-file.
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    window.location.reload();
  });
}

import { http, HttpResponse } from 'msw';
import {
  DEMO_USER,
  DEMO_STARRED_REPOS,
  DEMO_RADARS,
  DEMO_RADAR_REPOS,
  getDemoSearchResults,
  getAllDemoRepos,
} from './demo-data';
import type { RadarWithCount, RadarRepo } from '../types/database';

const GITHUB_API_BASE = 'https://api.github.com';

// In-memory state for radar mutations (resets on page refresh)
let demoRadars: RadarWithCount[] = [...DEMO_RADARS];
let demoRadarRepos: RadarRepo[] = [...DEMO_RADAR_REPOS];
// Counter for generating deterministic IDs within a session
let idCounter = 1000;

/**
 * Reset demo state to initial values.
 * Called when entering demo mode.
 */
export function resetDemoState() {
  demoRadars = [...DEMO_RADARS];
  demoRadarRepos = [...DEMO_RADAR_REPOS];
  idCounter = 1000;
}

// Helper to get radar repo count
function getRadarRepoCount(radarId: string): number {
  return demoRadarRepos.filter((rr) => rr.radar_id === radarId).length;
}

// Helper to update radar repo_count
function updateRadarRepoCount(radarId: string) {
  const radar = demoRadars.find((r) => r.id === radarId);
  if (radar) {
    radar.repo_count = getRadarRepoCount(radarId);
  }
}

// ============================================================================
// GitHub API Handlers
// ============================================================================

const githubHandlers = [
  // GET /user - authenticated user
  http.get(`${GITHUB_API_BASE}/user`, () => {
    return HttpResponse.json({
      id: 0,
      login: DEMO_USER.login,
      name: DEMO_USER.name,
      avatar_url: DEMO_USER.avatar_url,
      email: DEMO_USER.email,
    });
  }),

  // HEAD /user/starred - get starred count via Link header
  http.head(`${GITHUB_API_BASE}/user/starred`, () => {
    const totalStarred = DEMO_STARRED_REPOS.length;
    // Link header format for last page
    const linkHeader = `<https://api.github.com/user/starred?per_page=1&page=${totalStarred}>; rel="last"`;

    return new HttpResponse(null, {
      status: 200,
      headers: {
        Link: linkHeader,
        'X-RateLimit-Remaining': '4999',
        'X-RateLimit-Limit': '5000',
      },
    });
  }),

  // GET /user/starred - list starred repos
  http.get(`${GITHUB_API_BASE}/user/starred`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const perPage = parseInt(url.searchParams.get('per_page') || '30', 10);
    const sort = url.searchParams.get('sort') || 'updated';
    const direction = url.searchParams.get('direction') || 'desc';

    // Sort repos based on parameters
    const sortedRepos = [...DEMO_STARRED_REPOS].sort((a, b) => {
      // 'created' sorts by when user starred it, 'updated' by repo's last update
      const dateA = sort === 'created' ? a.starred_at : a.updated_at;
      const dateB = sort === 'created' ? b.starred_at : b.updated_at;
      const comparison = new Date(dateB || 0).getTime() - new Date(dateA || 0).getTime();
      return direction === 'asc' ? -comparison : comparison;
    });

    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const pageRepos = sortedRepos.slice(startIndex, endIndex);

    // Check if client wants starred_at timestamps
    const acceptHeader = request.headers.get('Accept') || '';
    const wantsStarTimestamps = acceptHeader.includes('star+json');

    if (wantsStarTimestamps) {
      // Return with starred_at wrapper
      const response = pageRepos.map((repo) => ({
        starred_at: repo.starred_at,
        repo: {
          ...repo,
          starred_at: undefined, // Remove from inner object
        },
      }));
      return HttpResponse.json(response);
    }

    return HttpResponse.json(pageRepos);
  }),

  // GET /user/starred/:owner/:repo - check if repo is starred
  http.get(`${GITHUB_API_BASE}/user/starred/:owner/:repo`, ({ params }) => {
    const { owner, repo } = params;
    const fullName = `${owner}/${repo}`;
    const isStarred = DEMO_STARRED_REPOS.some((r) => r.full_name === fullName);

    if (isStarred) {
      return new HttpResponse(null, { status: 204 });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // GET /search/repositories - search repos
  http.get(`${GITHUB_API_BASE}/search/repositories`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const sort = url.searchParams.get('sort'); // null = best-match (relevance)
    const order = url.searchParams.get('order') || 'desc';

    let results = getDemoSearchResults(query);

    // Sort results based on parameters (GitHub search API sorting)
    if (sort && results.length > 0) {
      results = [...results].sort((a, b) => {
        let comparison = 0;
        switch (sort) {
          case 'stars':
            comparison = b.stargazers_count - a.stargazers_count;
            break;
          case 'forks':
            comparison = b.forks_count - a.forks_count;
            break;
          case 'updated':
            comparison =
              new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
            break;
          default:
            // 'help-wanted-issues' or unknown - keep original order
            break;
        }
        return order === 'asc' ? -comparison : comparison;
      });
    }
    // No sort param = best-match (GitHub's relevance ranking) - keep original order

    return HttpResponse.json({
      total_count: results.length,
      incomplete_results: false,
      items: results,
    });
  }),

  // GET /repositories/:id - get repo by ID
  // Search both starred repos and additional search repos
  http.get(`${GITHUB_API_BASE}/repositories/:id`, ({ params }) => {
    const repoId = parseInt(params.id as string, 10);
    const allRepos = getAllDemoRepos();
    const repo = allRepos.find((r) => r.id === repoId);

    if (repo) {
      return HttpResponse.json({
        ...repo,
        subscribers_count: repo.watchers_count || 0,
      });
    }

    return new HttpResponse(null, { status: 404 });
  }),

  // GET /repos/:owner/:repo/releases - get releases
  // Generate varied but deterministic releases based on repo name
  http.get(`${GITHUB_API_BASE}/repos/:owner/:repo/releases`, ({ params }) => {
    const { owner, repo } = params;
    const fullName = `${owner}/${repo}`;
    const now = new Date();

    // Simple hash to generate deterministic but varied data per repo
    const hash = fullName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    // Some repos have fewer releases, some have more
    const releaseCount = (hash % 3) + 1; // 1-3 releases
    const majorVersion = (hash % 5) + 1; // v1-v5
    const daysAgoLatest = (hash % 14) + 1; // 1-14 days ago

    const releaseDescriptions = [
      'Major release with new features and performance improvements.',
      'Bug fixes and stability improvements.',
      'New API features and documentation updates.',
      'Security patches and dependency updates.',
      'Performance optimizations and UI improvements.',
    ];

    const mockReleases = Array.from({ length: releaseCount }, (_, i) => {
      const version = `${majorVersion}.${Math.max(0, 9 - i)}.${i}`;
      const daysAgo = daysAgoLatest + i * 21; // Each older release ~3 weeks apart
      const releaseDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      return {
        id: hash * 100 + i + 1,
        tag_name: `v${version}`,
        name: `Version ${version}`,
        body: releaseDescriptions[(hash + i) % releaseDescriptions.length],
        html_url: `https://github.com/${fullName}/releases/tag/v${version}`,
        published_at: releaseDate.toISOString(),
        created_at: releaseDate.toISOString(),
        prerelease: false,
        draft: false,
        author: {
          login: owner as string,
          avatar_url: `https://avatars.githubusercontent.com/u/${hash % 1000}?v=4`,
        },
      };
    });

    return HttpResponse.json(mockReleases);
  }),

  // GET /rate_limit - rate limit status
  http.get(`${GITHUB_API_BASE}/rate_limit`, () => {
    const now = Math.floor(Date.now() / 1000);
    const resetTime = now + 3600; // Reset in 1 hour

    return HttpResponse.json({
      rate: {
        limit: 5000,
        remaining: 4999,
        reset: resetTime,
        used: 1,
      },
      resources: {
        core: {
          limit: 5000,
          remaining: 4999,
          reset: resetTime,
          used: 1,
        },
        search: {
          limit: 30,
          remaining: 30,
          reset: resetTime,
          used: 0,
        },
      },
    });
  }),
];

// ============================================================================
// Supabase API Handlers
// ============================================================================

// Get Supabase URL from env
function getSupabaseUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  return url.replace(/\/+$/, '');
}

const supabaseHandlers = [
  // GET /rest/v1/radars - list radars with repo counts
  http.get(`${getSupabaseUrl()}/rest/v1/radars`, ({ request }) => {
    const url = new URL(request.url);
    const idParam = url.searchParams.get('id');
    const acceptHeader = request.headers.get('Accept') || '';
    const isSingleQuery = acceptHeader.includes('application/vnd.pgrst.object+json');

    if (idParam && isSingleQuery) {
      // Single radar query
      const radarId = idParam.replace('eq.', '');
      const radar = demoRadars.find((r) => r.id === radarId);

      if (radar) {
        return HttpResponse.json(radar);
      }
      return HttpResponse.json(
        { code: 'PGRST116', message: 'The result contains 0 rows' },
        { status: 406 }
      );
    }

    // List all radars with repo counts
    const radarsWithCounts = demoRadars.map((radar) => ({
      ...radar,
      radar_repos: [{ count: getRadarRepoCount(radar.id) }],
    }));

    return HttpResponse.json(radarsWithCounts);
  }),

  // POST /rest/v1/radars - create radar
  http.post(`${getSupabaseUrl()}/rest/v1/radars`, async ({ request }) => {
    const body = (await request.json()) as { name: string };
    const newRadar: RadarWithCount = {
      id: `demo-radar-${idCounter++}`,
      user_id: DEMO_USER.id,
      name: body.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      repo_count: 0,
    };

    demoRadars.push(newRadar);

    return HttpResponse.json(newRadar, { status: 201 });
  }),

  // PATCH /rest/v1/radars - update radar
  // PostgREST returns an array of updated rows
  http.patch(`${getSupabaseUrl()}/rest/v1/radars`, async ({ request }) => {
    const url = new URL(request.url);
    const idParam = url.searchParams.get('id');
    const body = (await request.json()) as { name?: string };

    if (idParam) {
      const radarId = idParam.replace('eq.', '');
      const radar = demoRadars.find((r) => r.id === radarId);

      if (radar && body.name) {
        radar.name = body.name;
        radar.updated_at = new Date().toISOString();
        return HttpResponse.json([radar]);
      }
    }

    return HttpResponse.json(
      { code: 'PGRST116', message: 'The result contains 0 rows' },
      { status: 406 }
    );
  }),

  // DELETE /rest/v1/radars - delete radar
  http.delete(`${getSupabaseUrl()}/rest/v1/radars`, ({ request }) => {
    const url = new URL(request.url);
    const idParam = url.searchParams.get('id');

    if (idParam) {
      const radarId = idParam.replace('eq.', '');
      demoRadars = demoRadars.filter((r) => r.id !== radarId);
      demoRadarRepos = demoRadarRepos.filter((rr) => rr.radar_id !== radarId);
    }

    return new HttpResponse(null, { status: 204 });
  }),

  // GET /rest/v1/radar_repos - list radar repos
  http.get(`${getSupabaseUrl()}/rest/v1/radar_repos`, ({ request }) => {
    const url = new URL(request.url);
    const radarIdParam = url.searchParams.get('radar_id');
    const repoIdParam = url.searchParams.get('github_repo_id');

    let repos = [...demoRadarRepos];

    if (radarIdParam) {
      // RadarPage: fetches all repos belonging to this radar
      const radarId = radarIdParam.replace('eq.', '');
      repos = repos.filter((rr) => rr.radar_id === radarId);
    } else if (repoIdParam) {
      // RadarIconButton: determines icon state and which radars to pre-check in sheet
      const repoId = parseInt(repoIdParam.replace('eq.', ''), 10);
      repos = repos.filter((rr) => rr.github_repo_id === repoId);
    }

    return HttpResponse.json(repos);
  }),

  // POST /rest/v1/radar_repos - add repo to radar
  http.post(`${getSupabaseUrl()}/rest/v1/radar_repos`, async ({ request }) => {
    const body = (await request.json()) as { radar_id: string; github_repo_id: number };

    // Check if already exists
    const exists = demoRadarRepos.some(
      (rr) => rr.radar_id === body.radar_id && rr.github_repo_id === body.github_repo_id
    );

    if (exists) {
      return HttpResponse.json(
        { code: '23505', message: 'duplicate key value violates unique constraint' },
        { status: 409 }
      );
    }

    const newEntry: RadarRepo = {
      id: `demo-rr-${idCounter++}`,
      radar_id: body.radar_id,
      github_repo_id: body.github_repo_id,
      added_at: new Date().toISOString(),
    };

    demoRadarRepos.push(newEntry);
    updateRadarRepoCount(body.radar_id);

    return HttpResponse.json(newEntry, { status: 201 });
  }),

  // DELETE /rest/v1/radar_repos - remove repo from radar
  http.delete(`${getSupabaseUrl()}/rest/v1/radar_repos`, ({ request }) => {
    const url = new URL(request.url);
    const radarIdParam = url.searchParams.get('radar_id');
    const repoIdParam = url.searchParams.get('github_repo_id');

    if (radarIdParam && repoIdParam) {
      const radarId = radarIdParam.replace('eq.', '');
      const repoId = parseInt(repoIdParam.replace('eq.', ''), 10);

      const initialLength = demoRadarRepos.length;
      demoRadarRepos = demoRadarRepos.filter(
        (rr) => !(rr.radar_id === radarId && rr.github_repo_id === repoId)
      );

      if (demoRadarRepos.length < initialLength) {
        updateRadarRepoCount(radarId);
      }
    }

    return new HttpResponse(null, { status: 204 });
  }),

  // HEAD requests for count checks
  http.head(`${getSupabaseUrl()}/rest/v1/radars`, () => {
    const total = demoRadars.length;
    // PostgREST format: "0-N/total" for results, "*/0" for empty
    const contentRange = total === 0 ? '*/0' : `0-${total - 1}/${total}`;
    return new HttpResponse(null, {
      status: 200,
      headers: {
        'content-range': contentRange,
      },
    });
  }),

  http.head(`${getSupabaseUrl()}/rest/v1/radar_repos`, ({ request }) => {
    const url = new URL(request.url);
    const radarIdParam = url.searchParams.get('radar_id');

    let repos = [...demoRadarRepos];
    if (radarIdParam) {
      const radarId = radarIdParam.replace('eq.', '');
      repos = repos.filter((rr) => rr.radar_id === radarId);
    }

    const total = repos.length;
    // PostgREST format: "0-N/total" for results, "*/0" for empty
    const contentRange = total === 0 ? '*/0' : `0-${total - 1}/${total}`;
    return new HttpResponse(null, {
      status: 200,
      headers: {
        'content-range': contentRange,
      },
    });
  }),

  // Mock auth endpoints (Supabase auth)
  http.get(`${getSupabaseUrl()}/auth/v1/user`, () => {
    return HttpResponse.json({
      id: DEMO_USER.id,
      email: DEMO_USER.email,
      user_metadata: {
        user_name: DEMO_USER.login,
        full_name: DEMO_USER.name,
        avatar_url: DEMO_USER.avatar_url,
      },
    });
  }),

  http.post(`${getSupabaseUrl()}/auth/v1/token`, () => {
    return HttpResponse.json({
      access_token: 'demo-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'demo-refresh-token',
      user: {
        id: DEMO_USER.id,
        email: DEMO_USER.email,
        user_metadata: {
          user_name: DEMO_USER.login,
          full_name: DEMO_USER.name,
          avatar_url: DEMO_USER.avatar_url,
        },
      },
    });
  }),
];

export const handlers = [...githubHandlers, ...supabaseHandlers];
