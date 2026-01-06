import type { Session } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

const REFRESH_TOKEN_KEY = 'github_refresh_token';
const ACCESS_TOKEN_KEY = 'github_access_token';

/**
 * Custom error thrown when GitHub token refresh fails and re-authentication is required
 */
export class GitHubReauthRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GitHubReauthRequiredError';
  }
}

/**
 * Store the GitHub refresh token in localStorage
 * Safe to store - refresh tokens are useless without client_secret
 */
export function storeRefreshToken(refreshToken: string): void {
  try {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } catch (error) {
    logger.warn('Failed to store refresh token in localStorage', error);
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
 * Retrieve the stored GitHub refresh token from localStorage
 */
export function getStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    logger.warn('Failed to retrieve refresh token from localStorage', error);
    return null;
  }
}

/**
 * Clear the stored GitHub refresh token from localStorage
 */
export function clearStoredRefreshToken(): void {
  try {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    logger.warn('Failed to clear refresh token from localStorage', error);
  }
}

interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface RefreshTokenError {
  error: string;
  message?: string;
}

/**
 * Call the Supabase Edge Function to refresh the GitHub access token
 */
async function refreshGitHubToken(refreshToken: string): Promise<string> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new GitHubReauthRequiredError('Missing Supabase URL configuration');
  }

  const functionUrl = `${supabaseUrl}/functions/v1/refresh-github-token`;

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const data = (await response.json()) as RefreshTokenResponse | RefreshTokenError;

  if (!response.ok || 'error' in data) {
    const errorData = data as RefreshTokenError;
    logger.error('GitHub token refresh failed', errorData);
    // Clear the invalid refresh token
    clearStoredRefreshToken();
    throw new GitHubReauthRequiredError(errorData.message || 'Failed to refresh GitHub token');
  }

  const tokenData = data as RefreshTokenResponse;

  // Store the new refresh token if GitHub rotated it
  if (tokenData.refresh_token) {
    storeRefreshToken(tokenData.refresh_token);
  }

  return tokenData.access_token;
}

/**
 * Get a valid GitHub access token, refreshing if necessary
 *
 * @param session - The current Supabase session
 * @returns A valid GitHub access token
 * @throws GitHubReauthRequiredError if token refresh fails
 */
export async function getValidGitHubToken(session: Session): Promise<string> {
  // If provider_token is available, store it and use it directly
  if (session.provider_token) {
    // Store for later use when Supabase session refresh loses it
    storeAccessToken(session.provider_token);
    return session.provider_token;
  }

  // provider_token is null - first try stored access token
  // (GitHub OAuth tokens don't expire unless token expiration is enabled)
  const storedAccessToken = getStoredAccessToken();
  if (storedAccessToken) {
    logger.info('provider_token is null, using stored access token');
    return storedAccessToken;
  }

  // No stored access token - try to refresh using stored refresh token
  logger.info('provider_token is null, attempting to refresh GitHub token');

  const storedRefreshToken = getStoredRefreshToken();
  if (!storedRefreshToken) {
    throw new GitHubReauthRequiredError('No GitHub token available - re-authentication required');
  }

  return refreshGitHubToken(storedRefreshToken);
}
