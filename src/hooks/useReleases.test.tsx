import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useReleases } from './useReleases';
import * as github from '../services/github';
import type { Release } from '../types';

// Mock the github service
vi.mock('../services/github', () => ({
  fetchRepositoryReleases: vi.fn(),
}));

// Mock the logger to silence test output
vi.mock('../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Helper to create a test QueryClient
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

// Helper to create a mock release
const createMockRelease = (overrides?: Partial<Release>): Release => ({
  id: 1,
  tag_name: 'v1.0.0',
  name: 'Version 1.0.0',
  body: 'Release notes for v1.0.0',
  html_url: 'https://github.com/owner/repo/releases/tag/v1.0.0',
  published_at: '2024-01-15T10:00:00Z',
  created_at: '2024-01-15T09:00:00Z',
  prerelease: false,
  draft: false,
  author: {
    login: 'releaser',
    avatar_url: 'https://example.com/avatar.jpg',
  },
  ...overrides,
});

const TEST_TOKEN = 'test-token';

describe('useReleases', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('fetches releases successfully', async () => {
    const mockReleases = [
      createMockRelease({ id: 1, tag_name: 'v1.2.0' }),
      createMockRelease({ id: 2, tag_name: 'v1.1.0' }),
    ];

    vi.mocked(github.fetchRepositoryReleases).mockResolvedValue(mockReleases);

    const { result } = renderHook(
      () => useReleases({ token: TEST_TOKEN, owner: 'facebook', repo: 'react' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.releases).toHaveLength(2);
    expect(result.current.releases[0].tag_name).toBe('v1.2.0');
    expect(result.current.error).toBeNull();
  });

  it('returns empty array when no releases', async () => {
    vi.mocked(github.fetchRepositoryReleases).mockResolvedValue([]);

    const { result } = renderHook(
      () => useReleases({ token: TEST_TOKEN, owner: 'owner', repo: 'empty-repo' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.releases).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('handles fetch error', async () => {
    const error = new Error('GitHub API error');
    vi.mocked(github.fetchRepositoryReleases).mockRejectedValue(error);

    const { result } = renderHook(
      () => useReleases({ token: TEST_TOKEN, owner: 'owner', repo: 'repo' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(error);
    expect(result.current.releases).toEqual([]);
  });

  it('does not fetch when token is null', async () => {
    const { result } = renderHook(
      () => useReleases({ token: null, owner: 'owner', repo: 'repo' }),
      { wrapper }
    );

    // Should not be loading because query is disabled
    expect(result.current.isLoading).toBe(false);
    expect(result.current.releases).toEqual([]);
    expect(github.fetchRepositoryReleases).not.toHaveBeenCalled();
  });

  it('does not fetch when enabled is false', async () => {
    const { result } = renderHook(
      () => useReleases({ token: TEST_TOKEN, owner: 'owner', repo: 'repo', enabled: false }),
      { wrapper }
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.releases).toEqual([]);
    expect(github.fetchRepositoryReleases).not.toHaveBeenCalled();
  });

  it('does not fetch when owner is empty', async () => {
    const { result } = renderHook(
      () => useReleases({ token: TEST_TOKEN, owner: '', repo: 'repo' }),
      { wrapper }
    );

    expect(result.current.isLoading).toBe(false);
    expect(github.fetchRepositoryReleases).not.toHaveBeenCalled();
  });

  it('does not fetch when repo is empty', async () => {
    const { result } = renderHook(
      () => useReleases({ token: TEST_TOKEN, owner: 'owner', repo: '' }),
      { wrapper }
    );

    expect(result.current.isLoading).toBe(false);
    expect(github.fetchRepositoryReleases).not.toHaveBeenCalled();
  });

  it('passes custom perPage to fetch function', async () => {
    vi.mocked(github.fetchRepositoryReleases).mockResolvedValue([]);

    renderHook(() => useReleases({ token: TEST_TOKEN, owner: 'owner', repo: 'repo', perPage: 5 }), {
      wrapper,
    });

    await waitFor(() => {
      expect(github.fetchRepositoryReleases).toHaveBeenCalledWith(TEST_TOKEN, 'owner', 'repo', 5);
    });
  });

  it('uses cache on subsequent renders', async () => {
    const mockReleases = [createMockRelease()];
    vi.mocked(github.fetchRepositoryReleases).mockResolvedValue(mockReleases);

    // First render
    const { result, rerender } = renderHook(
      () => useReleases({ token: TEST_TOKEN, owner: 'owner', repo: 'repo' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(github.fetchRepositoryReleases).toHaveBeenCalledTimes(1);

    // Rerender
    rerender();

    // Should still have data and not refetch
    expect(result.current.releases).toHaveLength(1);
    expect(github.fetchRepositoryReleases).toHaveBeenCalledTimes(1);
  });

  it('exposes refetch function', async () => {
    const mockReleases = [createMockRelease({ tag_name: 'v1.0.0' })];
    vi.mocked(github.fetchRepositoryReleases).mockResolvedValue(mockReleases);

    const { result } = renderHook(
      () => useReleases({ token: TEST_TOKEN, owner: 'owner', repo: 'repo' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.refetch).toBeInstanceOf(Function);

    // Update mock to return new data
    const newReleases = [createMockRelease({ tag_name: 'v2.0.0' })];
    vi.mocked(github.fetchRepositoryReleases).mockResolvedValue(newReleases);

    // Trigger refetch
    result.current.refetch();

    await waitFor(() => {
      expect(result.current.releases[0].tag_name).toBe('v2.0.0');
    });
  });
});
