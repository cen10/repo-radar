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

// Response format when using Accept: application/vnd.github.star+json
interface GitHubStarredRepoWithTimestamp {
  starred_at: string;
  repo: GitHubStarredRepo;
}

/**
 * Gets the total number of starred repositories for the authenticated user.
 *
 * GitHub's starred repos endpoint doesn't return a total count in the response body,
 * so we infer it from the Link header. By requesting per_page=1, the last page number
 * in the Link header equals the total count (e.g., page=513 means 513 starred repos).
 *
 * This is a lightweight call—we don't use the response body, just the headers.
 * @param token - GitHub access token
 * @returns Total number of starred repositories
 */
export async function fetchStarredRepoCount(token: string): Promise<number> {
  const params = new URLSearchParams({ per_page: '1' });
  const url = `${GITHUB_API_BASE}/user/starred?${params}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
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
 * Fetches ALL starred repositories using parallel requests for optimal performance.
 * Sorts by star count (most popular first) for "Most Stars" sort option.
 * @param token - GitHub access token
 * @param maxRepos - Maximum number of repositories to fetch (limits parallel API calls)
 * @returns Object containing repositories array sorted by star count
 */
export async function fetchAllStarredRepositories(
  token: string,
  maxRepos = 500
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
      headers: {
        Authorization: `Bearer ${token}`,
        // Use star+json to get starred_at timestamp for each repo
        Accept: 'application/vnd.github.star+json',
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

    const data: GitHubStarredRepoWithTimestamp[] = await response.json();

    // Transform GitHub API response to our Repository type
    return data.map(({ repo, starred_at }) => ({
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
      starred_at, // When the user starred this repo
      is_starred: true, // These are all starred repos by definition
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
      headers: {
        Authorization: `Bearer ${token}`,
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
 * Star a repository on GitHub
 * @param token - GitHub access token
 * @param owner - Repository owner
 * @param repo - Repository name
 */
export async function starRepository(token: string, owner: string, repo: string): Promise<void> {
  const response = await fetch(`${GITHUB_API_BASE}/user/starred/${owner}/${repo}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
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
 * @param token - GitHub access token
 * @param owner - Repository owner
 * @param repo - Repository name
 */
export async function unstarRepository(token: string, owner: string, repo: string): Promise<void> {
  const response = await fetch(`${GITHUB_API_BASE}/user/starred/${owner}/${repo}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
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
      headers: {
        Authorization: `Bearer ${token}`,
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
 * @param token - GitHub access token
 */
export async function fetchRateLimit(token: string): Promise<{
  remaining: number;
  limit: number;
  reset: Date;
}> {
  const response = await fetch(`${GITHUB_API_BASE}/rate_limit`, {
    headers: {
      Authorization: `Bearer ${token}`,
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
