import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRepoRadars } from '@/hooks/useRepoRadars';
import * as radar from '@/services/radar';

vi.mock('@/services/radar', () => ({
  getRadarsContainingRepo: vi.fn(),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

describe('useRepoRadars', () => {
  let queryClient: QueryClient;
  const testRepoId = 12345;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('returns radar IDs when repo is in radars', async () => {
    const mockRadarIds = ['radar-1', 'radar-2'];
    vi.mocked(radar.getRadarsContainingRepo).mockResolvedValue(mockRadarIds);

    const { result } = renderHook(() => useRepoRadars(testRepoId), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.radarIds).toEqual(['radar-1', 'radar-2']);
    expect(result.current.error).toBeNull();
    expect(radar.getRadarsContainingRepo).toHaveBeenCalledWith(testRepoId);
  });

  it('returns empty array when repo not in any radar', async () => {
    vi.mocked(radar.getRadarsContainingRepo).mockResolvedValue([]);

    const { result } = renderHook(() => useRepoRadars(testRepoId), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.radarIds).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('handles loading state', () => {
    vi.mocked(radar.getRadarsContainingRepo).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useRepoRadars(testRepoId), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.radarIds).toEqual([]);
  });

  it('handles error state', async () => {
    const error = new Error('Failed to check repo radar membership');
    vi.mocked(radar.getRadarsContainingRepo).mockRejectedValue(error);

    const { result } = renderHook(() => useRepoRadars(testRepoId), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(error);
    expect(result.current.radarIds).toEqual([]);
  });

  it('does not fetch when enabled is false', async () => {
    const { result } = renderHook(() => useRepoRadars(testRepoId, { enabled: false }), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.radarIds).toEqual([]);
    expect(radar.getRadarsContainingRepo).not.toHaveBeenCalled();
  });

  it('uses different cache keys for different repo IDs', async () => {
    vi.mocked(radar.getRadarsContainingRepo).mockResolvedValue(['radar-1']);

    const { result: result1 } = renderHook(() => useRepoRadars(111), { wrapper });
    const { result: result2 } = renderHook(() => useRepoRadars(222), { wrapper });

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
      expect(result2.current.isLoading).toBe(false);
    });

    expect(radar.getRadarsContainingRepo).toHaveBeenCalledWith(111);
    expect(radar.getRadarsContainingRepo).toHaveBeenCalledWith(222);
    expect(radar.getRadarsContainingRepo).toHaveBeenCalledTimes(2);
  });

  it('exposes refetch function', async () => {
    vi.mocked(radar.getRadarsContainingRepo).mockResolvedValue(['radar-1']);

    const { result } = renderHook(() => useRepoRadars(testRepoId), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.refetch).toBeInstanceOf(Function);

    vi.mocked(radar.getRadarsContainingRepo).mockResolvedValue(['radar-1', 'radar-2']);
    result.current.refetch();

    await waitFor(() => {
      expect(result.current.radarIds).toEqual(['radar-1', 'radar-2']);
    });
  });
});
