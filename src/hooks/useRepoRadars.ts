import { useQuery } from '@tanstack/react-query';
import { getRadarsContainingRepo } from '../services/radar';

interface UseRepoRadarsOptions {
  enabled?: boolean;
}

interface UseRepoRadarsReturn {
  radarsAlreadyContainingRepo: string[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook for fetching which radars contain a specific repository.
 *
 * Uses Supabase RLS for user scoping, so no token parameter is needed.
 *
 * @param githubRepoId - The GitHub repository ID to check
 * @param options.enabled - Whether to enable the query (default true)
 */
export function useRepoRadars(
  githubRepoId: number,
  { enabled = true }: UseRepoRadarsOptions = {}
): UseRepoRadarsReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['repo-radars', githubRepoId],
    queryFn: () => getRadarsContainingRepo(githubRepoId),
    enabled,
  });

  return {
    radarsAlreadyContainingRepo: data ?? [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
