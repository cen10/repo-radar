import type { Session } from '@supabase/supabase-js';
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
 * @param session - The current Supabase session
 * @returns A valid GitHub access token
 * @throws GitHubReauthRequiredError if no token is available
 */
export async function getValidGitHubToken(session: Session): Promise<string> {
  // If provider_token is available, store it and use it directly
  if (session.provider_token) {
    // Store for later use when Supabase session refresh loses it
    storeAccessToken(session.provider_token);
    return session.provider_token;
  }

  // provider_token is null - try stored access token
  // (GitHub OAuth App tokens don't expire)
  const storedAccessToken = getStoredAccessToken();
  if (storedAccessToken) {
    logger.info('provider_token is null, using stored access token');
    return storedAccessToken;
  }

  // No token available - user needs to re-authenticate
  throw new GitHubReauthRequiredError('No GitHub token available - re-authentication required');
}
