import { useAuth } from '../hooks/useAuth';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../components/icons';
import { Button } from '../components/Button';
import { useDemoMode } from '../demo/demo-context';

const Home = () => {
  const { user, authLoading, signInWithGitHub } = useAuth();
  const { enterDemoMode, isInitializing: isDemoInitializing } = useDemoMode();
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const signInButtonRef = useRef<HTMLButtonElement>(null);

  // Check if user was redirected here due to session expiration
  useEffect(() => {
    if (sessionStorage.getItem('session_expired')) {
      setSessionExpired(true);
      sessionStorage.removeItem('session_expired');
    }
  }, []);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGitHub();
    } catch {
      // Reset button state so user can retry (e.g., network error, popup blocked)
      setIsSigningIn(false);
    }
  };

  const handleTryDemo = async () => {
    await enterDemoMode();
    // Force a page reload to reinitialize auth with demo user
    window.location.href = '/stars';
  };

  useEffect(() => {
    if (!authLoading && user) {
      void navigate('/stars');
    }
  }, [user, authLoading, navigate]);

  // Focus the sign-in button when the page loads
  useEffect(() => {
    if (!authLoading && !user) {
      signInButtonRef.current?.focus();
    }
  }, [authLoading, user]);

  // Show loading spinner while checking auth state to prevent flash
  if (authLoading) {
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

        {sessionExpired && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg" role="alert">
            <p className="text-amber-800">Your session has expired. Please sign in again.</p>
          </div>
        )}

        <Button
          ref={signInButtonRef}
          size="lg"
          onClick={handleSignIn}
          loading={isSigningIn}
          loadingText="Signing in..."
        >
          Sign in with GitHub
        </Button>

        <div className="mt-8 text-gray-500">
          <p className="text-sm mb-3">Just exploring?</p>
          <Button
            variant="secondary"
            size="lg"
            onClick={handleTryDemo}
            loading={isDemoInitializing}
            loadingText="Starting demo..."
          >
            Try Demo
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Home;
