import { useState, useEffect } from 'react';

/**
 * Hook to track a CSS media query match state.
 *
 * @param query - CSS media query string (e.g., '(max-width: 767px)')
 * @returns boolean indicating if the query matches
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 767px)');
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/**
 * Hook to detect if viewport is mobile (<768px, below Tailwind's md breakpoint).
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}
