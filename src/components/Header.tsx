import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/use-auth';
import { supabase } from '../services/supabase';
import { LoadingSpinner, ArrowRightOnRectangleIcon, ExclamationCircleIcon } from './icons';
import { SIGNOUT_FAILED } from '../constants/errorMessages';
import { logger } from '../utils/logger';

// Helper function to provide user-friendly error messages for sign out
function getSignOutErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Network/connectivity errors - provide user-friendly message
    if (error.message === 'Failed to fetch' || error.name === 'NetworkError') {
      return 'Unable to sign out due to connection issues. Please check your internet connection and try again.';
    }

    // Use the original error message for other specific errors
    if (error.message?.trim() !== '') {
      return error.message;
    }
  }

  // Generic fallback
  return SIGNOUT_FAILED;
}

// Error banner component for displaying error messages with proper accessibility
function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="bg-red-50 border-b border-red-200 px-4 py-3 sm:px-6 lg:px-8"
      role="alert"
      aria-live="assertive"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex">
          <div className="flex-shrink-0">
            <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-800">{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Header() {
  const { user } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const signOutButtonRef = useRef<HTMLButtonElement>(null);

  // Focus button after error state is set
  useEffect(() => {
    if (signOutError) {
      signOutButtonRef.current?.focus();
    }
  }, [signOutError]);

  const handleSignOut = async () => {
    try {
      setSignOutError(null);
      setIsSigningOut(true);

      const { error } = await supabase.auth.signOut();
      if (error) {
        const message = getSignOutErrorMessage(error);
        logger.error('Sign out error:', error);
        setSignOutError(message);
        return;
      }
    } catch (err) {
      const message = getSignOutErrorMessage(err);
      logger.error('Unexpected sign out error:', err);
      setSignOutError(message);
    } finally {
      setIsSigningOut(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 max-w-7xl mx-auto">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">Repo Radar</h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              {user.avatar_url && (
                <img
                  src={user.avatar_url}
                  alt={`${user.name || user.login}'s avatar`}
                  className="h-8 w-8 rounded-full"
                />
              )}
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user.name || user.login}</p>
                <p className="text-xs text-gray-500">@{user.login}</p>
              </div>
            </div>

            <button
              ref={signOutButtonRef}
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Sign out"
              aria-busy={isSigningOut}
            >
              {isSigningOut ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Signing out...
                </>
              ) : (
                <>
                  <ArrowRightOnRectangleIcon className="mr-2 h-4 w-4" />
                  Sign out
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {signOutError && <ErrorBanner message={signOutError} />}
    </>
  );
}
