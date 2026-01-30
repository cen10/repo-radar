import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStarredIds } from './useStarredIds';
import type { AllStarredData } from '../types';
import { createTestQueryClient } from '../test/helpers/query-client';
import { createMockRepository } from '../test/mocks/factories';

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
});
