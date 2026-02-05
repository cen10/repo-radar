import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useRepository } from '@/hooks/useRepository';
import * as github from '@/services/github';
import { createQueryClientWrapper } from '../../helpers/render';
import { createMockRepository } from '../../mocks/factories';

vi.mock('../../../src/services/github', () => ({
  fetchRepositoryById: vi.fn(),
}));

// Mock useAuthErrorHandler since it requires AuthProvider and Router
vi.mock('../../../src/hooks/useAuthErrorHandler', () => ({
  useAuthErrorHandler: vi.fn(),
}));

// Mock github-token service to prevent fallback token usage in tests
vi.mock('../../../src/services/github-token', () => ({
  getValidGitHubToken: (token: string | null) => token,
  hasFallbackToken: () => false,
}));

const TEST_TOKEN = 'test-token';

describe('useRepository', () => {
  let wrapper: ({ children }: { children: ReactNode }) => ReactNode;

  beforeEach(() => {
    const result = createQueryClientWrapper();
    wrapper = result.wrapper;
    vi.clearAllMocks();
  });

  it('fetches repository successfully', async () => {
    const mockRepo = createMockRepository({ id: 12345, name: 'react' });
    vi.mocked(github.fetchRepositoryById).mockResolvedValue(mockRepo);

    const { result } = renderHook(() => useRepository({ repoId: '12345', token: TEST_TOKEN }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.repository).toEqual(mockRepo);
    expect(result.current.error).toBeNull();
    expect(result.current.isNotFound).toBe(false);
    expect(result.current.isInvalidId).toBe(false);
  });

  it('returns isNotFound when repository does not exist', async () => {
    vi.mocked(github.fetchRepositoryById).mockResolvedValue(null);

    const { result } = renderHook(() => useRepository({ repoId: '99999', token: TEST_TOKEN }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.repository).toBeNull();
    expect(result.current.isNotFound).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('handles fetch error', async () => {
    const error = new Error('GitHub API error');
    vi.mocked(github.fetchRepositoryById).mockRejectedValue(error);

    const { result } = renderHook(() => useRepository({ repoId: '12345', token: TEST_TOKEN }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(error);
    expect(result.current.repository).toBeNull();
    expect(result.current.isNotFound).toBe(false);
  });

  it('does not fetch when token is null', () => {
    renderHook(() => useRepository({ repoId: '12345', token: null }), { wrapper });
    expect(github.fetchRepositoryById).not.toHaveBeenCalled();
  });

  it('does not fetch when repoId is undefined', () => {
    renderHook(() => useRepository({ repoId: undefined, token: TEST_TOKEN }), { wrapper });
    expect(github.fetchRepositoryById).not.toHaveBeenCalled();
  });

  it('does not fetch when repoId is not a valid number', () => {
    const { result } = renderHook(() => useRepository({ repoId: 'invalid', token: TEST_TOKEN }), {
      wrapper,
    });
    expect(github.fetchRepositoryById).not.toHaveBeenCalled();
    expect(result.current.isInvalidId).toBe(true);
    expect(result.current.isNotFound).toBe(false);
  });

  it('does not fetch when repoId has trailing non-numeric characters', () => {
    const { result } = renderHook(() => useRepository({ repoId: '12345abc', token: TEST_TOKEN }), {
      wrapper,
    });
    expect(github.fetchRepositoryById).not.toHaveBeenCalled();
    expect(result.current.isInvalidId).toBe(true);
  });

  it.each(['0', '-1', '1.5', 'Infinity'])(
    'treats %s as invalid (not a positive integer)',
    (repoId) => {
      const { result } = renderHook(() => useRepository({ repoId, token: TEST_TOKEN }), {
        wrapper,
      });
      expect(github.fetchRepositoryById).not.toHaveBeenCalled();
      expect(result.current.isInvalidId).toBe(true);
    }
  );

  it('does not fetch when enabled is false', () => {
    renderHook(() => useRepository({ repoId: '12345', token: TEST_TOKEN, enabled: false }), {
      wrapper,
    });
    expect(github.fetchRepositoryById).not.toHaveBeenCalled();
  });

  it('calls fetchRepositoryById with correct params', async () => {
    vi.mocked(github.fetchRepositoryById).mockResolvedValue(createMockRepository());

    renderHook(() => useRepository({ repoId: '12345', token: TEST_TOKEN }), { wrapper });

    await waitFor(() => {
      expect(github.fetchRepositoryById).toHaveBeenCalledWith(TEST_TOKEN, 12345);
    });
  });

  it('exposes refetch function', async () => {
    const mockRepo = createMockRepository({ name: 'original-name' });
    vi.mocked(github.fetchRepositoryById).mockResolvedValue(mockRepo);

    const { result } = renderHook(() => useRepository({ repoId: '12345', token: TEST_TOKEN }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.refetch).toBeInstanceOf(Function);

    const updatedRepo = createMockRepository({ name: 'updated-name' });
    vi.mocked(github.fetchRepositoryById).mockResolvedValue(updatedRepo);

    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.repository?.name).toBe('updated-name');
    });
  });

  it('tracks isRefetching state', async () => {
    const mockRepo = createMockRepository();
    vi.mocked(github.fetchRepositoryById).mockResolvedValue(mockRepo);

    const { result } = renderHook(() => useRepository({ repoId: '12345', token: TEST_TOKEN }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isRefetching).toBe(false);
  });

  it('uses cache on subsequent renders', async () => {
    const mockRepo = createMockRepository();
    vi.mocked(github.fetchRepositoryById).mockResolvedValue(mockRepo);

    const { result, rerender } = renderHook(
      () => useRepository({ repoId: '12345', token: TEST_TOKEN }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(github.fetchRepositoryById).toHaveBeenCalledTimes(1);

    rerender();

    expect(result.current.repository).toEqual(mockRepo);
    expect(github.fetchRepositoryById).toHaveBeenCalledTimes(1);
  });
});
