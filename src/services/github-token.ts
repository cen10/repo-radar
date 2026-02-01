import { logger } from '../utils/logger';
import { GitHubReauthRequiredError } from '../utils/error';

const ACCESS_TOKEN_KEY = 'github_access_token';

// Track whether we've logged fallback token usage (to avoid spam)
let hasLoggedTestToken = false;
let hasLoggedStoredToken = false;

/**
 * Get a valid GitHub token with multiple fallback options.
 *
 * Priority:
 * 1. provider_token from OAuth (normal auth flow)
 * 2. VITE_TEST_GITHUB_TOKEN env var (E2E testing / remote environments)
 * 3. Stored token in localStorage (Supabase session refresh fallback)
 *
 * @param providerToken - The token from auth context (may be null after session refresh)
 * @returns A valid GitHub token
 * @throws GitHubReauthRequiredError if no token is available
 */
export function getValidGitHubToken(providerToken: string | null): string {
  // 1. Use provider_token if available (normal OAuth flow)
  if (providerToken) {
    return providerToken;
  }

  // 2. Use test token if available (E2E testing / remote environments)
  const testToken = import.meta.env.VITE_TEST_GITHUB_TOKEN;
  if (testToken) {
    if (!hasLoggedTestToken) {
      logger.info('Using VITE_TEST_GITHUB_TOKEN for GitHub API calls');
      hasLoggedTestToken = true;
    }
    return testToken;
  }

  // 3. Fall back to stored token (Supabase dropped provider_token on refresh)
  const storedAccessToken = getStoredAccessToken();
  if (storedAccessToken) {
    if (!hasLoggedStoredToken) {
      logger.info('provider_token is null, using stored access token');
      hasLoggedStoredToken = true;
    }
    return storedAccessToken;
  }

  // 4. No token available - throw error
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
