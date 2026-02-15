import { useQuery } from '@tanstack/react-query';
import { getRadars } from '../services/radar';
import { useOnboarding } from '../contexts/use-onboarding';
import { getTourRadar } from '../demo/tour-data';
import type { RadarWithCount } from '../types/database';

interface UseRadarsOptions {
  enabled?: boolean;
}

interface UseRadarsReturn {
  radars: RadarWithCount[];
  isLoading: boolean;
  isFetching: boolean;
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
  const { isTourActive } = useOnboarding();

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['radars'],
    queryFn: getRadars,
    enabled,
  });

  // During the tour, show tour radar only when user has no real radars
  const shouldUseTourRadar = isTourActive && (data?.length ?? 0) === 0;
  const radars = shouldUseTourRadar ? [getTourRadar()] : (data ?? []);

  return {
    radars,
    isLoading,
    isFetching,
    error: error as Error | null,
    refetch,
  };
}
