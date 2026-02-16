import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';
import {
  ArrowRightStartOnRectangleIcon,
  ExclamationCircleIcon,
  QuestionMarkCircleIcon,
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { SIGNOUT_FAILED } from '../constants/errorMessages';
import { logger } from '../utils/logger';
import { Button } from './Button';
import { useDemoMode } from '../demo/use-demo-mode';
import { useOnboarding } from '../contexts/use-onboarding';

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
// Positioned fixed below the header, adjusting for sidebar width on desktop
interface ErrorBannerProps {
  message: string;
  sidebarCollapsed?: boolean;
  demoBannerVisible?: boolean;
  onDismiss: () => void;
}

function ErrorBanner({
  message,
  sidebarCollapsed,
  demoBannerVisible,
  onDismiss,
}: ErrorBannerProps) {
  // On desktop (lg+), offset by sidebar width. Mobile has no persistent sidebar.
  const leftClass =
    sidebarCollapsed === undefined
      ? 'left-0' // No sidebar (not authenticated)
      : sidebarCollapsed
        ? 'left-0 lg:left-16' // Collapsed sidebar (64px)
        : 'left-0 lg:left-64'; // Expanded sidebar (256px)

  // Adjust top position when demo banner is visible (54px banner + 64px header = 118px)
  const topClass = demoBannerVisible ? 'top-[118px]' : 'top-16';

  return (
    <div
      className={`fixed ${topClass} right-0 z-40 bg-red-50 border-b border-red-200 px-4 py-3 sm:px-6 lg:px-8 transition-[left] duration-300 ease-in-out ${leftClass}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start">
        <div className="shrink-0">
          <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm text-red-800">{message}</p>
        </div>
        <button
          onClick={onDismiss}
          className="ml-3 shrink-0 rounded-md p-1 text-red-500 hover:bg-red-100 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-red-50"
          aria-label="Dismiss error"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

interface HeaderProps {
  onMenuToggle?: () => void;
  sidebarCollapsed?: boolean;
}

export function Header({ onMenuToggle, sidebarCollapsed }: HeaderProps) {
  const { user, signOut } = useAuth();
  const { isBannerVisible } = useDemoMode();
  const { restartTour } = useOnboarding();
  const navigate = useNavigate();
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
      void navigate('/');
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

  // Adjust top position when demo banner is visible
  const headerTopClass = isBannerVisible ? 'top-[54px]' : 'top-0';

  return (
    <>
      <header
        className={`bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 fixed left-0 right-0 z-50 transition-[top] duration-300 ease-in-out ${headerTopClass}`}
      >
        <div className="flex items-center justify-between h-16 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            {onMenuToggle && (
              <Button
                variant="ghost"
                size="md"
                onClick={onMenuToggle}
                className="lg:hidden"
                aria-label="Open navigation menu"
              >
                <Bars3Icon className="h-6 w-6" />
              </Button>
            )}
            <h1 className="text-xl font-semibold text-gray-900">Repo Radar</h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={`${user.name || user.login}'s avatar`}
                  className="h-8 w-8 rounded-full shrink-0"
                />
              ) : (
                <UserCircleIcon className="h-8 w-8 text-gray-400 shrink-0" aria-hidden="true" />
              )}
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user.name || user.login}</p>
                <p className="text-xs text-gray-500">@{user.login}</p>
              </div>
            </div>

            {/* Help button */}
            <div className="relative">
              <Button
                ref={helpButtonRef}
                variant="ghost"
                size="md"
                onClick={toggleHelp}
                aria-label="Help"
                aria-expanded={isHelpOpen}
                aria-controls="help-panel"
                data-tour="help-button"
              >
                <QuestionMarkCircleIcon className="h-5 w-5" />
              </Button>

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
                <div className="border-t border-gray-200 mt-3 -mx-4 w-[calc(100%+2rem)]" />
                <button
                  onClick={() => {
                    setIsHelpOpen(false);
                    // Clear any mid-tour navigation state to ensure fresh start
                    sessionStorage.removeItem('tour-start-from-step');
                    // Restart tour - this cancels existing tour, navigates, then starts fresh
                    restartTour('/stars', navigate);
                  }}
                  className="block w-[calc(100%+2rem)] text-left text-sm text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer px-4 py-2 -mx-4 -mb-4 rounded-b-lg hover:bg-indigo-200 transition-colors"
                >
                  Take the onboarding tour
                </button>
              </div>
            </div>

            <Button
              ref={signOutButtonRef}
              variant="secondary"
              onClick={handleSignOut}
              loading={isSigningOut}
              loadingText="Signing out..."
            >
              <ArrowRightStartOnRectangleIcon className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {signOutError && (
        <ErrorBanner
          message={signOutError}
          sidebarCollapsed={sidebarCollapsed}
          demoBannerVisible={isBannerVisible}
          onDismiss={() => setSignOutError(null)}
        />
      )}
    </>
  );
}
