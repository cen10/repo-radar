/**
 * Maximum number of starred repositories to fetch for client-side search/sort.
 * This caps parallel API calls to avoid rate limiting and slow performance.
 * Users with more starred repos will see a warning that results may be incomplete.
 */
export const MAX_STARRED_REPOS = 500;
