/**
 * Pagination calculation utility for handling different data sources
 */

export interface PaginationInfo {
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startIndex: number;
  endIndex: number;
  totalItems: number;
}

/**
 * Calculate pagination info for any data source
 * @param totalItems - Total number of items available
 * @param currentPage - Current page number (1-indexed)
 * @param itemsPerPage - Number of items per page
 * @returns Pagination information object
 */
export function calculatePagination(
  totalItems: number,
  currentPage: number,
  itemsPerPage: number
): PaginationInfo {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  return {
    totalPages,
    currentPage,
    hasNextPage,
    hasPreviousPage,
    startIndex,
    endIndex,
    totalItems,
  };
}

/**
 * Calculate pagination for GitHub search results (capped at 1000 results)
 * @param totalCount - Total count from GitHub API response
 * @param currentPage - Current page number (1-indexed)
 * @param itemsPerPage - Number of items per page
 * @returns Pagination information with GitHub API limitations applied
 */
export function calculateGitHubSearchPagination(
  totalCount: number,
  currentPage: number,
  itemsPerPage: number
): PaginationInfo & { effectiveTotal: number; isLimited: boolean } {
  const GITHUB_SEARCH_LIMIT = 1000;
  const effectiveTotal = Math.min(totalCount, GITHUB_SEARCH_LIMIT);
  const isLimited = totalCount > GITHUB_SEARCH_LIMIT;

  const paginationInfo = calculatePagination(effectiveTotal, currentPage, itemsPerPage);

  return {
    ...paginationInfo,
    effectiveTotal,
    isLimited,
  };
}

/**
 * Format pagination display text
 * @param pagination - Pagination info object
 * @param currentItemCount - Number of items currently shown
 * @returns Formatted display text
 */
export function formatPaginationText(pagination: PaginationInfo, currentItemCount: number): string {
  if (pagination.totalItems === 0) {
    return 'No results';
  }

  const start = pagination.startIndex + 1;
  const end = pagination.startIndex + currentItemCount;

  return `Showing ${start}-${end} of ${pagination.totalItems} results`;
}

/**
 * Format GitHub search pagination text with API limitations
 * @param pagination - GitHub search pagination info
 * @param currentItemCount - Number of items currently shown
 * @param totalCount - Original total count from API
 * @returns Formatted display text
 */
export function formatGitHubSearchText(
  pagination: PaginationInfo & { effectiveTotal: number; isLimited: boolean },
  currentItemCount: number,
  totalCount: number
): string {
  if (pagination.totalItems === 0) {
    return 'No results found';
  }

  const start = pagination.startIndex + 1;
  const end = pagination.startIndex + currentItemCount;

  if (pagination.isLimited) {
    return `Showing top ${pagination.effectiveTotal} results of ${totalCount.toLocaleString()} matches`;
  }

  return `Showing ${start}-${end} of ${pagination.totalItems} results`;
}
