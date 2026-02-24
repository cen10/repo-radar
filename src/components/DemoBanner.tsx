import { useCallback, useEffect, useRef } from 'react';
import { useAppRouter } from '../hooks/routing';
import { XMarkIcon } from '@heroicons/react/20/solid';
import { useDemoMode } from '../demo/use-demo-mode';

export function DemoBanner() {
  const { isBannerVisible, exitDemoMode, dismissBanner, resetBannerDismissed } = useDemoMode();
  const { pathname } = useAppRouter();
  const isExplorePage = pathname === '/explore';
  const prevPathnameRef = useRef(pathname);

  // Reset dismissed state when navigating TO /explore from another page
  useEffect(() => {
    const prevPathname = prevPathnameRef.current;

    if (prevPathname !== pathname && pathname === '/explore') {
      resetBannerDismissed();
    }

    prevPathnameRef.current = pathname;
  }, [pathname, resetBannerDismissed]);

  const handleExitDemo = useCallback(() => {
    exitDemoMode();
    // Navigate to home and reload to clear demo state in one atomic operation
    window.location.href = '/';
  }, [exitDemoMode]);

  if (!isBannerVisible) {
    return null;
  }

  return (
    <div
      className="bg-indigo-600 text-white text-center py-3 px-4 text-sm fixed top-0 left-0 right-0 z-toast"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-center gap-3">
        {!isExplorePage && <span>Demo Mode – sample data</span>}

        {isExplorePage && <span>Try: react, typescript, ai, rust</span>}

        <button
          onClick={handleExitDemo}
          className="px-1.5 py-1 border border-white/50 rounded hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600"
        >
          Exit Demo
        </button>
      </div>

      <button
        onClick={dismissBanner}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-indigo-500 rounded focus:outline-none focus:ring-2 focus:ring-white"
        aria-label="Dismiss demo banner"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
