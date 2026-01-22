import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { isGitHubAuthError } from '../utils/error';
import { logger } from '../utils/logger';

/**
 * Hook that handles GitHub auth errors by signing out and redirecting to home.
 *
 * Use this in data-fetching hooks that call the GitHub API. When a 401/403
 * error occurs (token expired or revoked), this will:
 * 1. Set session_expired flag for the home page to display
 * 2. Sign out the user
 * 3. Navigate to the home page
 */
export function useAuthErrorHandler(error: Error | null, hookName: string) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (error) {
      logger.debug(`${hookName}: Error occurred`, {
        message: error.message,
        name: error.name,
        isGitHubAuthError: isGitHubAuthError(error),
      });
    }
    if (isGitHubAuthError(error)) {
      logger.info(`${hookName}: GitHub auth error, signing out`, {
        errorMessage: error?.message,
      });
      sessionStorage.setItem('session_expired', 'true');
      void signOut();
      void navigate('/');
    }
  }, [error, signOut, navigate, hookName]);
}
