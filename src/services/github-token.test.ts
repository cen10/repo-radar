import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { storeAccessToken, getStoredAccessToken, clearStoredAccessToken } from './github-token';
import { mockLogger } from '../test/mocks/logger';

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
});
