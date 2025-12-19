import { useState } from 'react';
import { useAuth } from '../hooks/use-auth';
import { supabase } from '../services/supabase';
import { LoadingSpinner, ArrowRightOnRectangleIcon } from './icons';
import { SIGNOUT_FAILED } from '../constants/errorMessages';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/error';

export function Header() {
  const { user } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const handleSignOut = async () => {
    try {
      setSignOutError(null);
      setIsSigningOut(true);

      const { error } = await supabase.auth.signOut();
      if (error) {
        const message = getErrorMessage(error, SIGNOUT_FAILED);
        logger.error('Sign out error:', error);
        setSignOutError(message);
        setIsSigningOut(false);
        return;
      }
    } catch (err) {
      const message = getErrorMessage(err, SIGNOUT_FAILED);
      logger.error('Unexpected sign out error:', err);
      setSignOutError(message);
      setIsSigningOut(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-16 max-w-7xl mx-auto">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold text-gray-900">Repo Radar</h1>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            {user.avatarUrl && (
              <img
                src={user.avatarUrl}
                alt={`${user.name || user.login}'s avatar`}
                className="h-8 w-8 rounded-full"
              />
            )}
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{user.name || user.login}</p>
              {user.email && <p className="text-xs text-gray-500">{user.email}</p>}
            </div>
          </div>

          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Sign out"
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

      {signOutError && (
        <div className="bg-red-50 border-t border-red-200 px-4 py-3 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <p className="text-sm text-red-800">{signOutError}</p>
          </div>
        </div>
      )}
    </header>
  );
}
