import { logger } from '../utils/logger';

const ACCESS_TOKEN_KEY = 'github_access_token';

/**
 * Custom error thrown when GitHub token is unavailable and re-authentication is required
 */
export class GitHubReauthRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GitHubReauthRequiredError';
  }
}

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

/**
 * Get a valid GitHub access token
 *
 * @param providerToken - The provider_token from Supabase session (null after session refresh)
 * @returns A valid GitHub access token
 * @throws GitHubReauthRequiredError if no token is available
 */
export function getValidGitHubToken(providerToken: string | null): string {
  // Use provider_token if available
  if (providerToken) {
    return providerToken;
  }

  // provider_token is null (Supabase drops it on session refresh) - use stored token
  // GitHub OAuth tokens don't expire, so the stored token remains valid
  const storedAccessToken = getStoredAccessToken();
  if (storedAccessToken) {
    logger.info('provider_token is null, using stored access token');
    return storedAccessToken;
  }

  // No token available - user needs to re-authenticate
  throw new GitHubReauthRequiredError('No GitHub token available - re-authentication required');
}
