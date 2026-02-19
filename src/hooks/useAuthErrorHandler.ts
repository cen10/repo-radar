import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { isGitHubAuthError } from '../utils/error';
import { logger } from '../utils/logger';
import { isDemoModeActive } from '../demo/is-demo-mode-active';

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
    if (!error) return;

    const demoMode = isDemoModeActive();
    const isAuthError = isGitHubAuthError(error);

    logger.debug(`${hookName}: Error occurred`, {
      message: error.message,
      name: error.name,
      isGitHubAuthError: isAuthError,
      isDemoMode: demoMode,
    });

    if (!isAuthError) return;

    // In demo mode, auth errors mean MSW isn't intercepting a request.
    // Log prominently BEFORE signOut, since signOut does a hard page reload
    // that clears the console.
    if (demoMode) {
      logger.error(
        `${hookName}: GitHub auth error in DEMO MODE. This means MSW is missing a handler. ` +
          `Add the missing endpoint to src/demo/handlers.ts. Error: "${error.message}"`
      );
    }

    logger.info(`${hookName}: GitHub auth error, signing out`, {
      errorMessage: error.message,
    });

    sessionStorage.setItem('session_expired', 'true');

    // Await signOut before navigating to prevent race condition where
    // Home page redirects back to /stars while user is still truthy
    const handleSignOut = async () => {
      await signOut();
      void navigate('/');
    };
    void handleSignOut();
  }, [error, signOut, navigate, hookName]);
}
