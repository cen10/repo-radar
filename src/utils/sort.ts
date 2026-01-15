/**
 * Sorting utilities for repository lists.
 *
 * These utilities provide comparator functions and sorting helpers
 * for Repository arrays. They can be used with Array.sort() directly
 * or via the provided convenience functions.
 */

import type { Repository } from '../types';

export type SortDirection = 'asc' | 'desc';

export type SortField = 'name' | 'stars' | 'updated' | 'created' | 'growth_rate' | 'issues';

/**
 * Create a comparator function for sorting repositories by a given field.
 *
 * @param field - The field to sort by
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns Comparator function for use with Array.sort()
 *
 * @example
 * repos.sort(createRepositoryComparator('stars', 'desc'))
 */
export function createRepositoryComparator(
  field: SortField,
  direction: SortDirection = 'desc'
): (a: Repository, b: Repository) => number {
  const multiplier = direction === 'asc' ? 1 : -1;

  return (a: Repository, b: Repository): number => {
    switch (field) {
      case 'name':
        return multiplier * a.full_name.localeCompare(b.full_name);

      case 'stars':
        return multiplier * (a.stargazers_count - b.stargazers_count);

      case 'updated':
        return multiplier * compareISODates(a.updated_at, b.updated_at);

      case 'created':
        return multiplier * compareISODates(a.created_at, b.created_at);

      case 'growth_rate': {
        const aRate = a.metrics?.stars_growth_rate ?? 0;
        const bRate = b.metrics?.stars_growth_rate ?? 0;
        return multiplier * (aRate - bRate);
      }

      case 'issues':
        return multiplier * (a.open_issues_count - b.open_issues_count);

      default:
        return 0;
    }
  };
}

/**
 * Sort repositories by the specified field and direction.
 *
 * Creates a new sorted array without mutating the original.
 *
 * @param repos - Array of repositories to sort
 * @param field - Field to sort by
 * @param direction - Sort direction
 * @returns New sorted array
 *
 * @example
 * const sorted = sortRepositories(repos, 'stars', 'desc')
 */
export function sortRepositories(
  repos: Repository[],
  field: SortField,
  direction: SortDirection = 'desc'
): Repository[] {
  return [...repos].sort(createRepositoryComparator(field, direction));
}

/**
 * Sort repositories by star count (highest first by default).
 *
 * @param repos - Array of repositories
 * @param direction - Sort direction (default: 'desc')
 * @returns New sorted array
 */
export function sortByStars(repos: Repository[], direction: SortDirection = 'desc'): Repository[] {
  return sortRepositories(repos, 'stars', direction);
}

/**
 * Sort repositories alphabetically by full name.
 *
 * @param repos - Array of repositories
 * @param direction - Sort direction (default: 'asc')
 * @returns New sorted array
 */
export function sortByName(repos: Repository[], direction: SortDirection = 'asc'): Repository[] {
  return sortRepositories(repos, 'name', direction);
}

/**
 * Sort repositories by growth rate (highest first by default).
 *
 * Repositories without metrics are treated as having 0 growth.
 *
 * @param repos - Array of repositories
 * @param direction - Sort direction (default: 'desc')
 * @returns New sorted array
 */
export function sortByGrowthRate(
  repos: Repository[],
  direction: SortDirection = 'desc'
): Repository[] {
  return sortRepositories(repos, 'growth_rate', direction);
}

/**
 * Sort repositories by last updated date (most recent first by default).
 *
 * @param repos - Array of repositories
 * @param direction - Sort direction (default: 'desc')
 * @returns New sorted array
 */
export function sortByUpdated(
  repos: Repository[],
  direction: SortDirection = 'desc'
): Repository[] {
  return sortRepositories(repos, 'updated', direction);
}

/**
 * Compare two ISO date strings.
 *
 * @param dateA - First ISO date string
 * @param dateB - Second ISO date string
 * @returns Negative if a < b, positive if a > b, 0 if equal
 */
function compareISODates(dateA: string, dateB: string): number {
  return new Date(dateA).getTime() - new Date(dateB).getTime();
}
