import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  storeAccessToken,
  getStoredAccessToken,
  clearStoredAccessToken,
  getValidGitHubToken,
  _resetLogFlags,
} from './github-token';
import { GitHubReauthRequiredError } from '../utils/error';
import { mockLogger } from '../test/mocks/logger';

describe('github-token service', () => {
  const ACCESS_TOKEN_KEY = 'github_access_token';

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
    _resetLogFlags();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('storeAccessToken', () => {
    it('stores access token in localStorage', () => {
      storeAccessToken('test-access-token');
      expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe('test-access-token');
    });

    it('logs warning if localStorage fails', () => {
      const mockSetItem = vi.spyOn(Storage.prototype, 'setItem');
      mockSetItem.mockImplementation(() => {
        throw new Error('Storage full');
      });

      storeAccessToken('test-token');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to store access token in localStorage',
        expect.any(Error)
      );
    });
  });

  describe('getStoredAccessToken', () => {
    it('retrieves access token from localStorage', () => {
      localStorage.setItem(ACCESS_TOKEN_KEY, 'stored-token');
      expect(getStoredAccessToken()).toBe('stored-token');
    });

    it('returns null if no token stored', () => {
      expect(getStoredAccessToken()).toBeNull();
    });

    it('logs warning and returns null if localStorage fails', () => {
      const mockGetItem = vi.spyOn(Storage.prototype, 'getItem');
      mockGetItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(getStoredAccessToken()).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to retrieve access token from localStorage',
        expect.any(Error)
      );
    });
  });

  describe('clearStoredAccessToken', () => {
    it('removes access token from localStorage', () => {
      localStorage.setItem(ACCESS_TOKEN_KEY, 'token-to-clear');
      clearStoredAccessToken();
      expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    });

    it('logs warning if localStorage fails', () => {
      const mockRemoveItem = vi.spyOn(Storage.prototype, 'removeItem');
      mockRemoveItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      clearStoredAccessToken();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to clear access token from localStorage',
        expect.any(Error)
      );
    });
  });

  describe('GitHubReauthRequiredError', () => {
    it('creates error with default message', () => {
      const error = new GitHubReauthRequiredError();
      expect(error.message).toBe('No GitHub token available');
      expect(error.name).toBe('GitHubReauthRequiredError');
    });

    it('creates error with custom message', () => {
      const error = new GitHubReauthRequiredError('Custom message');
      expect(error.message).toBe('Custom message');
      expect(error.name).toBe('GitHubReauthRequiredError');
    });

    it('is instanceof Error', () => {
      const error = new GitHubReauthRequiredError();
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('getValidGitHubToken', () => {
    const originalEnv = import.meta.env.VITE_TEST_GITHUB_TOKEN;

    afterEach(() => {
      // Restore original env value
      if (originalEnv === undefined) {
        delete import.meta.env.VITE_TEST_GITHUB_TOKEN;
      } else {
        import.meta.env.VITE_TEST_GITHUB_TOKEN = originalEnv;
      }
    });

    it('returns providerToken when available', () => {
      const result = getValidGitHubToken('provider-token');
      expect(result).toBe('provider-token');
    });

    it('falls back to VITE_TEST_GITHUB_TOKEN when providerToken is null', () => {
      import.meta.env.VITE_TEST_GITHUB_TOKEN = 'test-github-token';
      const result = getValidGitHubToken(null);
      expect(result).toBe('test-github-token');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Using VITE_TEST_GITHUB_TOKEN for GitHub API calls'
      );
    });

    it('falls back to localStorage when providerToken and test token are null', () => {
      delete import.meta.env.VITE_TEST_GITHUB_TOKEN;
      localStorage.setItem(ACCESS_TOKEN_KEY, 'stored-token');
      const result = getValidGitHubToken(null);
      expect(result).toBe('stored-token');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'provider_token is null, using stored access token'
      );
    });

    it('throws GitHubReauthRequiredError when no token available', () => {
      delete import.meta.env.VITE_TEST_GITHUB_TOKEN;
      expect(() => getValidGitHubToken(null)).toThrow(GitHubReauthRequiredError);
      expect(() => getValidGitHubToken(null)).toThrow('No GitHub token available');
    });

    it('prefers providerToken over test token and localStorage', () => {
      import.meta.env.VITE_TEST_GITHUB_TOKEN = 'test-github-token';
      localStorage.setItem(ACCESS_TOKEN_KEY, 'stored-token');
      const result = getValidGitHubToken('provider-token');
      expect(result).toBe('provider-token');
    });

    it('prefers test token over localStorage', () => {
      import.meta.env.VITE_TEST_GITHUB_TOKEN = 'test-github-token';
      localStorage.setItem(ACCESS_TOKEN_KEY, 'stored-token');
      const result = getValidGitHubToken(null);
      expect(result).toBe('test-github-token');
    });
  });
});
