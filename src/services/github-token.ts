import { logger } from '../utils/logger';

const ACCESS_TOKEN_KEY = 'github_access_token';

/**
 * Error thrown when no GitHub token is available.
 * Indicates the user needs to re-authenticate.
 */
export class GitHubReauthRequiredError extends Error {
  constructor(message = 'No GitHub token available') {
    super(message);
    this.name = 'GitHubReauthRequiredError';
  }
}

/**
 * Get a valid GitHub token, falling back to localStorage if providerToken is null.
 *
 * This handles the case where Supabase session refresh drops the provider_token
 * but we still have a valid token stored in localStorage.
 *
 * @param providerToken - The token from auth context (may be null after session refresh)
 * @returns A valid GitHub token
 * @throws GitHubReauthRequiredError if no token is available
 */
export function getValidGitHubToken(providerToken: string | null): string {
  // 1. Use provider_token if available
  if (providerToken) {
    return providerToken;
  }

  // 2. Fall back to stored token (Supabase dropped provider_token on refresh)
  const storedAccessToken = getStoredAccessToken();
  if (storedAccessToken) {
    logger.info('provider_token is null, using stored access token');
    return storedAccessToken;
  }

  // 3. No token available - throw error
  throw new GitHubReauthRequiredError('No GitHub token available');
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
