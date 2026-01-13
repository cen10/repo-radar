import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchAllStarredRepositories,
  fetchStarredRepositories,
  searchRepositories,
  fetchRateLimit,
} from './github';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Helper to create mock GitHub API starred repo response (star+json format)
interface MockStarredRepoOptions {
  id?: number;
  name?: string;
  description?: string;
  stargazers_count?: number;
  open_issues_count?: number;
  language?: string;
  topics?: string[];
  starred_at?: string;
}

const createMockStarredRepo = (options: MockStarredRepoOptions = {}) => ({
  starred_at: options.starred_at ?? '2024-01-15T10:00:00Z',
  repo: {
    id: options.id ?? 1,
    name: options.name ?? 'test-repo',
    full_name: `user/${options.name ?? 'test-repo'}`,
    owner: {
      login: 'user',
      avatar_url: 'https://example.com/avatar.jpg',
    },
    description: options.description ?? 'Test repository',
    html_url: `https://github.com/user/${options.name ?? 'test-repo'}`,
    stargazers_count: options.stargazers_count ?? 100,
    open_issues_count: options.open_issues_count ?? 5,
    language: options.language ?? 'TypeScript',
    topics: options.topics ?? ['testing'],
    updated_at: '2024-01-01T00:00:00Z',
    pushed_at: '2024-01-01T00:00:00Z',
    created_at: '2023-01-01T00:00:00Z',
  },
});

// Helper to create mock GitHub API search result item
const createMockSearchResultItem = (options: MockStarredRepoOptions = {}) => ({
  id: options.id ?? 1,
  name: options.name ?? 'test-repo',
  full_name: `user/${options.name ?? 'test-repo'}`,
  owner: {
    login: 'user',
    avatar_url: 'https://example.com/avatar.jpg',
  },
  description: options.description ?? 'Test repository',
  html_url: `https://github.com/user/${options.name ?? 'test-repo'}`,
  stargazers_count: options.stargazers_count ?? 100,
  open_issues_count: options.open_issues_count ?? 5,
  language: options.language ?? 'TypeScript',
  topics: options.topics ?? ['testing'],
  updated_at: '2024-01-01T00:00:00Z',
  pushed_at: '2024-01-01T00:00:00Z',
  created_at: '2023-01-01T00:00:00Z',
});

describe('GitHub API Service', () => {
  const testToken = 'test-github-token';

  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchStarredRepositories', () => {
    it('should fetch starred repositories successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [createMockStarredRepo()],
        headers: new Headers(),
      });

      const result = await fetchStarredRepositories(testToken);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.github.com/user/starred'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-github-token',
            Accept: 'application/vnd.github.star+json',
          }),
        })
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 1,
        name: 'test-repo',
        full_name: 'user/test-repo',
        starred_at: '2024-01-15T10:00:00Z',
        metrics: expect.objectContaining({
          stars_growth_rate: expect.any(Number),
          is_trending: expect.any(Boolean),
        }),
      });
    });

    it('should handle 401 authentication error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers(),
      });

      await expect(fetchStarredRepositories(testToken)).rejects.toThrow(
        'GitHub authentication failed. Please sign in again.'
      );
    });

    it('should handle rate limit exceeded error', async () => {
      const resetTime = Math.floor(Date.now() / 1000) + 3600;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: new Headers({
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': resetTime.toString(),
        }),
      });

      await expect(fetchStarredRepositories(testToken)).rejects.toThrow(
        /GitHub API rate limit exceeded/
      );
    });

    it('should handle pagination parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
        headers: new Headers(),
      });

      await fetchStarredRepositories(testToken, 2, 50);

      const url = new URL(mockFetch.mock.calls[0][0]);
      expect(url.searchParams.get('page')).toBe('2');
      expect(url.searchParams.get('per_page')).toBe('50');
    });
  });

  describe('fetchAllStarredRepositories', () => {
    it('should fetch all starred repositories across multiple pages', async () => {
      const mockRepo1 = createMockStarredRepo({
        id: 1,
        name: 'repo-1',
        description: 'First repository',
        stargazers_count: 100,
        starred_at: '2024-01-10T10:00:00Z',
      });

      const mockRepo2 = createMockStarredRepo({
        id: 2,
        name: 'repo-2',
        description: 'Second repository',
        stargazers_count: 200,
        language: 'JavaScript',
        topics: ['backend'],
        starred_at: '2024-01-15T10:00:00Z',
      });

      // Mock fetchStarredRepoCount call (first call with per_page=1)
      // Mock with Link header indicating 150 total repos (last page is 150 with per_page=1)
      const linkHeader = '<https://api.github.com/user/starred?page=150&per_page=1>; rel="last"';
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [mockRepo1], // Single item for count calculation
          headers: new Headers({ Link: linkHeader }),
        })
        // Mock parallel calls for page 1 and page 2
        .mockResolvedValueOnce({
          ok: true,
          json: async () => Array(100).fill(mockRepo1), // Page 1: 100 repos
          headers: new Headers(),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [mockRepo2], // Page 2: 1 repo
          headers: new Headers(),
        });

      const result = await fetchAllStarredRepositories(testToken);

      // Should have made three API calls: 1 for count + 2 for parallel fetching
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // First call should be for counting (per_page=1)
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('per_page=1'),
        expect.any(Object)
      );

      // Subsequent calls should be for parallel fetching (can be in any order)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=1&per_page=100'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2&per_page=100'),
        expect.any(Object)
      );

      // Should return all repositories (100 + 1 = 101)
      expect(result.repositories).toHaveLength(101);
      expect(result.totalFetched).toBe(101);
      // Results should be sorted by star count (repo-2 has 200 stars, repo-1 has 100)
      // repo-2 (1 item) should be first, followed by repo-1 items (100 items)
      expect(result.repositories[0]).toMatchObject({
        id: 2,
        name: 'repo-2',
      });
      expect(result.repositories[1]).toMatchObject({
        id: 1,
        name: 'repo-1',
      });
    });

    it('should handle single page of starred repositories', async () => {
      const mockRepo = createMockStarredRepo({
        id: 1,
        name: 'single-repo',
        description: 'Only repository',
        stargazers_count: 50,
        language: 'Python',
        topics: ['ai'],
        starred_at: '2024-01-10T10:00:00Z',
      });

      // Mock fetchStarredRepoCount call (first call with per_page=1) - single page scenario
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [mockRepo], // Single item, no Link header means single page
          headers: new Headers(),
        })
        // Mock single page fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [mockRepo],
          headers: new Headers(),
        });

      const result = await fetchAllStarredRepositories(testToken);

      // Should have made two API calls: 1 for count + 1 for single page fetch
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.repositories).toHaveLength(1);
      expect(result.totalFetched).toBe(1);
      expect(result.repositories[0]).toMatchObject({
        id: 1,
        name: 'single-repo',
      });
    });

    it('should throw error when authentication fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers(),
      });

      await expect(fetchAllStarredRepositories(testToken)).rejects.toThrow(
        'GitHub authentication failed. Please sign in again.'
      );
    });
  });

  describe('searchRepositories', () => {
    it('should search repositories with fuzzy match', async () => {
      const mockSearchResults = {
        items: [
          createMockSearchResultItem({
            id: 2,
            name: 'typescript',
            description: 'TypeScript language',
            stargazers_count: 90000,
            open_issues_count: 5000,
            topics: ['typescript', 'javascript'],
          }),
        ],
        total_count: 50000,
      };

      // Mock for search
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResults,
        headers: new Headers(),
      });

      // Mock for fetchUserStarredIds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
        headers: new Headers(),
      });

      const result = await searchRepositories(testToken, 'typescript');

      const url = new URL(mockFetch.mock.calls[0][0]);
      expect(url.pathname).toBe('/search/repositories');
      expect(url.searchParams.get('q')).toBe('typescript');
      expect(url.searchParams.get('sort')).toBe('updated'); // Default sort is now 'updated'

      expect(result.repositories).toHaveLength(1);
      expect(result.repositories[0].name).toBe('typescript');
      expect(result.totalCount).toBe(50000);
      expect(result.apiSearchResultTotal).toBe(1000); // GitHub API cap
    });

    it('should search repositories with exact match using quotes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], total_count: 0 }),
        headers: new Headers(),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
        headers: new Headers(),
      });

      await searchRepositories(testToken, '"typescript"');

      const url = new URL(mockFetch.mock.calls[0][0]);
      expect(url.searchParams.get('q')).toBe('typescript in:name');
    });

    it('should mark repositories as starred if user has them starred', async () => {
      const mockSearchResults = {
        items: [
          createMockSearchResultItem({
            id: 123,
            name: 'test-repo',
            description: 'Test',
            topics: [],
          }),
        ],
        total_count: 1,
      };

      const mockStarredRepos = [{ id: 123, name: 'test-repo', full_name: 'user/test-repo' }];

      // Mock search results
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResults,
        headers: new Headers(),
      });

      // Mock starred repos check
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStarredRepos,
        headers: new Headers(),
      });

      const result = await searchRepositories(testToken, 'test');

      expect(result.repositories[0].is_starred).toBe(true);
    });

    it('should handle invalid search query', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        headers: new Headers(),
      });

      await expect(searchRepositories(testToken, '')).rejects.toThrow('Invalid search query');
    });
  });

  describe('fetchRateLimit', () => {
    it('should fetch rate limit status', async () => {
      const mockRateLimit = {
        rate: {
          limit: 5000,
          remaining: 4999,
          reset: Math.floor(Date.now() / 1000) + 3600,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRateLimit,
        headers: new Headers(),
      });

      const result = await fetchRateLimit(testToken);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/rate_limit',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-github-token',
          }),
        })
      );

      expect(result).toMatchObject({
        limit: 5000,
        remaining: 4999,
        reset: expect.any(Date),
      });
    });

    it('should handle resources format', async () => {
      const mockRateLimit = {
        resources: {
          core: {
            limit: 5000,
            remaining: 4999,
            reset: Math.floor(Date.now() / 1000) + 3600,
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRateLimit,
        headers: new Headers(),
      });

      const result = await fetchRateLimit(testToken);

      expect(result.limit).toBe(5000);
      expect(result.remaining).toBe(4999);
    });

    it('should throw error when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers(),
      });

      await expect(fetchRateLimit(testToken)).rejects.toThrow('Failed to fetch rate limit');
    });
  });
});
