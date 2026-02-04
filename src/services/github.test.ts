import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchAllStarredRepositories,
  fetchStarredRepositories,
  searchRepositories,
  fetchRateLimit,
  fetchRepositoryReleases,
  fetchRepositoriesByIds,
} from './github';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

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

// Helper to create mock GitHub API release
interface MockReleaseOptions {
  id?: number;
  tag_name?: string;
  name?: string | null;
  body?: string | null;
  published_at?: string | null;
  prerelease?: boolean;
  draft?: boolean;
}

const createMockRelease = (options: MockReleaseOptions = {}) => ({
  id: options.id ?? 1,
  tag_name: options.tag_name ?? 'v1.0.0',
  name: options.name ?? 'Version 1.0.0',
  body: options.body ?? 'Release notes',
  html_url: 'https://github.com/owner/repo/releases/tag/v1.0.0',
  published_at: options.published_at ?? '2024-01-15T10:00:00Z',
  created_at: '2024-01-15T09:00:00Z',
  prerelease: options.prerelease ?? false,
  draft: options.draft ?? false,
  author: {
    login: 'releaser',
    avatar_url: 'https://example.com/avatar.jpg',
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

    it('should return growth rate in decimal format (not percentage)', async () => {
      // Mock a recently updated repo to ensure non-zero growth rate
      const recentDate = new Date().toISOString();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          'x-ratelimit-remaining': '4999',
          'x-ratelimit-limit': '5000',
        }),
        json: async () => [
          {
            repo: {
              id: 1,
              name: 'active-repo',
              full_name: 'user/active-repo',
              owner: { login: 'user', avatar_url: 'https://example.com/avatar.png' },
              description: 'An active repo',
              html_url: 'https://github.com/user/active-repo',
              stargazers_count: 1000,
              open_issues_count: 10,
              language: 'TypeScript',
              topics: [],
              updated_at: recentDate,
              pushed_at: recentDate,
              created_at: '2020-01-01T00:00:00Z',
            },
            starred_at: recentDate,
          },
        ],
      });

      const result = await fetchStarredRepositories(testToken);
      const growthRate = result[0].metrics?.stars_growth_rate ?? 0;

      // Growth rate should be in decimal format: 0.25 = 25%, not 25
      // Reasonable range is -1 to 1 (-100% to +100%)
      expect(growthRate).toBeGreaterThanOrEqual(-1);
      expect(growthRate).toBeLessThanOrEqual(1);
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
        name: 'repo-1',
        description: 'First repository',
        starred_at: '2024-01-10T10:00:00Z',
      });

      const mockRepo2 = createMockStarredRepo({
        id: 2,
        name: 'repo-2',
        description: 'Second repository',
        stargazers_count: 200,
        language: 'JavaScript',
        topics: ['backend'],
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
        name: 'single-repo',
        description: 'Only repository',
        stargazers_count: 50,
        language: 'Python',
        topics: ['ai'],
        starred_at: '2024-01-10T10:00:00Z',
      });

      // Mock fetchStarredRepoCount: HEAD (no Link header) → GET fallback
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers(), // HEAD: no Link header triggers fallback
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [mockRepo], // GET fallback: count from body
          headers: new Headers(),
        })
        // Mock single page fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [mockRepo],
          headers: new Headers(),
        });

      const result = await fetchAllStarredRepositories(testToken);

      // Should have made 3 API calls: HEAD + GET fallback for count, then 1 page fetch
      expect(mockFetch).toHaveBeenCalledTimes(3);
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
    // AbortController for tests - signal is required in production
    const createSignal = () => new AbortController().signal;

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

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResults,
        headers: new Headers(),
      });

      const starredIds = new Set<number>();
      const result = await searchRepositories(
        testToken,
        'typescript',
        1,
        30,
        'updated',
        createSignal(),
        starredIds
      );

      const url = new URL(mockFetch.mock.calls[0][0]);
      expect(url.pathname).toBe('/search/repositories');
      expect(url.searchParams.get('q')).toBe('typescript');
      expect(url.searchParams.get('sort')).toBe('updated');

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

      const starredIds = new Set<number>();
      await searchRepositories(
        testToken,
        '"typescript"',
        1,
        30,
        'updated',
        createSignal(),
        starredIds
      );

      const url = new URL(mockFetch.mock.calls[0][0]);
      expect(url.searchParams.get('q')).toBe('typescript in:name');
    });

    it('should mark repositories as starred if user has them starred', async () => {
      const mockSearchResults = {
        items: [
          createMockSearchResultItem({
            id: 123,
            description: 'Test',
            topics: [],
          }),
        ],
        total_count: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResults,
        headers: new Headers(),
      });

      // Pass starredIds with the repo ID to mark it as starred
      const starredIds = new Set<number>([123]);
      const result = await searchRepositories(
        testToken,
        'test',
        1,
        30,
        'updated',
        createSignal(),
        starredIds
      );

      expect(result.repositories[0].is_starred).toBe(true);
    });

    it('should handle invalid search query', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        headers: new Headers(),
      });

      const starredIds = new Set<number>();
      await expect(
        searchRepositories(testToken, '', 1, 30, 'updated', createSignal(), starredIds)
      ).rejects.toThrow('Invalid search query');
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

      await expect(fetchRateLimit(testToken)).rejects.toThrow(
        'Failed to fetch rate limit: 500 Internal Server Error'
      );
    });
  });

  describe('fetchRepositoryReleases', () => {
    it('should fetch releases successfully', async () => {
      const mockReleases = [
        createMockRelease({ id: 1, tag_name: 'v1.2.0', name: 'Version 1.2.0' }),
        createMockRelease({ id: 2, tag_name: 'v1.1.0', name: 'Version 1.1.0' }),
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockReleases,
        headers: new Headers(),
      });

      const result = await fetchRepositoryReleases(testToken, 'owner', 'repo');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.github.com/repos/owner/repo/releases'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-github-token',
          }),
        })
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 1,
        tag_name: 'v1.2.0',
        name: 'Version 1.2.0',
        prerelease: false,
        draft: false,
        author: expect.objectContaining({
          login: 'releaser',
        }),
      });
    });

    it('should always fetch 10 releases', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
        headers: new Headers(),
      });

      await fetchRepositoryReleases(testToken, 'owner', 'repo');

      const url = new URL(mockFetch.mock.calls[0][0]);
      expect(url.searchParams.get('per_page')).toBe('10');
    });

    it('should handle 401 authentication error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers(),
      });

      await expect(fetchRepositoryReleases(testToken, 'owner', 'repo')).rejects.toThrow(
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

      await expect(fetchRepositoryReleases(testToken, 'owner', 'repo')).rejects.toThrow(
        /GitHub API rate limit exceeded/
      );
    });

    it('should return empty array for 404 (repo not found or no releases)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
      });

      const result = await fetchRepositoryReleases(testToken, 'owner', 'nonexistent');

      expect(result).toEqual([]);
    });

    it('should handle releases with null author', async () => {
      const releaseWithNullAuthor = {
        ...createMockRelease(),
        author: null,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [releaseWithNullAuthor],
        headers: new Headers(),
      });

      const result = await fetchRepositoryReleases(testToken, 'owner', 'repo');

      expect(result).toHaveLength(1);
      expect(result[0].author).toBeNull();
    });

    it('should handle prerelease and draft releases', async () => {
      const mockReleases = [
        createMockRelease({ id: 1, tag_name: 'v2.0.0-beta', prerelease: true }),
        createMockRelease({ id: 2, tag_name: 'v1.9.0', draft: true }),
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockReleases,
        headers: new Headers(),
      });

      const result = await fetchRepositoryReleases(testToken, 'owner', 'repo');

      expect(result[0].prerelease).toBe(true);
      expect(result[0].draft).toBe(false);
      expect(result[1].prerelease).toBe(false);
      expect(result[1].draft).toBe(true);
    });
  });

  describe('fetchRepositoriesByIds', () => {
    // Helper to create mock repo response for /repositories/{id} endpoint
    const createMockRepoResponse = (id: number, name: string) => ({
      id,
      name,
      full_name: `user/${name}`,
      owner: {
        login: 'user',
        avatar_url: 'https://example.com/avatar.jpg',
      },
      description: 'Test repository',
      html_url: `https://github.com/user/${name}`,
      stargazers_count: 100,
      open_issues_count: 5,
      language: 'TypeScript',
      topics: ['testing'],
      updated_at: '2024-01-01T00:00:00Z',
      pushed_at: '2024-01-01T00:00:00Z',
      created_at: '2023-01-01T00:00:00Z',
    });

    it('should fetch repositories by IDs successfully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockRepoResponse(1, 'repo-1'),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockRepoResponse(2, 'repo-2'),
        });

      const result = await fetchRepositoriesByIds(testToken, [1, 2]);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('repo-1');
      expect(result[1].name).toBe('repo-2');
    });

    it('should return empty array for empty input', async () => {
      const result = await fetchRepositoriesByIds(testToken, []);

      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should skip repos that return 404', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockRepoResponse(1, 'repo-1'),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockRepoResponse(3, 'repo-3'),
        });

      const result = await fetchRepositoriesByIds(testToken, [1, 2, 3]);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('repo-1');
      expect(result[1].name).toBe('repo-3');
    });

    it('should propagate authentication errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(fetchRepositoriesByIds(testToken, [1])).rejects.toThrow(
        'GitHub authentication failed'
      );
    });

    it('should propagate rate limit errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        headers: new Headers({
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
        }),
      });

      await expect(fetchRepositoriesByIds(testToken, [1])).rejects.toThrow(
        'GitHub API rate limit exceeded'
      );
    });
  });
});
