import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
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

  const handleGitHubLogin = async () => {
    try {
      setError(null);
      setIsLoggingIn(true);
      await signInWithGitHub();
    } catch (error) {
      console.error('Login failed:', error);
      setError(
        error instanceof Error && error.message?.trim() !== ''
          ? error.message
          : 'An unexpected error occurred during login. Please try again.',
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Show logged-in state
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 text-center">
          <header>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Repo Radar</h1>
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
          </header>

          <div className="space-y-4">
            <p className="text-gray-600">
              You're now connected to GitHub. Ready to track your starred repositories!
            </p>

            <button onClick={signOut} className="btn-outline">
              Sign Out<span className="sr-only"> of {user.login}'s account</span>
            </button>
          </div>
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
                <LoadingSpinner className="mr-3" />
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
      </div>
    </div>
  );
}
