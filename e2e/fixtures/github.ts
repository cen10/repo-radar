import { type Page, type Route } from '@playwright/test';
import {
  createMockStarredReposList,
  resetIdCounter,
  type GitHubStarredRepoResponse,
} from './github-mock-data';

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * In-memory store for GitHub mock data.
 */
export interface GitHubMockStore {
  /** Starred repositories (in starred order, most recent first) */
  starredRepos: GitHubStarredRepoResponse[];
}

/**
 * Create a default mock store with some sample data.
 */
export function createDefaultGitHubMockStore(): GitHubMockStore {
  resetIdCounter();
  return { starredRepos: createMockStarredReposList(5) };
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
  // Mock GET /user/starred - List starred repositories
  await page.route(`${GITHUB_API_BASE}/user/starred*`, async (route: Route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());

    if (method === 'GET') {
      // Parse pagination params
      const pageNum = parseInt(url.searchParams.get('page') || '1', 10);
      const perPage = parseInt(url.searchParams.get('per_page') || '30', 10);

      // Calculate pagination
      const startIdx = (pageNum - 1) * perPage;
      const endIdx = startIdx + perPage;
      const pagedRepos = store.starredRepos.slice(startIdx, endIdx);
      const total = store.starredRepos.length;

      // Build Link header for pagination (critical for fetchStarredRepoCount)
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
    } else if (method === 'HEAD') {
      // HEAD request used by fetchStarredRepoCount
      const perPage = parseInt(url.searchParams.get('per_page') || '1', 10);
      const total = store.starredRepos.length;
      const totalPages = Math.ceil(total / perPage);

      // Build Link header with last page (contains total count)
      let linkHeader = null;
      if (totalPages > 1) {
        linkHeader = `<${GITHUB_API_BASE}/user/starred?page=${totalPages}&per_page=${perPage}>; rel="last"`;
      }

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
        headers,
        body: '',
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
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'x-ratelimit-limit': '5000',
            'x-ratelimit-remaining': '4999',
            'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
          },
          body: JSON.stringify(starredRepo.repo),
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

  return store;
}
