import { useAuth } from '../hooks/useAuth';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../components/icons';

const Home = () => {
  const { user, loading, signInWithGitHub } = useAuth();
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const signInButtonRef = useRef<HTMLButtonElement>(null);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGitHub();
    } catch {
      // Reset button state so user can retry (e.g., network error, popup blocked)
      setIsSigningIn(false);
    }
  };

  useEffect(() => {
    if (!loading && user) {
      void navigate('/stars');
    }
  }, [user, loading, navigate]);

  // Focus the sign-in button when the page loads
  useEffect(() => {
    if (!loading && !user) {
      signInButtonRef.current?.focus();
    }
  }, [loading, user]);

  // Show loading spinner while checking auth state to prevent flash
  if (loading) {
    return (
      <div
        className="min-h-screen bg-linear-to-br from-indigo-50 to-purple-50 flex items-center justify-center"
        role="status"
        aria-label="Loading"
      >
        <LoadingSpinner className="h-12 w-12 text-indigo-600" />
      </div>
    );
  }

  // If user is authenticated, show nothing while redirect happens
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">Repo Radar</h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Track momentum and activity across your starred GitHub repositories. Monitor star growth,
          releases, and issue activity all in one place.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 text-left max-w-3xl mx-auto">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-indigo-600 text-2xl mb-2">📊</div>
            <h3 className="font-semibold text-gray-900 mb-1">Track Growth</h3>
            <p className="text-gray-600 text-sm">
              Monitor star counts and growth trends across repositories
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-indigo-600 text-2xl mb-2">🚀</div>
            <h3 className="font-semibold text-gray-900 mb-1">Release Updates</h3>
            <p className="text-gray-600 text-sm">
              Stay informed about new releases and version updates
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-indigo-600 text-2xl mb-2">🔔</div>
            <h3 className="font-semibold text-gray-900 mb-1">Activity Alerts</h3>
            <p className="text-gray-600 text-sm">
              Get notified about trending repos and increased activity
            </p>
          </div>
        </div>

        <button
          ref={signInButtonRef}
          onClick={handleSignIn}
          disabled={isSigningIn}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSigningIn ? (
            <>
              <LoadingSpinner className="h-5 w-5 mr-2" />
              Signing in...
            </>
          ) : (
            'Sign in with GitHub'
          )}
        </button>
      </div>
    </div>
  );
};

export default Home;
