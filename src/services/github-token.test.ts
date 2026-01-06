import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import {
  storeRefreshToken,
  getStoredRefreshToken,
  clearStoredRefreshToken,
  getValidGitHubToken,
  GitHubReauthRequiredError,
} from './github-token';
import { logger } from '../utils/logger';

// Mock the logger to silence test output
vi.mock('../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Set up import.meta.env for testing
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');

describe('github-token service', () => {
  const REFRESH_TOKEN_KEY = 'github_refresh_token';

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('storeRefreshToken', () => {
    it('stores refresh token in localStorage', () => {
      storeRefreshToken('test-refresh-token');
      expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('test-refresh-token');
    });

    it('logs warning if localStorage fails', () => {
      const mockSetItem = vi.spyOn(Storage.prototype, 'setItem');
      mockSetItem.mockImplementation(() => {
        throw new Error('Storage full');
      });

      storeRefreshToken('test-token');

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to store refresh token in localStorage',
        expect.any(Error)
      );
    });
  });

  describe('getStoredRefreshToken', () => {
    it('retrieves refresh token from localStorage', () => {
      localStorage.setItem(REFRESH_TOKEN_KEY, 'stored-token');
      expect(getStoredRefreshToken()).toBe('stored-token');
    });

    it('returns null if no token stored', () => {
      expect(getStoredRefreshToken()).toBeNull();
    });

    it('logs warning and returns null if localStorage fails', () => {
      const mockGetItem = vi.spyOn(Storage.prototype, 'getItem');
      mockGetItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(getStoredRefreshToken()).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to retrieve refresh token from localStorage',
        expect.any(Error)
      );
    });
  });

  describe('clearStoredRefreshToken', () => {
    it('removes refresh token from localStorage', () => {
      localStorage.setItem(REFRESH_TOKEN_KEY, 'token-to-clear');
      clearStoredRefreshToken();
      expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    });

    it('logs warning if localStorage fails', () => {
      const mockRemoveItem = vi.spyOn(Storage.prototype, 'removeItem');
      mockRemoveItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      clearStoredRefreshToken();

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to clear refresh token from localStorage',
        expect.any(Error)
      );
    });
  });

  describe('getValidGitHubToken', () => {
    const ACCESS_TOKEN_KEY = 'github_access_token';

    it('returns provider_token if available in session and stores it', async () => {
      const session = {
        provider_token: 'valid-github-token',
      } as Session;

      const token = await getValidGitHubToken(session);
      expect(token).toBe('valid-github-token');
      // Should store the token for later use
      expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe('valid-github-token');
    });

    it('returns stored access token when provider_token is null', async () => {
      const session = {
        provider_token: null,
      } as unknown as Session;

      localStorage.setItem(ACCESS_TOKEN_KEY, 'stored-access-token');

      const token = await getValidGitHubToken(session);
      expect(token).toBe('stored-access-token');
    });

    it('throws GitHubReauthRequiredError if no provider_token and no stored tokens', async () => {
      const session = {
        provider_token: null,
      } as unknown as Session;

      // Ensure no stored tokens
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);

      await expect(getValidGitHubToken(session)).rejects.toThrow(GitHubReauthRequiredError);
      await expect(getValidGitHubToken(session)).rejects.toThrow(
        'No GitHub token available - re-authentication required'
      );
    });

    it('calls Edge Function to refresh token when no access token but refresh token exists', async () => {
      const session = {
        provider_token: null,
      } as unknown as Session;

      // No stored access token, but has refresh token
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.setItem(REFRESH_TOKEN_KEY, 'stored-refresh-token');

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            expires_in: 28800,
          }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const token = await getValidGitHubToken(session);

      expect(token).toBe('new-access-token');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/refresh-github-token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: 'stored-refresh-token' }),
        }
      );

      // Should store the new refresh token
      expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('new-refresh-token');
    });

    it('throws GitHubReauthRequiredError and clears stored token on refresh failure', async () => {
      const session = {
        provider_token: null,
      } as unknown as Session;

      // No stored access token, but has (invalid) refresh token
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.setItem(REFRESH_TOKEN_KEY, 'invalid-refresh-token');

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            error: 'token_refresh_failed',
            message: 'The refresh token is invalid or expired',
          }),
      });
      vi.stubGlobal('fetch', mockFetch);

      let thrownError: Error | null = null;
      try {
        await getValidGitHubToken(session);
      } catch (err) {
        thrownError = err as Error;
      }

      expect(thrownError).toBeInstanceOf(GitHubReauthRequiredError);
      expect(thrownError?.message).toBe('The refresh token is invalid or expired');

      // Should clear the invalid refresh token
      expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    });

    it('logs info message when attempting to refresh token', async () => {
      const session = {
        provider_token: null,
      } as unknown as Session;

      // No stored access token, but has refresh token
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.setItem(REFRESH_TOKEN_KEY, 'stored-refresh-token');

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'new-token',
            refresh_token: 'new-refresh',
            expires_in: 28800,
          }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await getValidGitHubToken(session);

      expect(logger.info).toHaveBeenCalledWith(
        'provider_token is null, attempting to refresh GitHub token'
      );
    });
  });

  describe('GitHubReauthRequiredError', () => {
    it('is an instance of Error', () => {
      const error = new GitHubReauthRequiredError('test message');
      expect(error).toBeInstanceOf(Error);
    });

    it('has correct name property', () => {
      const error = new GitHubReauthRequiredError('test message');
      expect(error.name).toBe('GitHubReauthRequiredError');
    });

    it('has correct message', () => {
      const error = new GitHubReauthRequiredError('custom error message');
      expect(error.message).toBe('custom error message');
    });
  });
});
