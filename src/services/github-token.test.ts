import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  storeAccessToken,
  getStoredAccessToken,
  clearStoredAccessToken,
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

describe('github-token service', () => {
  const ACCESS_TOKEN_KEY = 'github_access_token';

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
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

      expect(logger.warn).toHaveBeenCalledWith(
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
      expect(logger.warn).toHaveBeenCalledWith(
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

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to clear access token from localStorage',
        expect.any(Error)
      );
    });
  });

  describe('getValidGitHubToken', () => {
    it('returns provider_token if available', () => {
      const token = getValidGitHubToken('valid-github-token');
      expect(token).toBe('valid-github-token');
    });

    it('returns stored access token when provider_token is null', () => {
      localStorage.setItem(ACCESS_TOKEN_KEY, 'stored-access-token');

      const token = getValidGitHubToken(null);
      expect(token).toBe('stored-access-token');
    });

    it('logs info message when using stored access token', () => {
      localStorage.setItem(ACCESS_TOKEN_KEY, 'stored-access-token');

      getValidGitHubToken(null);

      expect(logger.info).toHaveBeenCalledWith('provider_token is null, using stored access token');
    });

    it('throws GitHubReauthRequiredError if no provider_token and no stored access token', () => {
      expect(() => getValidGitHubToken(null)).toThrow(GitHubReauthRequiredError);
      expect(() => getValidGitHubToken(null)).toThrow(
        'No GitHub token available - re-authentication required'
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
