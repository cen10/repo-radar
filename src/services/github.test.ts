import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import { fetchStarredRepositories, searchRepositories, fetchRateLimit } from './github';

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
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchStarredRepositories', () => {
    it('should fetch starred repositories successfully', async () => {
      const mockRepos = [
        {
          repo: {
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
          starred_at: '2024-01-01T00:00:00Z',
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
            Accept: 'application/vnd.github.v3.star+json',
          }),
        })
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 1,
        name: 'test-repo',
        full_name: 'user/test-repo',
        starred_at: '2024-01-01T00:00:00Z',
        metrics: expect.objectContaining({
          stars_growth_rate: expect.any(Number),
          is_trending: expect.any(Boolean),
        }),
      });
    });

    it('should throw error when no session token is provided', async () => {
      await expect(fetchStarredRepositories(null)).rejects.toThrow(
        'No GitHub access token available'
      );

      const sessionWithoutToken = { ...mockSession, provider_token: undefined };
      await expect(fetchStarredRepositories(sessionWithoutToken)).rejects.toThrow(
        'No GitHub access token available'
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

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('typescript');
    });

    it('should search repositories with exact match using quotes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
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

      expect(result[0].starred_at).toBeDefined();
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
