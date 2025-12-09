import { useState } from 'react';
import { useAuth } from '../hooks/use-auth';
import {
  GitHubIcon,
  LoadingSpinner,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '../components/icons';

export default function Login() {
  const { user, signInWithGitHub, signOut, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Helper function to extract error message with fallback
  const getErrorMessage = (error: unknown, defaultMessage: string): string => {
    if (error instanceof Error && error.message?.trim() !== '') {
      return error.message;
    }
    return defaultMessage;
  };

  // Shared header component
  const AppHeader = ({ children }: { children?: React.ReactNode }) => (
    <header className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">Repo Radar</h1>
      {children}
    </header>
  );

  const handleGitHubLogin = async () => {
    try {
      setError(null);
      setIsLoggingIn(true);
      await signInWithGitHub();
    } catch (error) {
      console.error('Login failed:', error);
      setError(
        getErrorMessage(error, 'An unexpected error occurred during login. Please try again.'),
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setError(null);
      setIsSigningOut(true);
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
      setError(
        getErrorMessage(error, 'An unexpected error occurred during sign out. Please try again.'),
      );
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className={`max-w-md w-full space-y-8 p-8 ${user ? 'text-center' : ''}`}>
        <AppHeader>
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
        </AppHeader>

        {user ? (
          <div className="space-y-4">
            <p className="text-gray-600">
              You're now connected to GitHub. Ready to track your starred repositories!
            </p>

            {error && (
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
                    <h3 className="text-sm font-medium text-red-800">Sign Out Failed</h3>
                    <p className="mt-2 text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <button onClick={handleSignOut} disabled={isSigningOut} className="btn-outline">
              {isSigningOut ? (
                <>
                  <LoadingSpinner className="w-5 h-5 mr-3" />
                  Signing out...
                </>
              ) : (
                'Sign Out'
              )}
              <span className="sr-only"> of {user.login}'s account</span>
            </button>
          </div>
        ) : (
          <main className="mt-8 space-y-4">
            {error && (
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
                    <h3 className="text-sm font-medium text-red-800">Login Failed</h3>
                    <p className="mt-2 text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleGitHubLogin}
              disabled={loading || isLoggingIn}
              className="btn-github"
              aria-describedby="github-login-description"
            >
              {isLoggingIn ? (
                <>
                  <LoadingSpinner className="w-5 h-5 mr-3" />
                  Signing in...
                </>
              ) : (
                <>
                  <GitHubIcon />
                  {error ? 'Try Again' : 'Continue with GitHub'}
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
