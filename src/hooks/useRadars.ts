import { useQuery } from '@tanstack/react-query';
import { getRadars } from '../services/radar';
import type { RadarWithCount } from '../types/database';

interface UseRadarsOptions {
  enabled?: boolean;
}

interface UseRadarsReturn {
  radars: RadarWithCount[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook for fetching user radars.
 *
 * Uses Supabase RLS for user scoping, so no token parameter is needed.
 * Returns radars with repo_count included.
 *
 * @param options.enabled - Whether to enable the query (default true)
 */
export function useRadars({ enabled = true }: UseRadarsOptions = {}): UseRadarsReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['radars'],
    queryFn: getRadars,
    enabled,
  });

  return {
    radars: data ?? [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
