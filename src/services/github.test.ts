import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import {
  fetchAllStarredRepositories,
  fetchStarredRepositories,
  searchRepositories,
  fetchRateLimit,
} from './github';
import { GitHubReauthRequiredError } from './github-token';

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

describe('GitHub API Service', () => {
  const mockSession: Session = {
    provider_token: 'test-github-token',
    access_token: 'test-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Date.now() + 3600000,
    refresh_token: 'test-refresh-token',
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      user_metadata: {},
      app_metadata: {},
      aud: 'authenticated',
      created_at: '2024-01-01T00:00:00Z',
    },
  };

  beforeEach(() => {
    mockFetch.mockClear();
    // Clear localStorage to avoid token persistence between tests
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchStarredRepositories', () => {
    it('should fetch starred repositories successfully', async () => {
      const mockRepos = [
        {
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
          topics: ['testing'],
          updated_at: '2024-01-01T00:00:00Z',
          pushed_at: '2024-01-01T00:00:00Z',
          created_at: '2023-01-01T00:00:00Z',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRepos,
        headers: new Headers(),
      });

      const result = await fetchStarredRepositories(mockSession);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.github.com/user/starred'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-github-token',
            Accept: 'application/vnd.github.v3+json',
          }),
        })
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 1,
        name: 'test-repo',
        full_name: 'user/test-repo',
        metrics: expect.objectContaining({
          stars_growth_rate: expect.any(Number),
          is_trending: expect.any(Boolean),
        }),
      });
    });

    it('should throw error when no session is provided', async () => {
      await expect(fetchStarredRepositories(null)).rejects.toThrow(
        'No GitHub access token available'
      );
    });

    it('should throw GitHubReauthRequiredError when provider_token is missing', async () => {
      // When provider_token is missing, the service tries to refresh using stored token
      // If no stored refresh token exists, it throws GitHubReauthRequiredError
      const sessionWithoutToken = { ...mockSession, provider_token: undefined };
      await expect(fetchStarredRepositories(sessionWithoutToken)).rejects.toThrow(
        GitHubReauthRequiredError
      );
    });

    it('should handle 401 authentication error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers(),
      });

      await expect(fetchStarredRepositories(mockSession)).rejects.toThrow(
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

      await expect(fetchStarredRepositories(mockSession)).rejects.toThrow(
        /GitHub API rate limit exceeded/
      );
    });

    it('should handle pagination parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
        headers: new Headers(),
      });

      await fetchStarredRepositories(mockSession, 2, 50);

      const url = new URL(mockFetch.mock.calls[0][0]);
      expect(url.searchParams.get('page')).toBe('2');
      expect(url.searchParams.get('per_page')).toBe('50');
    });
  });

  describe('fetchAllStarredRepositories', () => {
    it('should fetch all starred repositories across multiple pages', async () => {
      const mockRepo1 = {
        id: 1,
        name: 'repo-1',
        full_name: 'user/repo-1',
        owner: {
          login: 'user',
          avatar_url: 'https://example.com/avatar.jpg',
        },
        description: 'First repository',
        html_url: 'https://github.com/user/repo-1',
        stargazers_count: 100,
        open_issues_count: 5,
        language: 'TypeScript',
        topics: ['testing'],
        updated_at: '2024-01-01T00:00:00Z',
        pushed_at: '2024-01-01T00:00:00Z',
        created_at: '2023-01-01T00:00:00Z',
      };

      const mockRepo2 = {
        id: 2,
        name: 'repo-2',
        full_name: 'user/repo-2',
        owner: {
          login: 'user',
          avatar_url: 'https://example.com/avatar.jpg',
        },
        description: 'Second repository',
        html_url: 'https://github.com/user/repo-2',
        stargazers_count: 200,
        open_issues_count: 10,
        language: 'JavaScript',
        topics: ['backend'],
        updated_at: '2024-01-02T00:00:00Z',
        pushed_at: '2024-01-02T00:00:00Z',
        created_at: '2023-01-02T00:00:00Z',
      };

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

      const result = await fetchAllStarredRepositories(mockSession);

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
      expect(result.totalStarred).toBe(150); // Based on Link header: 150 total repos
      expect(result.isLimited).toBe(false);
      expect(result.hasMore).toBe(false);
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
      const mockRepo = {
        id: 1,
        name: 'single-repo',
        full_name: 'user/single-repo',
        owner: {
          login: 'user',
          avatar_url: 'https://example.com/avatar.jpg',
        },
        description: 'Only repository',
        html_url: 'https://github.com/user/single-repo',
        stargazers_count: 50,
        open_issues_count: 2,
        language: 'Python',
        topics: ['ai'],
        updated_at: '2024-01-01T00:00:00Z',
        pushed_at: '2024-01-01T00:00:00Z',
        created_at: '2023-01-01T00:00:00Z',
      };

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

      const result = await fetchAllStarredRepositories(mockSession);

      // Should have made two API calls: 1 for count + 1 for single page fetch
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.repositories).toHaveLength(1);
      expect(result.totalFetched).toBe(1);
      expect(result.totalStarred).toBe(1);
      expect(result.isLimited).toBe(false);
      expect(result.hasMore).toBe(false);
      expect(result.repositories[0]).toMatchObject({
        id: 1,
        name: 'single-repo',
      });
    });

    it('should respect repository limit and indicate when limit is reached', async () => {
      const mockRepo = {
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
        topics: ['testing'],
        updated_at: '2024-01-01T00:00:00Z',
        pushed_at: '2024-01-01T00:00:00Z',
        created_at: '2023-01-01T00:00:00Z',
      };

      // Mock the initial count request (fetchStarredRepoCount which is called by fetchAllStarredRepositories):
      // return a Link header showing last page=300 at per_page=1 => 300 total repos.
      // The next two mocks simulate pages 1 and 2 with 100 repos each; page 3 isn't fetched
      // because the test caps maxRepos at 150.
      const linkHeader = '<https://api.github.com/user/starred?page=300&per_page=1>; rel="last"';
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [mockRepo], // Single item for count calculation
          headers: new Headers({ Link: linkHeader }),
        })
        // Mock parallel calls for page 1 and page 2 (only fetching 2 pages for 150 limit)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => Array(100).fill(mockRepo), // Page 1: 100 repos
          headers: new Headers(),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => Array(100).fill(mockRepo), // Page 2: 100 repos
          headers: new Headers(),
        });

      const result = await fetchAllStarredRepositories(mockSession, 150); // Custom limit

      // Should have made three API calls: 1 for count + 2 for parallel fetching (limited)
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // Should return exactly the limit amount (trimmed from 200 fetched to 150 limit)
      expect(result.repositories).toHaveLength(150);
      expect(result.totalFetched).toBe(150);
      expect(result.totalStarred).toBe(300); // Based on Link header: 3 pages * 100 per page
      expect(result.isLimited).toBe(true);
      expect(result.hasMore).toBe(true);
    });

    it('should throw error when authentication fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers(),
      });

      await expect(fetchAllStarredRepositories(mockSession)).rejects.toThrow(
        'GitHub authentication failed. Please sign in again.'
      );
    });
  });

  describe('searchRepositories', () => {
    it('should search repositories with fuzzy match', async () => {
      const mockSearchResults = {
        items: [
          {
            id: 2,
            name: 'typescript',
            full_name: 'microsoft/typescript',
            owner: {
              login: 'microsoft',
              avatar_url: 'https://example.com/ms.jpg',
            },
            description: 'TypeScript language',
            html_url: 'https://github.com/microsoft/typescript',
            stargazers_count: 90000,
            open_issues_count: 5000,
            language: 'TypeScript',
            topics: ['typescript', 'javascript'],
            updated_at: '2024-01-01T00:00:00Z',
            pushed_at: '2024-01-01T00:00:00Z',
            created_at: '2014-01-01T00:00:00Z',
          },
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

      const result = await searchRepositories(mockSession, 'typescript');

      const url = new URL(mockFetch.mock.calls[0][0]);
      expect(url.pathname).toBe('/search/repositories');
      expect(url.searchParams.get('q')).toBe('typescript');
      expect(url.searchParams.get('sort')).toBe('stars');

      expect(result.repositories).toHaveLength(1);
      expect(result.repositories[0].name).toBe('typescript');
      expect(result.totalCount).toBe(50000);
      expect(result.apiSearchResultTotal).toBe(1000); // GitHub API cap
      expect(result.isLimited).toBe(true);
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

      await searchRepositories(mockSession, '"typescript"');

      const url = new URL(mockFetch.mock.calls[0][0]);
      expect(url.searchParams.get('q')).toBe('typescript in:name');
    });

    it('should mark repositories as starred if user has them starred', async () => {
      const mockSearchResults = {
        items: [
          {
            id: 123,
            name: 'test-repo',
            full_name: 'user/test-repo',
            owner: { login: 'user', avatar_url: 'https://example.com/avatar.jpg' },
            description: 'Test',
            html_url: 'https://github.com/user/test-repo',
            stargazers_count: 100,
            open_issues_count: 5,
            language: 'TypeScript',
            topics: [],
            updated_at: '2024-01-01T00:00:00Z',
            pushed_at: '2024-01-01T00:00:00Z',
            created_at: '2023-01-01T00:00:00Z',
          },
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

      const result = await searchRepositories(mockSession, 'test');

      expect(result.repositories[0].is_starred).toBe(true);
    });

    it('should handle invalid search query', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        headers: new Headers(),
      });

      await expect(searchRepositories(mockSession, '')).rejects.toThrow('Invalid search query');
    });

    it('should throw error when no session token', async () => {
      await expect(searchRepositories(null, 'test')).rejects.toThrow(
        'No GitHub access token available'
      );
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

      const result = await fetchRateLimit(mockSession);

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

      const result = await fetchRateLimit(mockSession);

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

      await expect(fetchRateLimit(mockSession)).rejects.toThrow('Failed to fetch rate limit');
    });

    it('should throw error when no session token', async () => {
      await expect(fetchRateLimit(null)).rejects.toThrow('No GitHub access token available');
    });
  });
});
