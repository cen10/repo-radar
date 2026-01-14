import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStarredIds } from './useStarredIds';
import type { Repository } from '../types';

// Helper to create a test QueryClient
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

// Helper to create a mock repository
const createMockRepository = (overrides?: Partial<Repository>): Repository => ({
  id: 1,
  name: 'test-repo',
  full_name: 'user/test-repo',
  owner: {
    login: 'user',
    avatar_url: 'https://example.com/avatar.jpg',
  },
  description: 'Test repository',
  html_url: 'https://github.com/user/test-repo',
  stargazers_count: 100,
  open_issues_count: 5,
  language: 'TypeScript',
  topics: ['react', 'typescript'],
  updated_at: '2024-01-15T10:00:00Z',
  pushed_at: '2024-01-15T10:00:00Z',
  created_at: '2023-01-01T00:00:00Z',
  is_starred: false,
  ...overrides,
});

// Cache data structure used by useAllStarredRepositories
interface AllStarredData {
  repositories: Repository[];
  totalFetched: number;
  totalStarred: number;
}

const TEST_TOKEN = 'test-token';
const QUERY_KEY = ['allStarredRepositories', TEST_TOKEN];

describe('useStarredIds', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.useFakeTimers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const setInitialCache = (data: AllStarredData) => {
    queryClient.setQueryData(QUERY_KEY, data);
  };

  describe('starredIds', () => {
    it('returns empty Set when cache is not populated', () => {
      const { result } = renderHook(() => useStarredIds({ token: TEST_TOKEN }), { wrapper });

      expect(result.current.starredIds).toBeInstanceOf(Set);
      expect(result.current.starredIds.size).toBe(0);
    });

    it('returns correct IDs from cached repositories', () => {
      const repos = [
        createMockRepository({ id: 1 }),
        createMockRepository({ id: 2 }),
        createMockRepository({ id: 3 }),
      ];
      setInitialCache({ repositories: repos, totalFetched: 3, totalStarred: 3 });

      const { result } = renderHook(() => useStarredIds({ token: TEST_TOKEN }), { wrapper });

      expect(result.current.starredIds.size).toBe(3);
      expect(result.current.starredIds.has(1)).toBe(true);
      expect(result.current.starredIds.has(2)).toBe(true);
      expect(result.current.starredIds.has(3)).toBe(true);
      expect(result.current.starredIds.has(999)).toBe(false);
    });

    it('updates when cache changes', () => {
      setInitialCache({
        repositories: [createMockRepository({ id: 1 })],
        totalFetched: 1,
        totalStarred: 1,
      });

      const { result } = renderHook(() => useStarredIds({ token: TEST_TOKEN }), { wrapper });

      expect(result.current.starredIds.size).toBe(1);

      // Update cache directly
      act(() => {
        queryClient.setQueryData<AllStarredData>(QUERY_KEY, {
          repositories: [createMockRepository({ id: 1 }), createMockRepository({ id: 2 })],
          totalFetched: 2,
          totalStarred: 2,
        });
      });

      expect(result.current.starredIds.size).toBe(2);
      expect(result.current.starredIds.has(2)).toBe(true);
    });
  });

  describe('addRepo', () => {
    it('does nothing when cache is not populated', () => {
      const { result } = renderHook(() => useStarredIds({ token: TEST_TOKEN }), { wrapper });

      const newRepo = createMockRepository({ id: 99 });
      act(() => {
        result.current.addRepo(newRepo);
      });

      // Cache should still be empty
      const cacheData = queryClient.getQueryData<AllStarredData>(QUERY_KEY);
      expect(cacheData).toBeUndefined();
    });

    it('adds repo to cache with is_starred set to true', () => {
      setInitialCache({ repositories: [], totalFetched: 0, totalStarred: 0 });

      const { result } = renderHook(() => useStarredIds({ token: TEST_TOKEN }), { wrapper });

      const newRepo = createMockRepository({ id: 99, is_starred: false });
      act(() => {
        result.current.addRepo(newRepo);
      });

      const cacheData = queryClient.getQueryData<AllStarredData>(QUERY_KEY);
      expect(cacheData?.repositories[0].is_starred).toBe(true);
    });

    it('sets starred_at timestamp when adding repo', () => {
      setInitialCache({ repositories: [], totalFetched: 0, totalStarred: 0 });

      const { result } = renderHook(() => useStarredIds({ token: TEST_TOKEN }), { wrapper });

      // Repo from search results - no starred_at
      const newRepo = createMockRepository({ id: 99, starred_at: undefined });

      const now = new Date('2024-06-15T12:00:00Z');
      vi.setSystemTime(now);

      act(() => {
        result.current.addRepo(newRepo);
      });

      const cacheData = queryClient.getQueryData<AllStarredData>(QUERY_KEY);
      expect(cacheData?.repositories[0].starred_at).toBe('2024-06-15T12:00:00.000Z');
    });

    it('increments totalStarred count', () => {
      setInitialCache({ repositories: [], totalFetched: 0, totalStarred: 5 });

      const { result } = renderHook(() => useStarredIds({ token: TEST_TOKEN }), { wrapper });

      act(() => {
        result.current.addRepo(createMockRepository({ id: 99 }));
      });

      const cacheData = queryClient.getQueryData<AllStarredData>(QUERY_KEY);
      expect(cacheData?.totalStarred).toBe(6);
    });

    it('prepends repo to beginning of list', () => {
      const existingRepo = createMockRepository({ id: 1, name: 'existing-repo' });
      setInitialCache({ repositories: [existingRepo], totalFetched: 1, totalStarred: 1 });

      const { result } = renderHook(() => useStarredIds({ token: TEST_TOKEN }), { wrapper });

      const newRepo = createMockRepository({ id: 99, name: 'new-repo' });
      act(() => {
        result.current.addRepo(newRepo);
      });

      const cacheData = queryClient.getQueryData<AllStarredData>(QUERY_KEY);
      expect(cacheData?.repositories[0].id).toBe(99);
      expect(cacheData?.repositories[1].id).toBe(1);
    });

    it('does not add duplicate if repo already exists', () => {
      const existingRepo = createMockRepository({ id: 1 });
      setInitialCache({ repositories: [existingRepo], totalFetched: 1, totalStarred: 1 });

      const { result } = renderHook(() => useStarredIds({ token: TEST_TOKEN }), { wrapper });

      // Try to add same repo again
      act(() => {
        result.current.addRepo(createMockRepository({ id: 1 }));
      });

      const cacheData = queryClient.getQueryData<AllStarredData>(QUERY_KEY);
      expect(cacheData?.repositories.length).toBe(1);
      expect(cacheData?.totalStarred).toBe(1);
    });

    it('updates starredIds Set after adding', () => {
      setInitialCache({ repositories: [], totalFetched: 0, totalStarred: 0 });

      const { result } = renderHook(() => useStarredIds({ token: TEST_TOKEN }), { wrapper });

      expect(result.current.starredIds.has(99)).toBe(false);

      act(() => {
        result.current.addRepo(createMockRepository({ id: 99 }));
      });

      expect(result.current.starredIds.has(99)).toBe(true);
    });
  });

  describe('removeRepo', () => {
    it('does nothing when cache is not populated', () => {
      const { result } = renderHook(() => useStarredIds({ token: TEST_TOKEN }), { wrapper });

      act(() => {
        result.current.removeRepo(createMockRepository({ id: 1 }));
      });

      const cacheData = queryClient.getQueryData<AllStarredData>(QUERY_KEY);
      expect(cacheData).toBeUndefined();
    });

    it('removes repo from cache', () => {
      const repo1 = createMockRepository({ id: 1 });
      const repo2 = createMockRepository({ id: 2 });
      setInitialCache({ repositories: [repo1, repo2], totalFetched: 2, totalStarred: 2 });

      const { result } = renderHook(() => useStarredIds({ token: TEST_TOKEN }), { wrapper });

      act(() => {
        result.current.removeRepo(repo1);
      });

      const cacheData = queryClient.getQueryData<AllStarredData>(QUERY_KEY);
      expect(cacheData?.repositories.length).toBe(1);
      expect(cacheData?.repositories[0].id).toBe(2);
    });

    it('decrements totalStarred count', () => {
      const repo = createMockRepository({ id: 1 });
      setInitialCache({ repositories: [repo], totalFetched: 1, totalStarred: 5 });

      const { result } = renderHook(() => useStarredIds({ token: TEST_TOKEN }), { wrapper });

      act(() => {
        result.current.removeRepo(repo);
      });

      const cacheData = queryClient.getQueryData<AllStarredData>(QUERY_KEY);
      expect(cacheData?.totalStarred).toBe(4);
    });

    it('does not decrement totalStarred below 0', () => {
      const repo = createMockRepository({ id: 1 });
      setInitialCache({ repositories: [repo], totalFetched: 1, totalStarred: 0 });

      const { result } = renderHook(() => useStarredIds({ token: TEST_TOKEN }), { wrapper });

      act(() => {
        result.current.removeRepo(repo);
      });

      const cacheData = queryClient.getQueryData<AllStarredData>(QUERY_KEY);
      expect(cacheData?.totalStarred).toBe(0);
    });

    it('updates starredIds Set after removing', () => {
      const repo = createMockRepository({ id: 1 });
      setInitialCache({ repositories: [repo], totalFetched: 1, totalStarred: 1 });

      const { result } = renderHook(() => useStarredIds({ token: TEST_TOKEN }), { wrapper });

      expect(result.current.starredIds.has(1)).toBe(true);

      act(() => {
        result.current.removeRepo(repo);
      });

      expect(result.current.starredIds.has(1)).toBe(false);
    });

    it('handles removing non-existent repo gracefully', () => {
      const repo1 = createMockRepository({ id: 1 });
      setInitialCache({ repositories: [repo1], totalFetched: 1, totalStarred: 1 });

      const { result } = renderHook(() => useStarredIds({ token: TEST_TOKEN }), { wrapper });

      // Try to remove a repo that doesn't exist in cache
      act(() => {
        result.current.removeRepo(createMockRepository({ id: 999 }));
      });

      const cacheData = queryClient.getQueryData<AllStarredData>(QUERY_KEY);
      // totalStarred still decrements (by design - Math.max prevents negative)
      expect(cacheData?.repositories.length).toBe(1);
      expect(cacheData?.totalStarred).toBe(0);
    });
  });
});
