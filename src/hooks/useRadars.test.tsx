import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRadars } from './useRadars';
import * as radar from '../services/radar';
import type { RadarWithCount } from '../types/database';

// Mock the radar service
vi.mock('../services/radar', () => ({
  getRadars: vi.fn(),
}));

// Helper to create a test QueryClient
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

// Helper to create a mock radar
const createMockRadar = (overrides?: Partial<RadarWithCount>): RadarWithCount => ({
  id: 'radar-1',
  user_id: 'user-1',
  name: 'Frontend',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  repo_count: 5,
  ...overrides,
});

describe('useRadars', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('fetches radars successfully', async () => {
    const mockRadars = [
      createMockRadar({ id: 'radar-1', name: 'Frontend', repo_count: 5 }),
      createMockRadar({ id: 'radar-2', name: 'Backend', repo_count: 3 }),
    ];

    vi.mocked(radar.getRadars).mockResolvedValue(mockRadars);

    const { result } = renderHook(() => useRadars(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.radars).toHaveLength(2);
    expect(result.current.radars[0].name).toBe('Frontend');
    expect(result.current.radars[0].repo_count).toBe(5);
    expect(result.current.error).toBeNull();
  });

  it('returns empty array when no radars', async () => {
    vi.mocked(radar.getRadars).mockResolvedValue([]);

    const { result } = renderHook(() => useRadars(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.radars).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('handles fetch error', async () => {
    const error = new Error('Failed to fetch radars');
    vi.mocked(radar.getRadars).mockRejectedValue(error);

    const { result } = renderHook(() => useRadars(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(error);
    expect(result.current.radars).toEqual([]);
  });

  it('does not fetch when enabled is false', async () => {
    const { result } = renderHook(() => useRadars({ enabled: false }), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.radars).toEqual([]);
    expect(radar.getRadars).not.toHaveBeenCalled();
  });

  it('uses cache on subsequent renders', async () => {
    const mockRadars = [createMockRadar()];
    vi.mocked(radar.getRadars).mockResolvedValue(mockRadars);

    const { result, rerender } = renderHook(() => useRadars(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(radar.getRadars).toHaveBeenCalledTimes(1);

    rerender();

    expect(result.current.radars).toHaveLength(1);
    expect(radar.getRadars).toHaveBeenCalledTimes(1);
  });

  it('exposes refetch function', async () => {
    const mockRadars = [createMockRadar({ name: 'Original' })];
    vi.mocked(radar.getRadars).mockResolvedValue(mockRadars);

    const { result } = renderHook(() => useRadars(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.refetch).toBeInstanceOf(Function);

    const newRadars = [createMockRadar({ name: 'Updated' })];
    vi.mocked(radar.getRadars).mockResolvedValue(newRadars);

    result.current.refetch();

    await waitFor(() => {
      expect(result.current.radars[0].name).toBe('Updated');
    });
  });
});
