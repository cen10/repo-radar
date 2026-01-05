import type { Session } from '@supabase/supabase-js';
import type { Repository } from '../types';
import { logger } from '../utils/logger';

const GITHUB_API_BASE = 'https://api.github.com';

interface GitHubStarredRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  description: string | null;
  html_url: string;
  stargazers_count: number;
  open_issues_count: number;
  language: string | null;
  topics?: string[];
  updated_at: string;
  pushed_at: string | null;
  created_at: string;
}

/**
 * Gets the total number of starred repositories for the authenticated user.
 *
 * GitHub's starred repos endpoint doesn't return a total count in the response body,
 * so we infer it from the Link header. By requesting per_page=1, the last page number
 * in the Link header equals the total count (e.g., page=513 means 513 starred repos).
 *
 * This is a lightweight call—we don't use the response body, just the headers.
 * @param session - The Supabase session containing the GitHub access token
 * @returns Total number of starred repositories
 */
async function fetchStarredRepoCount(session: Session): Promise<number> {
  const url = new URL(`${GITHUB_API_BASE}/user/starred`);
  url.searchParams.append('per_page', '1');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${session.provider_token}`,
      Accept: 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('GitHub authentication failed. Please sign in again.');
    }
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const linkHeader = response.headers.get('Link');

  if (!linkHeader) {
    // No Link header means everything fits on one page
    const data = await response.json();
    return data.length;
  }

  const lastMatch = linkHeader.match(/<[^>]+[?&]page=(\d+)[^>]*>;\s*rel="last"/);

  if (!lastMatch) {
    // Has Link header but no "last" rel—we're on the only/last page
    const data = await response.json();
    return data.length;
  }

  return parseInt(lastMatch[1], 10);
}

/**
 * Fetches ALL starred repositories using parallel requests for optimal performance
 * @param session - The Supabase session containing the GitHub access token
 * @param maxRepos - Maximum number of repositories to fetch (default: 500)
 * @returns Object containing repositories array and metadata about limits
 */
export async function fetchAllStarredRepositories(
  session: Session | null,
  maxRepos = 500
): Promise<{
  repositories: Repository[];
  totalFetched: number;
  totalStarred: number;
  isLimited: boolean;
  hasMore: boolean;
}> {
  if (!session?.provider_token) {
    throw new Error('No GitHub access token available');
  }

  // Step 1: Get total starred count with a single minimal request
  const totalStarred = await fetchStarredRepoCount(session);

  if (totalStarred === 0) {
    return {
      repositories: [],
      totalFetched: 0,
      totalStarred: 0,
      isLimited: false,
      hasMore: false,
    };
  }

  // Step 2: Calculate how many pages we actually need
  const perPage = 100;
  const pagesForAllStars = Math.ceil(totalStarred / perPage);
  const pagesForMaxRepos = Math.ceil(maxRepos / perPage);
  const pagesToFetch = Math.min(pagesForAllStars, pagesForMaxRepos);
  const pages = Array.from({ length: pagesToFetch }, (_, i) => i + 1);

  // Step 3: Fetch all needed pages in parallel
  const results = await Promise.allSettled(
    pages.map((page) => fetchStarredRepositories(session, page, perPage))
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

  // Step 5: Sort by star count (most popular first) and then trim to maxRepos if needed
  const sortedRepos = allRepos.sort((a, b) => b.stargazers_count - a.stargazers_count);
  const trimmedRepos = sortedRepos.slice(0, maxRepos);
  const hasMore = totalStarred > maxRepos;

  logger.info(
    `Fetched ${trimmedRepos.length} of ${totalStarred} starred repositories across ${pagesToFetch} pages${
      hasMore ? ` (limited to ${maxRepos})` : ''
    }${failedPages.length > 0 ? ` (${failedPages.length} pages failed)` : ''}`
  );

  return {
    repositories: trimmedRepos,
    totalFetched: trimmedRepos.length,
    totalStarred,
    isLimited: hasMore,
    hasMore,
  };
}

export async function fetchStarredRepositories(
  session: Session | null,
  page = 1,
  perPage = 30
): Promise<Repository[]> {
  if (!session?.provider_token) {
    throw new Error('No GitHub access token available');
  }

  const url = new URL(`${GITHUB_API_BASE}/user/starred`);
  url.searchParams.append('page', page.toString());
  url.searchParams.append('per_page', perPage.toString());
  url.searchParams.append('sort', 'created');
  url.searchParams.append('direction', 'desc');

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${session.provider_token}`,
        Accept: 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('GitHub authentication failed. Please sign in again.');
      }
      if (response.status === 403) {
        const remaining = response.headers.get('x-ratelimit-remaining');
        if (remaining === '0') {
          const resetTime = response.headers.get('x-ratelimit-reset');
          const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : new Date();
          throw new Error(
            `GitHub API rate limit exceeded. Resets at ${resetDate.toLocaleTimeString()}`
          );
        }
        throw new Error('GitHub API access forbidden. Please check your permissions.');
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Standard GitHub API response format
    const repos: GitHubStarredRepo[] = data;

    // Transform GitHub API response to our Repository type
    return repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      owner: {
        login: repo.owner.login,
        avatar_url: repo.owner.avatar_url,
      },
      description: repo.description,
      html_url: repo.html_url,
      stargazers_count: repo.stargazers_count,
      open_issues_count: repo.open_issues_count,
      language: repo.language,
      topics: repo.topics || [],
      updated_at: repo.updated_at,
      pushed_at: repo.pushed_at,
      created_at: repo.created_at,
      is_starred: true, // These are all starred repos by definition
      // Calculate basic metrics (in production, these would come from a backend service)
      metrics: {
        stars_growth_rate: calculateGrowthRate(repo),
        issues_growth_rate: 0, // Would need historical data
        is_trending: isTrending(repo),
      },
      is_following: false, // This would come from user's saved preferences
    }));
  } catch (error) {
    logger.error('Failed to fetch starred repositories:', error);
    throw error;
  }
}

/**
 * Simplified growth rate calculation
 * In production, this would compare with historical data
 */
function calculateGrowthRate(repo: GitHubStarredRepo): number {
  // This is a placeholder - real implementation would need historical data
  // For now, return a random value for demonstration
  const recentlyUpdated =
    new Date(repo.pushed_at || repo.updated_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  if (!recentlyUpdated) return 0;

  // Mock calculation based on star count (higher stars = slower growth typically)
  const baseRate = Math.max(1, 20 - Math.log10(repo.stargazers_count + 1) * 3);
  return parseFloat((baseRate * (0.5 + Math.random())).toFixed(1));
}

/**
 * Simplified trending detection
 * In production, this would analyze recent activity patterns
 */
function isTrending(repo: GitHubStarredRepo): boolean {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentlyActive = new Date(repo.pushed_at || repo.updated_at) > oneWeekAgo;
  const highStars = repo.stargazers_count > 1000;

  return recentlyActive && highStars;
}

/**
 * Search GitHub repositories
 * @param session - The Supabase session containing the GitHub access token
 * @param query - Search query (can include quotes for exact match)
 * @param page - Page number for pagination
 * @param perPage - Number of items per page
 * @returns Object containing repositories and pagination info
 */
export async function searchRepositories(
  session: Session | null,
  query: string,
  page = 1,
  perPage = 30,
  signal?: AbortSignal
): Promise<{
  repositories: Repository[];
  totalCount: number;
  apiSearchResultTotal: number;
  isLimited: boolean;
}> {
  if (!session?.provider_token) {
    throw new Error('No GitHub access token available');
  }

  // Check if query is wrapped in quotes for exact match
  const isExactMatch = query.startsWith('"') && query.endsWith('"');
  const searchTerm = isExactMatch ? query.slice(1, -1) : query;

  // Build search query
  // For exact match, search in name only
  // For fuzzy match, search broadly
  const searchQuery = isExactMatch ? `${searchTerm} in:name` : searchTerm;

  const url = new URL(`${GITHUB_API_BASE}/search/repositories`);
  url.searchParams.append('q', searchQuery);
  url.searchParams.append('page', page.toString());
  url.searchParams.append('per_page', perPage.toString());
  url.searchParams.append('sort', 'stars');
  url.searchParams.append('order', 'desc');

  try {
    const response = await fetch(url.toString(), {
      signal,
      headers: {
        Authorization: `Bearer ${session.provider_token}`,
        Accept: 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('GitHub authentication failed. Please sign in again.');
      }
      if (response.status === 403) {
        const remaining = response.headers.get('x-ratelimit-remaining');
        if (remaining === '0') {
          const resetTime = response.headers.get('x-ratelimit-reset');
          const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : new Date();
          throw new Error(
            `GitHub API rate limit exceeded. Resets at ${resetDate.toLocaleTimeString()}`
          );
        }
        throw new Error('GitHub API access forbidden. Please check your permissions.');
      }
      if (response.status === 422) {
        throw new Error('Invalid search query. Please check your search terms.');
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const repos: GitHubStarredRepo[] = data.items || [];
    const totalCount = data.total_count || 0;

    // Apply GitHub API limitation (max 1000 results accessible)
    const GITHUB_SEARCH_LIMIT = 1000;
    const apiSearchResultTotal = Math.min(totalCount, GITHUB_SEARCH_LIMIT);
    const isLimited = totalCount > GITHUB_SEARCH_LIMIT;

    // Check if these repos are in user's starred list
    const starredIds = await fetchUserStarredIds(session);

    // Transform GitHub API response to our Repository type
    const repositories = repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      owner: {
        login: repo.owner.login,
        avatar_url: repo.owner.avatar_url,
      },
      description: repo.description,
      html_url: repo.html_url,
      stargazers_count: repo.stargazers_count,
      open_issues_count: repo.open_issues_count,
      language: repo.language,
      topics: repo.topics || [],
      updated_at: repo.updated_at,
      pushed_at: repo.pushed_at,
      created_at: repo.created_at,
      is_starred: starredIds.has(repo.id), // Simple boolean check
      metrics: {
        stars_growth_rate: calculateGrowthRate(repo),
        issues_growth_rate: 0,
        is_trending: isTrending(repo),
      },
      is_following: false, // Deprecated - keeping for backwards compatibility
    }));

    return {
      repositories,
      totalCount,
      apiSearchResultTotal,
      isLimited,
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
 * @param session - The Supabase session containing the GitHub access token
 * @param query - The search query string
 * @param page - Page number for pagination (1-indexed)
 * @param perPage - Number of items per page
 * @param allStarredRepos - Pre-fetched starred repositories (optional, will fetch if not provided)
 * @returns Object containing repositories and pagination info
 */
export async function searchStarredRepositories(
  session: Session | null,
  query: string,
  page = 1,
  perPage = 30,
  allStarredRepos?: Repository[],
  signal?: AbortSignal
): Promise<{
  repositories: Repository[];
  totalCount: number;
  apiSearchResultTotal: number;
  isLimited: boolean;
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
      starredRepos = await fetchStarredRepositories(session, 1, 100); // Get up to 100 for now
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

    // Client-side pagination
    const totalCount = filteredRepos.length;
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedRepos = filteredRepos.slice(startIndex, endIndex);

    return {
      repositories: paginatedRepos,
      totalCount,
      apiSearchResultTotal: totalCount, // No API limit for client-side filtering
      isLimited: false, // Client-side filtering has no API limitations
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
 * Fetch IDs of all user's starred repositories (for checking if searched repos are starred)
 * This is a lightweight call that only gets IDs
 */
async function fetchUserStarredIds(session: Session | null): Promise<Set<number>> {
  if (!session?.provider_token) {
    return new Set();
  }

  try {
    const url = new URL(`${GITHUB_API_BASE}/user/starred`);
    url.searchParams.append('per_page', '100'); // Get first 100 starred repos

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${session.provider_token}`,
        Accept: 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      return new Set();
    }

    const repos: Array<{ id: number; name?: string }> = await response.json();
    const starredIds = new Set(repos.map((repo) => repo.id));

    return starredIds;
  } catch {
    return new Set();
  }
}

/**
 * Star a repository on GitHub
 */
export async function starRepository(
  session: Session | null,
  owner: string,
  repo: string
): Promise<void> {
  if (!session?.provider_token) {
    throw new Error('No GitHub access token available');
  }

  const response = await fetch(`${GITHUB_API_BASE}/user/starred/${owner}/${repo}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${session.provider_token}`,
      Accept: 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok && response.status !== 204) {
    if (response.status === 404) {
      throw new Error('Repository not found');
    }
    if (response.status === 403) {
      throw new Error('Permission denied to star this repository');
    }
    throw new Error(`Failed to star repository: ${response.status} ${response.statusText}`);
  }
}

/**
 * Unstar a repository on GitHub
 */
export async function unstarRepository(
  session: Session | null,
  owner: string,
  repo: string
): Promise<void> {
  if (!session?.provider_token) {
    throw new Error('No GitHub access token available');
  }

  const response = await fetch(`${GITHUB_API_BASE}/user/starred/${owner}/${repo}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${session.provider_token}`,
      Accept: 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok && response.status !== 204) {
    if (response.status === 404) {
      throw new Error('Repository not found or not starred');
    }
    if (response.status === 403) {
      throw new Error('Permission denied to unstar this repository');
    }
    throw new Error(`Failed to unstar repository: ${response.status} ${response.statusText}`);
  }
}

/**
 * Check if a repository is starred by the authenticated user
 */
export async function isRepositoryStarred(
  session: Session | null,
  owner: string,
  repo: string
): Promise<boolean> {
  if (!session?.provider_token) {
    return false;
  }

  try {
    const response = await fetch(`${GITHUB_API_BASE}/user/starred/${owner}/${repo}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session.provider_token}`,
        Accept: 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    return response.status === 204;
  } catch {
    return false;
  }
}

/**
 * Fetch rate limit status from GitHub API
 */
export async function fetchRateLimit(session: Session | null): Promise<{
  remaining: number;
  limit: number;
  reset: Date;
}> {
  if (!session?.provider_token) {
    throw new Error('No GitHub access token available');
  }

  const response = await fetch(`${GITHUB_API_BASE}/rate_limit`, {
    headers: {
      Authorization: `Bearer ${session.provider_token}`,
      Accept: 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch rate limit');
  }

  const data = await response.json();
  const core = data.rate || data.resources?.core;

  return {
    remaining: core.remaining,
    limit: core.limit,
    reset: new Date(core.reset * 1000),
  };
}
