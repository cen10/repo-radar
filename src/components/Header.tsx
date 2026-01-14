import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/use-auth';
import {
  LoadingSpinner,
  ArrowRightOnRectangleIcon,
  ExclamationCircleIcon,
  QuestionMarkCircleIcon,
} from './icons';
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
  const { user, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const signOutButtonRef = useRef<HTMLButtonElement>(null);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const helpPanelRef = useRef<HTMLDivElement>(null);

  // Focus button after error state is set
  useEffect(() => {
    if (signOutError) {
      signOutButtonRef.current?.focus();
    }
  }, [signOutError]);

  // Handle Escape key to close help panel
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isHelpOpen) {
        setIsHelpOpen(false);
        helpButtonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isHelpOpen]);

  // Close help panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isHelpOpen &&
        helpPanelRef.current &&
        helpButtonRef.current &&
        !helpPanelRef.current.contains(event.target as Node) &&
        !helpButtonRef.current.contains(event.target as Node)
      ) {
        setIsHelpOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isHelpOpen]);

  const toggleHelp = useCallback(() => {
    setIsHelpOpen((prev) => !prev);
  }, []);

  const handleSignOut = async () => {
    try {
      setSignOutError(null);
      setIsSigningOut(true);
      await signOut();
    } catch (err) {
      const message = getSignOutErrorMessage(err);
      logger.error('Sign out error:', err);
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

            {/* Help button */}
            <div className="relative">
              <button
                ref={helpButtonRef}
                onClick={toggleHelp}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
                aria-label="Help"
                aria-expanded={isHelpOpen}
                aria-controls="help-panel"
              >
                <QuestionMarkCircleIcon className="h-5 w-5" />
              </button>

              {/* Sliding help panel */}
              <div
                ref={helpPanelRef}
                id="help-panel"
                role="region"
                aria-label="Help information"
                className={`absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 p-4 transition-all duration-200 ease-out origin-top-right ${
                  isHelpOpen
                    ? 'opacity-100 scale-100 translate-y-0'
                    : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                }`}
              >
                <p className="text-sm text-gray-700">
                  Not seeing your latest changes from GitHub? Try refreshing the page to sync your
                  starred repositories.
                </p>
              </div>
            </div>

            <button
              ref={signOutButtonRef}
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
