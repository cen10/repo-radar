import { useQuery } from '@tanstack/react-query';
import { getRadars } from '../services/radar';
import { useOnboarding } from '../contexts/use-onboarding';
import { getTourRadar, TOUR_RADAR_ID } from '../demo/tour-data';
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

  // During the tour, prepend tour-demo-radar so backTo navigation works.
  // Skip if already present (e.g., demo mode includes it in the fetched data).
  const baseRadars = data ?? [];
  const hasTourRadar = baseRadars.some((r) => r.id === TOUR_RADAR_ID);
  const radars = isTourActive && !hasTourRadar ? [getTourRadar(), ...baseRadars] : baseRadars;

  return {
    radars,
    isLoading,
    isFetching,
    error: error as Error | null,
    refetch,
  };
}
