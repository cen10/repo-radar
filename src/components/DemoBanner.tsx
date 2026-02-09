import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { XMarkIcon } from '@heroicons/react/20/solid';
import { useDemoMode } from '../demo/demo-context';

export function DemoBanner() {
  const { isBannerVisible, exitDemoMode, dismissBanner, resetBannerDismissed } = useDemoMode();
  const location = useLocation();
  const navigate = useNavigate();
  const isExplorePage = location.pathname === '/explore';
  const prevPathnameRef = useRef(location.pathname);

  // Reset dismissed state when navigating TO /explore from another page
  useEffect(() => {
    const prevPathname = prevPathnameRef.current;
    const currentPathname = location.pathname;

    if (prevPathname !== currentPathname && currentPathname === '/explore') {
      resetBannerDismissed();
    }

    prevPathnameRef.current = currentPathname;
  }, [location.pathname, resetBannerDismissed]);

  const handleExitDemo = useCallback(() => {
    exitDemoMode();
    // Navigate to home and reload to clear demo state
    void navigate('/');
    window.location.reload();
  }, [exitDemoMode, navigate]);

  if (!isBannerVisible) {
    return null;
  }

  return (
    <div
      className="bg-indigo-600 text-white text-center py-2 px-4 text-sm fixed top-0 left-0 right-0 z-60"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <span>Demo Mode — This is sample data, not your real GitHub repos</span>

        {isExplorePage && (
          <span className="opacity-80">Try searching: react, typescript, python, ai, rust</span>
        )}

        <button
          onClick={handleExitDemo}
          className="underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600 rounded"
        >
          Exit Demo
        </button>

        <button
          onClick={dismissBanner}
          className="p-1 hover:bg-indigo-500 rounded focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Dismiss demo banner"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
