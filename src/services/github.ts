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
  // Additional fields when using starred endpoint with timestamps
  starred_at?: string;
}

/**
 * Fetches the user's starred repositories from GitHub API
 * @param session - The Supabase session containing the GitHub access token
 * @param page - Page number for pagination (1-indexed)
 * @param perPage - Number of items per page (max 100)
 * @returns Array of repositories with metrics
 */
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
  url.searchParams.append('sort', 'updated');
  url.searchParams.append('direction', 'desc');

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${session.provider_token}`,
        Accept: 'application/vnd.github.v3.star+json', // Gets starred_at timestamp
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

    // When using the star+json accept header, each item has { starred_at, repo }
    const repos: GitHubStarredRepo[] = data.map(
      (item: { starred_at: string; repo: Omit<GitHubStarredRepo, 'starred_at'> }) => ({
        ...item.repo,
        starred_at: item.starred_at,
      })
    );

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
      starred_at: repo.starred_at,
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
 * @returns Array of repositories matching the search
 */
export async function searchRepositories(
  session: Session | null,
  query: string,
  page = 1,
  perPage = 30
): Promise<Repository[]> {
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

    // Check if these repos are in user's starred list
    const starredIds = await fetchUserStarredIds(session);

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
      starred_at: starredIds.has(repo.id) ? new Date().toISOString() : undefined,
      metrics: {
        stars_growth_rate: calculateGrowthRate(repo),
        issues_growth_rate: 0,
        is_trending: isTrending(repo),
      },
      is_following: false,
    }));
  } catch (error) {
    logger.error('Failed to search repositories:', error);
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

    const repos: Array<{ id: number }> = await response.json();
    return new Set(repos.map((repo) => repo.id));
  } catch {
    return new Set();
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
