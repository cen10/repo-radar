import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRadarRepositories } from '@/hooks/useRadarRepositories';
import * as radar from '@/services/radar';
import * as github from '@/services/github';
import { TOUR_DEMO_RADAR_ID } from '@/demo/demo-data';
import type { RadarRepo } from '@/types/database';
import { createMockRepository } from '../../mocks/factories';

// Mock the services
vi.mock('@/services/radar', () => ({
  getRadarRepos: vi.fn(),
}));

vi.mock('@/services/github', () => ({
  fetchRepositoriesByIds: vi.fn(),
}));

// Mock github-token service - throws if test doesn't provide a token
vi.mock('@/services/github-token', () => ({
  getValidGitHubToken: (token: string | null) => {
    if (!token) throw new Error('Test setup error: no token provided to mock');
    return token;
  },
  hasFallbackToken: () => false,
}));

// Mock the onboarding context
const mockIsTourActive = vi.fn(() => false);
vi.mock('@/contexts/use-onboarding', () => ({
  useOnboarding: () => ({ isTourActive: mockIsTourActive() }),
}));

// Helper to create a test QueryClient
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

// Helper to create a mock radar repo (junction table entry)
const createMockRadarRepo = (overrides?: Partial<RadarRepo>): RadarRepo => ({
  id: 'radar-repo-1',
  radar_id: 'radar-1',
  github_repo_id: 12345,
  added_at: '2024-01-15T10:00:00Z',
  ...overrides,
});

describe('useRadarRepositories', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('fetches repositories successfully', async () => {
    const mockRadarRepos = [
      createMockRadarRepo({ github_repo_id: 12345 }),
      createMockRadarRepo({ id: 'radar-repo-2', github_repo_id: 67890 }),
    ];
    const mockRepos = [
      createMockRepository({ id: 12345, name: 'repo-1' }),
      createMockRepository({ id: 67890, name: 'repo-2' }),
    ];

    vi.mocked(radar.getRadarRepos).mockResolvedValue(mockRadarRepos);
    vi.mocked(github.fetchRepositoriesByIds).mockResolvedValue(mockRepos);

    const { result } = renderHook(
      () => useRadarRepositories({ radarId: 'radar-1', token: 'test-token' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.repositories).toHaveLength(2);
    expect(result.current.repositories[0].name).toBe('repo-1');
    expect(result.current.error).toBeNull();
    expect(radar.getRadarRepos).toHaveBeenCalledWith('radar-1');
    expect(github.fetchRepositoriesByIds).toHaveBeenCalledWith('test-token', [12345, 67890]);
  });

  it('returns empty array when radar has no repos', async () => {
    vi.mocked(radar.getRadarRepos).mockResolvedValue([]);

    const { result } = renderHook(
      () => useRadarRepositories({ radarId: 'radar-1', token: 'test-token' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.repositories).toEqual([]);
    expect(github.fetchRepositoriesByIds).not.toHaveBeenCalled();
  });

  it('handles fetch error', async () => {
    const error = new Error('Failed to fetch repos');
    vi.mocked(radar.getRadarRepos).mockRejectedValue(error);

    const { result } = renderHook(
      () => useRadarRepositories({ radarId: 'radar-1', token: 'test-token' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(error);
    expect(result.current.repositories).toEqual([]);
  });

  it('does not fetch when radarId is undefined', async () => {
    const { result } = renderHook(
      () => useRadarRepositories({ radarId: undefined, token: 'test-token' }),
      { wrapper }
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.repositories).toEqual([]);
    expect(radar.getRadarRepos).not.toHaveBeenCalled();
  });

  it('does not fetch when token is null', async () => {
    const { result } = renderHook(() => useRadarRepositories({ radarId: 'radar-1', token: null }), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.repositories).toEqual([]);
    expect(radar.getRadarRepos).not.toHaveBeenCalled();
  });

  it('does not fetch when enabled is false', async () => {
    const { result } = renderHook(
      () => useRadarRepositories({ radarId: 'radar-1', token: 'test-token', enabled: false }),
      { wrapper }
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.repositories).toEqual([]);
    expect(radar.getRadarRepos).not.toHaveBeenCalled();
  });

  it('exposes refetch function', async () => {
    const mockRadarRepos = [createMockRadarRepo({ github_repo_id: 12345 })];
    const mockRepos = [createMockRepository({ id: 12345, name: 'Original' })];

    vi.mocked(radar.getRadarRepos).mockResolvedValue(mockRadarRepos);
    vi.mocked(github.fetchRepositoriesByIds).mockResolvedValue(mockRepos);

    const { result } = renderHook(
      () => useRadarRepositories({ radarId: 'radar-1', token: 'test-token' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.refetch).toBeInstanceOf(Function);
  });

  describe('React Ecosystem for authenticated users with no radars', () => {
    it('returns demo repo when viewing React Ecosystem during onboarding tour', async () => {
      mockIsTourActive.mockReturnValue(true);

      const { result } = renderHook(
        () => useRadarRepositories({ radarId: TOUR_DEMO_RADAR_ID, token: null }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should return the demo repo without calling the API
      expect(result.current.repositories).toHaveLength(1);
      expect(result.current.repositories[0].full_name).toBe('facebook/react');
      expect(radar.getRadarRepos).not.toHaveBeenCalled();
      expect(github.fetchRepositoriesByIds).not.toHaveBeenCalled();
    });

    it('does not return demo repo when tour is not active (e.g., direct URL access)', async () => {
      mockIsTourActive.mockReturnValue(false);

      const { result } = renderHook(
        () => useRadarRepositories({ radarId: TOUR_DEMO_RADAR_ID, token: null }),
        { wrapper }
      );

      // Query should be disabled (no token and not tour demo radar)
      expect(result.current.isLoading).toBe(false);
      expect(result.current.repositories).toEqual([]);
    });
  });
});
