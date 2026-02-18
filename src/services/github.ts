import type { Release, Repository } from '../types';
import type { components } from '../types/github-api.generated';
import { logger } from '../utils/logger';

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Maximum starred repos to fetch for client-side search/sort.
 * Limits parallel API calls to avoid rate limiting and slow performance.
 */
export const MAX_STARRED_REPOS = 500;

// GitHub API types from OpenAPI spec
/** Basic repo schema from list endpoints (e.g., /user/starred). No subscribers_count. */
type GitHubRepoListItem = components['schemas']['repository'];
/** Full repo schema from detail endpoints (e.g., /repositories/:id). Includes subscribers_count. */
type GitHubRepoDetail = components['schemas']['full-repository'];
type GitHubRelease = components['schemas']['release'];

// Response format when using Accept: application/vnd.github.star+json
interface GitHubStarredRepoWithTimestamp {
  starred_at: string;
  repo: GitHubRepoListItem;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Returns standard headers for GitHub API requests.
 */
function getGitHubHeaders(token: string, accept = 'application/vnd.github.v3+json'): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: accept,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

/**
 * Parses the rate limit reset time from response headers.
 * Returns null if the header is missing.
 */
function parseRateLimitReset(response: Response): Date | null {
  const resetTime = response.headers.get('x-ratelimit-reset');
  return resetTime ? new Date(parseInt(resetTime) * 1000) : null;
}

type ResponseCheck = { ok: true } | { ok: false; status: number; message: string };

/**
 * Checks a GitHub API response and returns a result object.
 * Provides user-friendly error messages for common error cases.
 * Caller decides what constitutes an error for their use case.
 *
 * @param context - Optional context for generic errors (e.g., "fetch rate limit")
 */
function checkGitHubResponse(response: Response, context?: string): ResponseCheck {
  if (response.ok) return { ok: true };

  if (response.status === 401) {
    return {
      ok: false,
      status: 401,
      message: 'GitHub authentication failed. Please sign in again.',
    };
  }

  if (response.status === 403) {
    const remaining = response.headers.get('x-ratelimit-remaining');
    if (remaining === '0') {
      const resetDate = parseRateLimitReset(response);
      const resetInfo = resetDate ? ` Resets at ${resetDate.toLocaleTimeString()}` : '';
      return { ok: false, status: 403, message: `GitHub API rate limit exceeded.${resetInfo}` };
    }
    return {
      ok: false,
      status: 403,
      message: 'GitHub API access forbidden. Please check your permissions.',
    };
  }

  if (response.status === 422) {
    return {
      ok: false,
      status: 422,
      message: 'Invalid search query. Please check your search terms.',
    };
  }

  const statusInfo = `${response.status} ${response.statusText}`;
  const message = context
    ? `Failed to ${context}: ${statusInfo}`
    : `GitHub API error: ${statusInfo}`;
  return { ok: false, status: response.status, message };
}

interface MapRepoOptions {
  starred_at?: string;
  is_starred?: boolean;
  subscribers_count?: number; // Real watcher count from full-repository response
}

/**
 * Transforms GitHub API repository response to our Repository type.
 * Note: watchers_count is only populated when subscribers_count is provided
 * (from full-repository responses). The basic repository schema's watchers_count
 * field is actually the star count due to a GitHub API legacy quirk.
 */
function mapGitHubRepoToRepository(
  repo: GitHubRepoListItem | GitHubRepoDetail,
  options?: MapRepoOptions
): Repository {
  return {
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    owner: { login: repo.owner.login, avatar_url: repo.owner.avatar_url },
    description: repo.description,
    html_url: repo.html_url,
    stargazers_count: repo.stargazers_count,
    forks_count: repo.forks_count,
    // Only populated on repo detail page; undefined from list/search endpoints (they lack subscribers_count)
    watchers_count: options?.subscribers_count,
    open_issues_count: repo.open_issues_count,
    language: repo.language,
    license: repo.license,
    topics: repo.topics || [],
    updated_at: repo.updated_at ?? new Date().toISOString(),
    pushed_at: repo.pushed_at,
    created_at: repo.created_at ?? new Date().toISOString(),
    starred_at: options?.starred_at,
    is_starred: options?.is_starred ?? false,
    metrics: {
      stars_growth_rate: calculateGrowthRate(repo),
      stars_gained: calculateStarsGained(repo),
      issues_growth_rate: 0,
      is_trending: isTrending(repo),
    },
    is_following: false,
  };
}

// ============================================================================
// Public API Functions
// ============================================================================

/**
 * Gets the total number of starred repositories for the authenticated user.
 *
 * GitHub's starred repos endpoint doesn't return a total count in the response body,
 * so we infer it from the Link header. By requesting per_page=1, the last page number
 * in the Link header equals the total count (e.g., page=513 means 513 starred repos).
 *
 * Uses HEAD request for efficiency (only needs Link header, not body).
 * Falls back to GET for edge cases (0-1 starred repos where Link header is absent).
 * @param token - GitHub access token
 * @returns Total number of starred repositories
 */
export async function fetchStarredRepoCount(token: string): Promise<number> {
  const params = new URLSearchParams({ per_page: '1' });
  const url = `${GITHUB_API_BASE}/user/starred?${params}`;

  // Try HEAD first - more efficient since we only need headers
  const headResponse = await fetch(url, {
    method: 'HEAD',
    headers: getGitHubHeaders(token),
  });

  const headResult = checkGitHubResponse(headResponse);
  if (!headResult.ok) throw new Error(headResult.message);

  const linkHeader = headResponse.headers.get('Link');

  if (linkHeader) {
    const lastMatch = linkHeader.match(/<[^>]+[?&]page=(\d+)[^>]*>;\s*rel="last"/);
    if (lastMatch) {
      return parseInt(lastMatch[1], 10);
    }
  }

  // Fall back to GET for edge cases (0-1 repos where Link header is absent)
  const getResponse = await fetch(url, {
    headers: getGitHubHeaders(token),
  });

  const getResult = checkGitHubResponse(getResponse);
  if (!getResult.ok) throw new Error(getResult.message);

  const data = await getResponse.json();
  return data.length;
}

/**
 * Fetches ALL starred repositories using parallel requests for optimal performance.
 * Sorts by star count (most popular first) for "Most Stars" sort option.
 * @param token - GitHub access token
 * @param maxRepos - Maximum number of repositories to fetch (limits parallel API calls)
 * @returns Object containing repositories array sorted by star count
 */
export async function fetchAllStarredRepositories(
  token: string,
  maxRepos = MAX_STARRED_REPOS
): Promise<{
  repositories: Repository[];
  totalFetched: number;
  totalStarred: number;
}> {
  // Step 1: Get total starred count with a single minimal request
  const totalStarred = await fetchStarredRepoCount(token);

  if (totalStarred === 0) {
    return {
      repositories: [],
      totalFetched: 0,
      totalStarred: 0,
    };
  }

  // Step 2: Calculate how many pages we need (capped by maxRepos to limit parallel calls)
  const perPage = 100;
  const reposToFetch = Math.min(totalStarred, maxRepos);
  const pagesToFetch = Math.ceil(reposToFetch / perPage);
  const pages = Array.from({ length: pagesToFetch }, (_, i) => i + 1);

  // Step 3: Fetch all pages in parallel
  const results = await Promise.allSettled(
    pages.map((page) => fetchStarredRepositories(token, page, perPage))
  );

  // Step 4: Process results
  const allRepos: Repository[] = [];
  const failedPages: number[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      allRepos.push(...result.value);
    } else {
      failedPages.push(pages[index]);
      logger.error('Failed to fetch starred repositories page', {
        page: pages[index],
        error: result.reason,
      });
    }
  });

  if (failedPages.length === pages.length) {
    throw new Error('Failed to fetch any starred repositories');
  }

  // Step 5: Sort by star count (most popular first) and trim to maxRepos if needed
  const sortedRepos = allRepos.sort((a, b) => b.stargazers_count - a.stargazers_count);
  const trimmedRepos = sortedRepos.slice(0, maxRepos);
  const isLimited = totalStarred > maxRepos;

  const notes = [
    isLimited && `limited to ${maxRepos}`,
    failedPages.length > 0 && `${failedPages.length} pages failed`,
  ].filter(Boolean);
  logger.info(
    `Bulk-fetched ${trimmedRepos.length} of ${totalStarred} repos for use with the Most Stars filter${
      notes.length > 0 ? ` (${notes.join(', ')})` : ''
    }`
  );

  return {
    repositories: trimmedRepos,
    totalFetched: trimmedRepos.length,
    totalStarred,
  };
}

export type StarredSortOption = 'created' | 'updated';
export type SortDirection = 'asc' | 'desc';

/**
 * Fetch starred repositories for a specific page
 * @param token - GitHub access token
 * @param page - Page number
 * @param perPage - Items per page
 * @param sort - Sort field: 'created' or 'updated' (GitHub API limitation)
 * @param direction - Sort direction: 'asc' or 'desc'
 */
export async function fetchStarredRepositories(
  token: string,
  page = 1,
  perPage = 30,
  sort: StarredSortOption = 'updated',
  direction: SortDirection = 'desc'
): Promise<Repository[]> {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
    sort,
    direction,
  });
  const url = `${GITHUB_API_BASE}/user/starred?${params}`;

  try {
    const response = await fetch(url, {
      // Use star+json to get starred_at timestamp for each repo
      headers: getGitHubHeaders(token, 'application/vnd.github.star+json'),
    });

    const result = checkGitHubResponse(response);
    if (!result.ok) throw new Error(result.message);

    const data: GitHubStarredRepoWithTimestamp[] = await response.json();

    return data.map(({ repo, starred_at }) =>
      mapGitHubRepoToRepository(repo, { starred_at, is_starred: true })
    );
  } catch (error) {
    logger.error('Failed to fetch starred repositories:', error);
    throw error;
  }
}

// Minimal type for metrics calculations - only the fields actually used
interface RepoMetricsInput {
  id: number;
  stargazers_count: number;
  pushed_at: string | null;
  updated_at: string | null;
}

/**
 * Simple pseudo-random number generator seeded by repo ID.
 * Returns a deterministic value 0-1 for any given seed.
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

/**
 * Simplified growth rate calculation
 * In production, this would compare with historical data
 */
function calculateGrowthRate(repo: RepoMetricsInput): number {
  // This is a placeholder - real implementation would need historical data
  // Uses seeded random based on repo ID for consistent values across renders
  const dateStr = repo.pushed_at || repo.updated_at;
  if (!dateStr) return 0;
  const recentlyUpdated = new Date(dateStr) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  if (!recentlyUpdated) return 0;

  // Mock calculation based on star count
  // Returns decimal format: 0.05 = 5% growth
  // Some repos get higher growth rates to trigger "hot" badge (needs 25%+)
  // Use repo.id % 3 for consistent "hot candidate" selection across metrics
  const isHotCandidate = repo.stargazers_count >= 100 && repo.id % 3 === 0;
  if (isHotCandidate) {
    // 25-50% growth for hot candidates (deterministic based on repo ID)
    return parseFloat((0.25 + seededRandom(repo.id) * 0.25).toFixed(3));
  }
  const baseRatePercent = Math.max(1, 20 - Math.log10(repo.stargazers_count + 1) * 3);
  const ratePercent = baseRatePercent * (0.5 + seededRandom(repo.id));
  return parseFloat((ratePercent / 100).toFixed(3)); // Convert to decimal
}

/**
 * Mock stars gained calculation
 * In production, this would come from historical snapshot comparison
 */
function calculateStarsGained(repo: RepoMetricsInput): number {
  const dateStr = repo.pushed_at || repo.updated_at;
  if (!dateStr) return 0;
  const recentlyUpdated = new Date(dateStr) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  if (!recentlyUpdated) return 0;

  // Mock: higher star repos gain more absolute stars
  // For "hot" badge: need 50+ gained, so make some repos qualify
  // Use seeded random based on repo ID for consistent values across renders
  const isHotCandidate = repo.stargazers_count >= 100 && repo.id % 3 === 0;
  if (isHotCandidate) {
    // 50-150 stars gained for hot candidates (deterministic)
    return 50 + Math.floor(seededRandom(repo.id + 1) * 100);
  }
  const baseGain = Math.floor(repo.stargazers_count * 0.005 * seededRandom(repo.id + 2));
  return Math.max(0, baseGain + Math.floor(seededRandom(repo.id + 3) * 20));
}

/**
 * Simplified trending detection
 * In production, this would analyze recent activity patterns
 */
function isTrending(repo: RepoMetricsInput): boolean {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const lastActivity = repo.pushed_at || repo.updated_at;
  if (!lastActivity) return false;
  const recentlyActive = new Date(lastActivity) > oneWeekAgo;
  const highStars = repo.stargazers_count > 1000;

  return recentlyActive && highStars;
}

/**
 * Search GitHub repositories
 * @param token - GitHub access token
 * @param query - Search query (can include quotes for exact match)
 * @param page - Page number for pagination
 * @param perPage - Number of items per page
 * @param sortBy - Sort option for results
 * @param signal - AbortSignal for cancellation
 * @param starredIds - Set of repository IDs the user has starred (for marking search results)
 * @returns Object containing repositories and pagination info
 */
// Sort options for GitHub's search API (Explore All view)
export type SearchSortOption = 'updated' | 'stars' | 'forks' | 'help-wanted' | 'best-match';

// Sort options for client-side starred search (My Stars view)
// Includes 'created' which sorts by when the user starred the repo
export type StarredSearchSortOption = 'updated' | 'stars' | 'created';

export async function searchRepositories(
  token: string,
  query: string,
  page: number,
  perPage: number,
  sortBy: SearchSortOption,
  signal: AbortSignal,
  starredIds: Set<number>
): Promise<{
  repositories: Repository[];
  totalCount: number;
  apiSearchResultTotal: number;
}> {
  // Check if query is wrapped in quotes for exact match
  const isExactMatch = query.startsWith('"') && query.endsWith('"');
  const searchTerm = isExactMatch ? query.slice(1, -1) : query;

  // Build search query
  // For exact match, search in name only
  // For fuzzy match, search broadly
  const searchQuery = isExactMatch ? `${searchTerm} in:name` : searchTerm;

  // Map our sort options to GitHub API sort parameters
  // GitHub search supports: stars, forks, help-wanted-issues, updated
  // 'best-match' means no sort parameter (GitHub's default relevance ranking)
  const githubSortMap: Record<SearchSortOption, string | null> = {
    updated: 'updated',
    stars: 'stars',
    forks: 'forks',
    'help-wanted': 'help-wanted-issues',
    'best-match': null, // No sort = relevance ranking
  };

  const sortParam = githubSortMap[sortBy];
  const params = new URLSearchParams({
    q: searchQuery,
    page: page.toString(),
    per_page: perPage.toString(),
    ...(sortParam && { sort: sortParam, order: 'desc' }),
  });
  const url = `${GITHUB_API_BASE}/search/repositories?${params}`;

  try {
    const response = await fetch(url, {
      signal,
      headers: getGitHubHeaders(token),
    });

    const result = checkGitHubResponse(response);
    if (!result.ok) throw new Error(result.message);

    const data = await response.json();
    const repos: GitHubRepoListItem[] = data.items || [];
    const totalCount = data.total_count || 0;

    // Apply GitHub API limitation (max 1000 results accessible)
    const GITHUB_SEARCH_LIMIT = 1000;
    const apiSearchResultTotal = Math.min(totalCount, GITHUB_SEARCH_LIMIT);

    const repositories = repos.map((repo) =>
      mapGitHubRepoToRepository(repo, { is_starred: starredIds.has(repo.id) })
    );

    return {
      repositories,
      totalCount,
      apiSearchResultTotal,
    };
  } catch (error) {
    // Re-throw abort errors without logging - they're expected
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    logger.error('Failed to search repositories:', error);
    throw error;
  }
}

/**
 * Search within the user's starred repositories (client-side filtering and pagination)
 * @param token - GitHub access token
 * @param query - The search query string
 * @param page - Page number for pagination (1-indexed)
 * @param perPage - Number of items per page
 * @param allStarredRepos - Pre-fetched starred repositories (optional, will fetch if not provided)
 * @returns Object containing repositories and pagination info
 */
export async function searchStarredRepositories(
  token: string,
  query: string,
  page = 1,
  perPage = 30,
  allStarredRepos?: Repository[],
  sortBy: StarredSearchSortOption = 'updated',
  signal?: AbortSignal
): Promise<{
  repositories: Repository[];
  totalCount: number;
  apiSearchResultTotal: number;
}> {
  try {
    // Check for abort before doing work
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    // Get all starred repos (either provided or fetch them)
    let starredRepos: Repository[];
    if (allStarredRepos) {
      starredRepos = allStarredRepos;
    } else {
      // Fetch all starred repos - this is expensive but necessary for accurate client-side search
      const result = await fetchAllStarredRepositories(token);
      starredRepos = result.repositories;
    }

    // Check for abort after async work
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    // Filter repos based on search query
    const queryLower = query.toLowerCase();
    const filteredRepos = starredRepos.filter((repo) => {
      const searchIn = [
        repo.name,
        repo.full_name,
        repo.description || '',
        repo.language || '',
        ...(repo.topics || []),
      ]
        .join(' ')
        .toLowerCase();
      return searchIn.includes(queryLower);
    });

    // Sort results based on sortBy option
    const sortedRepos = [...filteredRepos].sort((a, b) => {
      switch (sortBy) {
        case 'stars':
          return b.stargazers_count - a.stargazers_count;
        case 'created':
          // Sort by starred_at (when the user starred the repo)
          return new Date(b.starred_at!).getTime() - new Date(a.starred_at!).getTime();
        case 'updated':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

    // Client-side pagination
    const totalCount = sortedRepos.length;
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedRepos = sortedRepos.slice(startIndex, endIndex);

    return {
      repositories: paginatedRepos,
      totalCount,
      apiSearchResultTotal: totalCount,
    };
  } catch (error) {
    // Re-throw abort errors without logging - they're expected
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    logger.error('Failed to search starred repositories:', error);
    throw error;
  }
}

/**
 * Check if a repository is starred by the authenticated user
 * @param token - GitHub access token (returns false if null)
 * @param owner - Repository owner
 * @param repo - Repository name
 */
export async function isRepositoryStarred(
  token: string | null,
  owner: string,
  repo: string
): Promise<boolean> {
  if (!token) {
    return false;
  }

  try {
    const response = await fetch(`${GITHUB_API_BASE}/user/starred/${owner}/${repo}`, {
      method: 'GET',
      headers: getGitHubHeaders(token),
    });

    return response.status === 204;
  } catch {
    return false;
  }
}

/**
 * Fetch rate limit status from GitHub API
 * @param token - GitHub access token
 */
export async function fetchRateLimit(token: string): Promise<{
  remaining: number;
  limit: number;
  reset: Date;
}> {
  const response = await fetch(`${GITHUB_API_BASE}/rate_limit`, {
    headers: getGitHubHeaders(token),
  });

  const result = checkGitHubResponse(response, 'fetch rate limit');
  if (!result.ok) throw new Error(result.message);

  const data = await response.json();
  const core = data.rate || data.resources?.core;

  return {
    remaining: core.remaining,
    limit: core.limit,
    reset: new Date(core.reset * 1000),
  };
}

/**
 * Fetch releases for a repository (lazy-loaded on detail page)
 * Always fetches 10 releases - callers can slice if fewer needed.
 * @param token - GitHub access token
 * @param owner - Repository owner
 * @param repo - Repository name
 * @returns Array of releases, newest first
 */
export async function fetchRepositoryReleases(
  token: string,
  owner: string,
  repo: string
): Promise<Release[]> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/releases?per_page=10`;

  try {
    const response = await fetch(url, {
      headers: getGitHubHeaders(token),
    });

    const result = checkGitHubResponse(response);
    if (!result.ok) {
      // GitHub returns 404 for two reasons:
      // 1. The repository doesn't exist (rare - user likely navigated here from a valid repo)
      // 2. The repository exists but has no releases (common)
      // In both cases, returning an empty array is appropriate - no releases to show.
      if (result.status === 404) return [];
      throw new Error(result.message);
    }

    const data: GitHubRelease[] = await response.json();

    return data.map((release) => ({
      id: release.id,
      tag_name: release.tag_name,
      name: release.name,
      body: release.body ?? null,
      html_url: release.html_url,
      published_at: release.published_at,
      created_at: release.created_at,
      prerelease: release.prerelease,
      draft: release.draft,
      author: release.author,
    }));
  } catch (error) {
    logger.error('Failed to fetch repository releases:', error);
    throw error;
  }
}

/**
 * Fetch a single repository by its GitHub numeric ID.
 * Returns null if the repo doesn't exist or is inaccessible (deleted, private).
 * Throws on auth errors or rate limiting.
 *
 * @param token - GitHub access token
 * @param repoId - GitHub repository numeric ID
 * @returns Repository data or null if not found/inaccessible
 */
export async function fetchRepositoryById(
  token: string,
  repoId: number
): Promise<Repository | null> {
  const url = `${GITHUB_API_BASE}/repositories/${repoId}`;

  try {
    const response = await fetch(url, {
      headers: getGitHubHeaders(token),
    });

    const result = checkGitHubResponse(response);
    if (!result.ok) {
      // 404: Repo deleted or made private
      if (result.status === 404) return null;
      // 403 without rate limit: Private repo we can't access
      // 403 with rate limit: throw (message contains "rate limit")
      if (result.status === 403 && !result.message.includes('rate limit')) return null;
      throw new Error(result.message);
    }

    const repo: GitHubRepoDetail = await response.json();

    return mapGitHubRepoToRepository(repo, {
      is_starred: false,
      subscribers_count: repo.subscribers_count,
    });
  } catch (error) {
    // Re-throw auth/rate-limit errors
    if (error instanceof Error && error.message.includes('GitHub')) {
      throw error;
    }
    logger.error('Failed to fetch repository by ID:', { repoId, error });
    return null;
  }
}

/**
 * Fetch the actual open issue count for a repository (excluding PRs).
 * GitHub's open_issues_count field includes both issues and PRs.
 * This uses the Search API to get issues only.
 *
 * @param token - GitHub access token
 * @param owner - Repository owner
 * @param repo - Repository name
 * @returns The count of open issues (excluding PRs), or null on error
 */
export async function fetchIssueCount(
  token: string,
  owner: string,
  repo: string
): Promise<number | null> {
  const query = encodeURIComponent(`repo:${owner}/${repo} is:issue is:open`);
  const url = `${GITHUB_API_BASE}/search/issues?q=${query}&per_page=1`;

  try {
    const response = await fetch(url, {
      headers: getGitHubHeaders(token),
    });

    const result = checkGitHubResponse(response, 'fetch issue count');
    if (!result.ok) {
      if (result.status === 403 || result.status === 401) {
        throw new Error(result.message);
      }
      return null;
    }

    const data: { total_count: number } = await response.json();
    return data.total_count;
  } catch (error) {
    if (error instanceof Error && error.message.includes('GitHub')) {
      throw error;
    }
    logger.error('Failed to fetch issue count:', { owner, repo, error });
    return null;
  }
}

/**
 * Fetch multiple repositories by their GitHub numeric IDs.
 * Uses parallel requests for performance.
 * Skips any repos that fail to fetch (deleted, private, etc.).
 * @param token - GitHub access token
 * @param repoIds - Array of GitHub repository numeric IDs
 * @returns Array of successfully fetched repositories
 */
export async function fetchRepositoriesByIds(
  token: string,
  repoIds: number[]
): Promise<Repository[]> {
  if (repoIds.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(repoIds.map((id) => fetchRepositoryById(token, id)));

  const repositories: Repository[] = [];
  const failedIds: number[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value !== null) {
      repositories.push(result.value);
    } else if (result.status === 'rejected') {
      // Propagate auth/rate-limit errors instead of silently swallowing them
      const error = result.reason;
      if (error instanceof Error && error.message.includes('GitHub')) {
        throw error;
      }
      failedIds.push(repoIds[index]);
    } else {
      failedIds.push(repoIds[index]);
    }
  });

  if (failedIds.length > 0) {
    logger.warn('Some repositories could not be fetched', {
      failedCount: failedIds.length,
      failedIds: failedIds.slice(0, 10), // Log first 10 for debugging
    });
  }

  return repositories;
}
