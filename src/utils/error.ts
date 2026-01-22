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
 * Helper function to extract error message with fallback
 * @param error - The error object to extract message from
 * @param defaultMessage - The default message to use if error message is empty
 * @returns The error message or default message
 */
export function getErrorMessage(error: unknown, defaultMessage: string): string {
  if (error instanceof Error && error.message?.trim() !== '') {
    return error.message;
  }
  return defaultMessage;
}

/**
 * Check if an error indicates the user needs to re-authenticate with GitHub.
 * This includes:
 * - 401 from GitHub API ("GitHub authentication failed")
 * - No token available (GitHubReauthRequiredError)
 */
export function isGitHubAuthError(error: Error | null): boolean {
  if (!error) return false;
  // Match the error message thrown by src/services/github.ts for 401 responses
  // or GitHubReauthRequiredError when no token is available
  return (
    error.message.includes('GitHub authentication failed') ||
    error.name === 'GitHubReauthRequiredError'
  );
}
