import { useQuery } from '@tanstack/react-query';
import { getRadars } from '../services/radar';
import { useDemoMode } from '../demo/use-demo-mode';
import { useOnboarding } from '../contexts/use-onboarding';
import { getTourDemoRadar } from '../demo/demo-data';
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
  const { isDemoMode } = useDemoMode();

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['radars'],
    queryFn: getRadars,
    enabled,
  });

  // During the tour, show only the React Ecosystem radar (for both demo and authenticated users)
  const shouldUseTourRadar = isTourActive && (isDemoMode || (data?.length ?? 0) === 0);

  const radars = shouldUseTourRadar ? [getTourDemoRadar()] : (data ?? []);

  return {
    radars,
    isLoading,
    isFetching,
    error: error as Error | null,
    refetch,
  };
}
