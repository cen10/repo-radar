import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getRepoCache,
  getCacheETag,
  isCacheValid,
  setRepoCache,
  refreshCacheTimestamp,
  cleanupExpiredCache,
  CACHE_CONFIG,
} from './cache';

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Supabase client
const mockFrom = vi.fn();

vi.mock('./supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Factory function for mock cache entries
function createMockCacheEntry(
  overrides: Partial<{
    github_repo_id: number;
    cached_data: unknown;
    etag: string | null;
    fetched_at: string;
    expires_at: string;
  }> = {}
) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

  return {
    github_repo_id: 12345,
    cached_data: { id: 12345, name: 'test-repo', stargazers_count: 100 },
    etag: '"abc123"',
    fetched_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    ...overrides,
  };
}

describe('Cache Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRepoCache', () => {
    it('should return cached data when valid cache exists', async () => {
      const mockCache = createMockCacheEntry();

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockCache, error: null }),
            }),
          }),
        }),
      });

      const result = await getRepoCache(12345);

      expect(mockFrom).toHaveBeenCalledWith('repo_cache');
      expect(result).toMatchObject({
        github_repo_id: 12345,
        etag: '"abc123"',
      });
    });

    it('should return null when no cache exists', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
        }),
      });

      const result = await getRepoCache(12345);
      expect(result).toBeNull();
    });

    it('should return null when cache is expired', async () => {
      // The query filters by expires_at > now, so expired entries return PGRST116
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
        }),
      });

      const result = await getRepoCache(12345);
      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
              }),
            }),
          }),
        }),
      });

      await expect(getRepoCache(12345)).rejects.toThrow('Failed to fetch repo cache');
    });
  });

  describe('getCacheETag', () => {
    it('should return ETag when cache exists', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { etag: '"abc123"' },
              error: null,
            }),
          }),
        }),
      });

      const result = await getCacheETag(12345);
      expect(result).toBe('"abc123"');
    });

    it('should return null when no cache exists', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      });

      const result = await getCacheETag(12345);
      expect(result).toBeNull();
    });

    it('should return null when ETag is not set', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { etag: null },
              error: null,
            }),
          }),
        }),
      });

      const result = await getCacheETag(12345);
      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      await expect(getCacheETag(12345)).rejects.toThrow('Failed to fetch cache ETag');
    });
  });

  describe('isCacheValid', () => {
    it('should return true when valid cache exists', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockResolvedValue({ count: 1, error: null }),
          }),
        }),
      });

      const result = await isCacheValid(12345);
      expect(result).toBe(true);
    });

    it('should return false when no cache exists', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        }),
      });

      const result = await isCacheValid(12345);
      expect(result).toBe(false);
    });

    it('should return false when count is null', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockResolvedValue({ count: null, error: null }),
          }),
        }),
      });

      const result = await isCacheValid(12345);
      expect(result).toBe(false);
    });

    it('should throw error on database failure', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockResolvedValue({
              count: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      await expect(isCacheValid(12345)).rejects.toThrow('Failed to check cache validity');
    });
  });

  describe('setRepoCache', () => {
    it('should create a new cache entry', async () => {
      const mockCache = createMockCacheEntry();

      mockFrom.mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockCache, error: null }),
          }),
        }),
      });

      const result = await setRepoCache(12345, { name: 'test-repo' }, '"abc123"');

      expect(mockFrom).toHaveBeenCalledWith('repo_cache');
      expect(result).toMatchObject({ github_repo_id: 12345 });
    });

    it('should handle null ETag', async () => {
      const mockCache = createMockCacheEntry({ etag: null });

      mockFrom.mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockCache, error: null }),
          }),
        }),
      });

      const result = await setRepoCache(12345, { name: 'test-repo' });

      expect(result.etag).toBeNull();
    });

    it('should throw error on database failure', async () => {
      mockFrom.mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      await expect(setRepoCache(12345, { name: 'test-repo' })).rejects.toThrow(
        'Failed to set repo cache'
      );
    });
  });

  describe('refreshCacheTimestamp', () => {
    it('should update timestamp without changing data', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      await expect(refreshCacheTimestamp(12345)).resolves.not.toThrow();
      expect(mockFrom).toHaveBeenCalledWith('repo_cache');
    });

    it('should throw error on database failure', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Database error' } }),
        }),
      });

      await expect(refreshCacheTimestamp(12345)).rejects.toThrow(
        'Failed to refresh cache timestamp'
      );
    });
  });

  describe('cleanupExpiredCache', () => {
    it('should delete expired entries and return count', async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: [{ github_repo_id: 111 }, { github_repo_id: 222 }, { github_repo_id: 333 }],
              error: null,
            }),
          }),
        }),
      });

      const result = await cleanupExpiredCache();

      expect(mockFrom).toHaveBeenCalledWith('repo_cache');
      expect(result).toBe(3);
    });

    it('should return 0 when no entries to clean up', async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      const result = await cleanupExpiredCache();
      expect(result).toBe(0);
    });

    it('should return 0 when data is null', async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const result = await cleanupExpiredCache();
      expect(result).toBe(0);
    });

    it('should throw error on database failure', async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      await expect(cleanupExpiredCache()).rejects.toThrow('Failed to cleanup expired cache');
    });
  });

  describe('CACHE_CONFIG', () => {
    it('should have correct default TTL', () => {
      expect(CACHE_CONFIG.DEFAULT_TTL_HOURS).toBe(24);
    });

    it('should have correct cleanup retention period', () => {
      expect(CACHE_CONFIG.CLEANUP_AFTER_DAYS).toBe(7);
    });
  });
});
