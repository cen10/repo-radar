import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useReleases } from '@/hooks/useReleases';
import * as github from '@/services/github';
import { createQueryClientWrapper } from '../../helpers/render';
import { createMockRelease } from '../../mocks/factories';

// Mock the github service
vi.mock('@/services/github', () => ({
  fetchRepositoryReleases: vi.fn(),
}));

// Mock useAuthErrorHandler since it requires AuthProvider and Router
vi.mock('@/hooks/useAuthErrorHandler', () => ({
  useAuthErrorHandler: vi.fn(),
}));

// Mock github-token service to prevent fallback token usage in tests
vi.mock('@/services/github-token', () => ({
  getValidGitHubToken: (token: string | null) => token,
  hasFallbackToken: () => false,
}));

const TEST_TOKEN = 'test-token';

describe('useReleases', () => {
  let wrapper: ({ children }: { children: ReactNode }) => ReactNode;

  beforeEach(() => {
    const result = createQueryClientWrapper();
    wrapper = result.wrapper;
    vi.clearAllMocks();
  });

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

  it('calls fetchRepositoryReleases with correct params', async () => {
    vi.mocked(github.fetchRepositoryReleases).mockResolvedValue([]);

    renderHook(() => useReleases({ token: TEST_TOKEN, owner: 'owner', repo: 'repo' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(github.fetchRepositoryReleases).toHaveBeenCalledWith(TEST_TOKEN, 'owner', 'repo');
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
