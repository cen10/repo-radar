import { useQuery } from '@tanstack/react-query';
import { fetchIssueCount } from '../services/github';
import { getValidGitHubToken, hasFallbackToken } from '../services/github-token';
import { useAuthErrorHandler } from './useAuthErrorHandler';

interface UseIssueCountOptions {
  owner: string | undefined;
  repo: string | undefined;
  token: string | null;
  enabled?: boolean;
}

interface UseIssueCountReturn {
  issueCount: number | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook for fetching the actual open issue count for a repository.
 * Uses GitHub Search API to get issues only (excludes PRs).
 *
 * @param options.owner - Repository owner
 * @param options.repo - Repository name
 * @param options.token - GitHub access token
 * @param options.enabled - Whether to enable the query (default true)
 */
export function useIssueCount({
  owner,
  repo,
  token,
  enabled = true,
}: UseIssueCountOptions): UseIssueCountReturn {
  const { data, isLoading, error } = useQuery<number | null, Error>({
    queryKey: ['issueCount', owner, repo],
    queryFn: () => {
      const validToken = getValidGitHubToken(token);
      return fetchIssueCount(validToken, owner!, repo!);
    },
    enabled: enabled && (!!token || hasFallbackToken()) && !!owner && !!repo,
    // Cache for 5 minutes since this is an extra API call
    staleTime: 5 * 60 * 1000,
  });

  useAuthErrorHandler(error, 'useIssueCount');

  return {
    issueCount: data ?? null,
    isLoading,
    error,
  };
}
