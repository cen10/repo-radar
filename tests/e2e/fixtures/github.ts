import { type Page, type Route } from '@playwright/test';
import {
  createMockStarredReposList,
  type GitHubStarredRepoResponse,
} from '../../fixtures/github-mock-data';

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * In-memory store for GitHub mock data.
 */
export interface GitHubMockStore {
  /** Starred repositories (in starred order, most recent first) */
  starredRepos: GitHubStarredRepoResponse[];
}

/**
 * Create a default mock store with tour repo data.
 * Uses repos from src/demo/tour-data.ts for consistent E2E testing.
 */
export function createDefaultGitHubMockStore(): GitHubMockStore {
  return { starredRepos: createMockStarredReposList() };
}

/**
 * Build GitHub Link header for pagination.
 * GitHub uses RFC 5988 Link headers for pagination.
 */
function buildLinkHeader(
  totalItems: number,
  page: number,
  perPage: number,
  baseUrl: string
): string | null {
  const totalPages = Math.ceil(totalItems / perPage);
  if (totalPages <= 1) return null;

  const links: string[] = [];

  if (page < totalPages) {
    links.push(`<${baseUrl}&page=${page + 1}>; rel="next"`);
    links.push(`<${baseUrl}&page=${totalPages}>; rel="last"`);
  }
  if (page > 1) {
    links.push(`<${baseUrl}&page=${page - 1}>; rel="prev"`);
    links.push(`<${baseUrl}&page=1>; rel="first"`);
  }

  return links.length > 0 ? links.join(', ') : null;
}

/**
 * Sets up mock GitHub API routes for E2E testing.
 * Intercepts calls to api.github.com and returns mock responses.
 *
 * @param page - Playwright Page object
 * @param store - Mock data store (defaults to sample data)
 * @returns The mock store for test manipulation
 */
export async function setupGitHubMocks(
  page: Page,
  store: GitHubMockStore = createDefaultGitHubMockStore()
): Promise<GitHubMockStore> {
  // Mock /user/starred endpoints (list and check)
  await page.route(`${GITHUB_API_BASE}/user/starred*`, async (route: Route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const pathname = url.pathname;

    // Check if this is GET /user/starred/:owner/:repo (check if repo is starred)
    const isStarredCheck = pathname !== '/user/starred' && !pathname.endsWith('/user/starred');
    if (isStarredCheck && method === 'GET') {
      const parts = pathname.split('/').filter(Boolean); // ['user', 'starred', 'owner', 'repo']
      const owner = parts[2];
      const repo = parts[3];
      const isStarred = store.starredRepos.some(
        (sr) => sr.repo.owner.login === owner && sr.repo.name === repo
      );
      await route.fulfill({
        status: isStarred ? 204 : 404,
        headers: {
          'x-ratelimit-limit': '5000',
          'x-ratelimit-remaining': '4999',
          'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
        },
        body: '',
      });
      return;
    }

    // HEAD /user/starred - Used by fetchStarredRepoCount for efficiency
    if (method === 'HEAD') {
      const perPage = parseInt(url.searchParams.get('per_page') || '1', 10);
      const total = store.starredRepos.length;
      const totalPages = Math.ceil(total / perPage);

      const headers: Record<string, string> = {
        'x-ratelimit-limit': '5000',
        'x-ratelimit-remaining': '4999',
        'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
      };

      // Only include Link header if there are multiple pages
      if (totalPages > 1) {
        headers['link'] =
          `<${GITHUB_API_BASE}/user/starred?page=${totalPages}&per_page=${perPage}>; rel="last"`;
      }

      await route.fulfill({ status: 200, headers, body: '' });
      return;
    }

    // GET /user/starred - List starred repositories
    if (method === 'GET') {
      // Parse pagination params
      const pageNum = parseInt(url.searchParams.get('page') || '1', 10);
      const perPage = parseInt(url.searchParams.get('per_page') || '30', 10);

      // Calculate pagination
      const startIdx = (pageNum - 1) * perPage;
      const endIdx = startIdx + perPage;
      const pagedRepos = store.starredRepos.slice(startIdx, endIdx);
      const total = store.starredRepos.length;

      // Build Link header for pagination
      const baseUrl = `${GITHUB_API_BASE}/user/starred?per_page=${perPage}`;
      const linkHeader = buildLinkHeader(total, pageNum, perPage, baseUrl);

      const headers: Record<string, string> = {
        'x-ratelimit-limit': '5000',
        'x-ratelimit-remaining': '4999',
        'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
      };

      if (linkHeader) {
        headers['link'] = linkHeader;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers,
        body: JSON.stringify(pagedRepos),
      });
    } else {
      await route.continue();
    }
  });

  // Mock GET /repositories/:id - Get repository by numeric ID
  // Used by radar page to fetch repos that are in a radar
  await page.route(
    new RegExp(`${GITHUB_API_BASE.replace(/\./g, '\\.')}/repositories/\\d+$`),
    async (route: Route) => {
      const url = new URL(route.request().url());
      const pathParts = url.pathname.split('/');
      const repoId = parseInt(pathParts[pathParts.length - 1], 10);

      // Find repo by ID in starred repos
      const starredRepo = store.starredRepos.find((sr) => sr.repo.id === repoId);

      if (starredRepo) {
        // Return full-repository schema (includes subscribers_count for real watcher count)
        const fullRepo = {
          ...starredRepo.repo,
          subscribers_count: Math.floor(starredRepo.repo.stargazers_count * 0.1) + 5,
        };
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'x-ratelimit-limit': '5000',
            'x-ratelimit-remaining': '4999',
            'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
          },
          body: JSON.stringify(fullRepo),
        });
      } else {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Not Found' }),
        });
      }
    }
  );

  // Mock GET /search/issues - Used by useIssueCount for open issue counts
  await page.route(`${GITHUB_API_BASE}/search/issues*`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'x-ratelimit-limit': '30',
        'x-ratelimit-remaining': '29',
        'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
      },
      body: JSON.stringify({ total_count: 100, incomplete_results: false, items: [] }),
    });
  });

  // Mock GET /repos/:owner/:repo/releases - Get releases for a repository
  // Returns mock releases so the tour step target element renders
  await page.route(
    new RegExp(`${GITHUB_API_BASE.replace(/\./g, '\\.')}/repos/[^/]+/[^/]+/releases`),
    async (route: Route) => {
      const mockReleases = [
        {
          id: 1,
          tag_name: 'v1.0.0',
          name: 'Version 1.0.0',
          body: 'Initial release',
          html_url: 'https://github.com/mock/repo/releases/tag/v1.0.0',
          published_at: new Date().toISOString(),
          author: {
            login: 'mock-user',
            avatar_url: 'https://avatars.githubusercontent.com/u/12345?v=4',
          },
        },
      ];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'x-ratelimit-limit': '5000',
          'x-ratelimit-remaining': '4999',
          'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
        },
        body: JSON.stringify(mockReleases),
      });
    }
  );

  return store;
}
