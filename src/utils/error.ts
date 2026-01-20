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
 * Check if an error is a GitHub authentication error (401 from GitHub API).
 * These errors indicate the GitHub token is invalid/expired and the user
 * should be signed out to re-authenticate.
 */
export function isGitHubAuthError(error: Error | null): boolean {
  if (!error) return false;
  // Match the error message thrown by src/services/github.ts for 401 responses
  return error.message.includes('GitHub authentication failed');
}
