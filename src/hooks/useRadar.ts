import { useQuery } from '@tanstack/react-query';
import { getRadar } from '../services/radar';
import type { Radar } from '../types/database';

interface UseRadarOptions {
  radarId: string | undefined;
  enabled?: boolean;
}

interface UseRadarReturn {
  radar: Radar | null;
  isLoading: boolean;
  error: Error | null;
  isNotFound: boolean;
  refetch: () => void;
}

/**
 * Hook for fetching a single radar by ID.
 *
 * Uses Supabase RLS for user scoping, so no token parameter is needed.
 * Returns isNotFound: true when the radar doesn't exist (not an error state).
 *
 * @param options.radarId - The radar ID to fetch
 * @param options.enabled - Whether to enable the query (default true)
 */
export function useRadar({ radarId, enabled = true }: UseRadarOptions): UseRadarReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['radar', radarId],
    queryFn: () => {
      if (!radarId) {
        return null;
      }
      return getRadar(radarId);
    },
    enabled: enabled && !!radarId,
  });

  return {
    radar: data ?? null,
    isLoading,
    error: error as Error | null,
    isNotFound: !isLoading && !error && data === null && !!radarId,
    refetch,
  };
}
