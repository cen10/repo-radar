import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/use-auth';
import {
  GitHubIcon,
  LoadingSpinner,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '../components/icons';
import { LOGIN_FAILED, SIGNOUT_FAILED } from '../constants/errorMessages';
import { logger } from '../utils/logger';

// Shared error alert component
const ErrorAlert = ({ title, message }: { title?: string; message: string }) => (
  <div
    className="bg-red-50 border border-red-200 rounded-md p-4"
    role="alert"
    aria-live="assertive"
  >
    <div className="flex">
      <div className="flex-shrink-0">
        <ExclamationCircleIcon />
      </div>
      <div className="ml-3">
        {title && <h3 className="text-sm font-medium text-red-800">{title}</h3>}
        <p className={title ? 'mt-2 text-sm text-red-700' : 'text-sm text-red-700'}>{message}</p>
      </div>
    </div>
  </div>
);

export default function Login() {
  const { user, signInWithGitHub, signOut, loading, connectionError, retryAuth } = useAuth();
  // Local error state for user-initiated auth actions (sign in/sign out failures)
  const [authActionError, setAuthActionError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Refs for focus management
  const loginButtonRef = useRef<HTMLButtonElement>(null);
  const signOutButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management after errors
  useEffect(() => {
    if (authActionError && !isLoggingIn && !isSigningOut) {
      // Focus the appropriate retry button after an error
      if (user) {
        signOutButtonRef.current?.focus();
      } else {
        loginButtonRef.current?.focus();
      }
    }
  }, [authActionError, isLoggingIn, isSigningOut, user]);

  // Helper function to extract error message with fallback
  const getErrorMessage = (error: unknown, defaultMessage: string): string => {
    if (error instanceof Error && error.message?.trim() !== '') {
      return error.message;
    }
    return defaultMessage;
  };

  const handleGitHubLogin = async () => {
    try {
      setAuthActionError(null);
      setIsLoggingIn(true);

      // If there's a connection error, try to retry connection first
      if (connectionError) {
        await retryAuth();
        // Check if the retry was successful
        if (connectionError) {
          // Still have connection error, don't proceed
          return;
        }
      }

      // Only attempt sign in if connection is successful
      await signInWithGitHub();
    } catch (error) {
      logger.error('Login failed:', error);
      setAuthActionError(getErrorMessage(error, LOGIN_FAILED));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setAuthActionError(null);
      setIsSigningOut(true);
      await signOut();
    } catch (error) {
      logger.error('Sign out failed:', error);
      setAuthActionError(getErrorMessage(error, SIGNOUT_FAILED));
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className={`max-w-md w-full space-y-8 p-8 ${user ? 'text-center' : ''}`}>
        <header className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Repo Radar</h1>
          {user ? (
            <div
              className="bg-green-50 border border-green-200 rounded-md p-4 mb-6"
              role="status"
              aria-live="polite"
            >
              <div className="flex justify-center items-center">
                <CheckCircleIcon />
                <div>
                  <h3 className="text-sm font-medium text-green-800">Successfully logged in!</h3>
                  <p className="mt-1 text-sm text-green-700">
                    Welcome back, <strong>{user.login}</strong>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-lg text-gray-600">
              Track star growth, releases, and issue activity across your starred repositories
            </p>
          )}
        </header>

        {user ? (
          <div className="space-y-4">
            <p className="text-gray-600">
              You're now connected to GitHub. Ready to track your starred repositories!
            </p>

            {authActionError && <ErrorAlert title="Sign Out Failed" message={authActionError} />}

            <button
              ref={signOutButtonRef}
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="btn-outline"
              aria-busy={isSigningOut}
            >
              {isSigningOut ? (
                <>
                  <LoadingSpinner className="w-5 h-5 mr-3" />
                  Signing out...
                </>
              ) : authActionError ? (
                'Try Again'
              ) : (
                'Sign Out'
              )}
              <span className="sr-only"> of {user.login}'s account</span>
            </button>
          </div>
        ) : (
          <main className="mt-8 space-y-4">
            {connectionError && <ErrorAlert message={connectionError} />}
            {authActionError && <ErrorAlert message={authActionError} />}

            <button
              ref={loginButtonRef}
              onClick={handleGitHubLogin}
              disabled={loading || isLoggingIn}
              className="btn-github"
              aria-describedby="github-login-description"
              aria-busy={isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <LoadingSpinner className="w-5 h-5 mr-3" />
                  Signing in...
                </>
              ) : (
                <>
                  <GitHubIcon />
                  {connectionError || authActionError ? 'Try Again' : 'Continue with GitHub'}
                </>
              )}
            </button>

            <p id="github-login-description" className="text-sm text-gray-500 text-center">
              We'll access your starred repositories to show you personalized metrics
            </p>
          </main>
        )}
      </div>
    </div>
  );
}
