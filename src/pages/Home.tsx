import { useAuth } from '../hooks/useAuth';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../components/icons';
import { Button } from '../components/Button';
import { useDemoMode } from '../demo/use-demo-mode';

const Home = () => {
  const { user, authLoading, signInWithGitHub } = useAuth();
  const { enterDemoMode, isInitializing: isDemoInitializing } = useDemoMode();
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [demoError, setDemoError] = useState(false);
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
    setDemoError(false);
    const result = await enterDemoMode();
    if (result.success) {
      // Force a page reload to reinitialize auth with demo user
      window.location.href = '/stars';
    } else {
      setDemoError(true);
    }
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
        className="min-h-screen bg-indigo-50 flex items-center justify-center"
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
    <div className="min-h-screen bg-indigo-50 flex items-center justify-center px-8 md:px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Repo Radar</h1>
        <p className="text-xl text-gray-600 mb-5 max-w-2xl mx-auto">
          Organize and explore your GitHub starred repositories.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12 text-left max-w-3xl mx-auto">
          <div className="bg-white rounded-lg p-4 md:p-6 shadow-sm">
            <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-1">
              <span className="text-xl md:text-2xl">📊</span>
              Repository Stats
            </h3>
            <p className="text-gray-600 text-sm">
              View stars, forks, and recent activity at a glance
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 md:p-6 shadow-sm">
            <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-1">
              <span className="text-xl md:text-2xl">🚀</span>
              Release Updates
            </h3>
            <p className="text-gray-600 text-sm">
              Stay informed about new releases and version updates
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 md:p-6 shadow-sm">
            <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-1">
              <span className="text-xl md:text-2xl">📡</span>
              Custom Radars
            </h3>
            <p className="text-gray-600 text-sm">
              Organize repositories into collections by topic or project
            </p>
          </div>
        </div>

        {sessionExpired && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg" role="alert">
            <p className="text-amber-800">Your session has expired. Please sign in again.</p>
          </div>
        )}

        {demoError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
            <p className="text-red-800">
              Demo mode is currently unavailable. Please try again later.
            </p>
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

        <div className="mt-4 text-gray-500">
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

        {/* Mobile-only tip about tour being desktop-only */}
        <p className="mt-4 text-xs text-gray-500 lg:hidden">
          Use demo mode on desktop to get a guided tour.
        </p>

        <a
          href="https://github.com/cen10/repo-radar"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-block text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          View source on GitHub
        </a>
      </div>
    </div>
  );
};

export default Home;
