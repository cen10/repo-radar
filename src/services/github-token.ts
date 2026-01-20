import { logger } from '../utils/logger';

const ACCESS_TOKEN_KEY = 'github_access_token';

/**
 * Store the GitHub access token in localStorage
 * Used as fallback when Supabase session refresh loses the provider_token
 */
export function storeAccessToken(accessToken: string): void {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  } catch (error) {
    logger.warn('Failed to store access token in localStorage', error);
  }
}

/**
 * Retrieve the stored GitHub access token from localStorage
 */
export function getStoredAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch (error) {
    logger.warn('Failed to retrieve access token from localStorage', error);
    return null;
  }
}

/**
 * Clear the stored GitHub access token from localStorage
 */
export function clearStoredAccessToken(): void {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch (error) {
    logger.warn('Failed to clear access token from localStorage', error);
  }
}
