import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRadar } from '@/hooks/useRadar';
import * as radar from '@/services/radar';
import type { Radar } from '@/types/database';

// Mock the radar service
vi.mock('../../../src/services/radar', () => ({
  getRadar: vi.fn(),
}));

// Helper to create a test QueryClient
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

// Helper to create a mock radar
const createMockRadar = (overrides?: Partial<Radar>): Radar => ({
  id: 'radar-1',
  user_id: 'user-1',
  name: 'Frontend Tools',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  ...overrides,
});

describe('useRadar', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('fetches radar successfully', async () => {
    const mockRadar = createMockRadar();
    vi.mocked(radar.getRadar).mockResolvedValue(mockRadar);

    const { result } = renderHook(() => useRadar({ radarId: 'radar-1' }), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.radar).toEqual(mockRadar);
    expect(result.current.error).toBeNull();
    expect(result.current.isNotFound).toBe(false);
  });

  it('returns isNotFound when radar does not exist', async () => {
    vi.mocked(radar.getRadar).mockResolvedValue(null);

    const { result } = renderHook(() => useRadar({ radarId: 'nonexistent-id' }), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.radar).toBeNull();
    expect(result.current.isNotFound).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('handles fetch error', async () => {
    const error = new Error('Failed to fetch radar');
    vi.mocked(radar.getRadar).mockRejectedValue(error);

    const { result } = renderHook(() => useRadar({ radarId: 'radar-1' }), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(error);
    expect(result.current.radar).toBeNull();
    expect(result.current.isNotFound).toBe(false);
  });

  it('does not fetch when radarId is undefined', () => {
    renderHook(() => useRadar({ radarId: undefined }), { wrapper });
    expect(radar.getRadar).not.toHaveBeenCalled();
  });

  it('does not fetch when enabled is false', () => {
    renderHook(() => useRadar({ radarId: 'radar-1', enabled: false }), { wrapper });
    expect(radar.getRadar).not.toHaveBeenCalled();
  });

  it('exposes refetch function', async () => {
    const mockRadar = createMockRadar({ name: 'Original' });
    vi.mocked(radar.getRadar).mockResolvedValue(mockRadar);

    const { result } = renderHook(() => useRadar({ radarId: 'radar-1' }), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.refetch).toBeInstanceOf(Function);

    const updatedRadar = createMockRadar({ name: 'Updated' });
    vi.mocked(radar.getRadar).mockResolvedValue(updatedRadar);

    result.current.refetch();

    await waitFor(() => {
      expect(result.current.radar?.name).toBe('Updated');
    });
  });
});
