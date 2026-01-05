import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/use-auth';
import { GitHubIcon, LoadingSpinner, ExclamationCircleIcon } from '../components/icons';
import { LOGIN_FAILED } from '../constants/errorMessages';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/error';

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
  const { user, signInWithGitHub, loading, connectionError, retryAuth } = useAuth();
  // Local error state for user-initiated auth actions (sign in failures)
  const [authActionError, setAuthActionError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Ref for focus management
  const loginButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management after errors
  useEffect(() => {
    if (authActionError && !isLoggingIn) {
      loginButtonRef.current?.focus();
    }
  }, [authActionError, isLoggingIn]);

  const handleGitHubLogin = async () => {
    try {
      setAuthActionError(null);
      setIsLoggingIn(true);

      // If there's a connection error, try to retry connection first
      if (connectionError) {
        const didRetrySucceed = await retryAuth();
        if (!didRetrySucceed) {
          // Still have a connection error, don't proceed
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

  // Redirect authenticated users to dashboard
  // Dashboard will handle checking for GitHub token and sign out if missing
  if (user) {
    window.location.href = '/dashboard';
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 text-center">
          <LoadingSpinner />
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <header className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Repo Radar</h1>
          <p className="text-lg text-gray-600">
            Track star growth, releases, and issue activity across your starred repositories
          </p>
        </header>

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
      </div>
    </div>
  );
}
