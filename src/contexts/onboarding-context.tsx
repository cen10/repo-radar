import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { useDemoMode } from '../demo/use-demo-mode';
import { OnboardingContext, ONBOARDING_STORAGE_KEY } from './OnboardingContext';

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { isDemoMode } = useDemoMode();
  // Tour is desktop-only (matches lg: breakpoint)
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;

  const [hasCompletedTour, setHasCompletedTour] = useState(() => {
    if (isDemoMode) return false;
    try {
      const saved = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { hasCompletedTour: boolean };
        return parsed.hasCompletedTour;
      }
    } catch {
      // Ignore malformed localStorage
    }
    return false;
  });

  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);

  // Persist completion to localStorage for real users only.
  // Demo mode skips persistence so each demo session shows a fresh tour.
  useEffect(() => {
    if (!isDemoMode && hasCompletedTour) {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ hasCompletedTour: true }));
    }
  }, [hasCompletedTour, isDemoMode]);

  const startTour = useCallback(() => {
    setHasCompletedTour(false);
    setIsTourActive(true);
  }, []);

  const restartTour = useCallback((navigateTo?: string, navigateFn?: (path: string) => void) => {
    setHasCompletedTour(false);
    setIsTourActive(false);

    if (navigateTo && navigateFn) {
      // Signal that tour should start after navigation completes
      sessionStorage.setItem('tour-pending-start', 'true');
      navigateFn(navigateTo);
    } else {
      setIsTourActive(true);
    }
  }, []);

  const completeTour = useCallback(() => {
    setHasCompletedTour(true);
    setIsTourActive(false);
    setCurrentStepId(null);
  }, []);

  return (
    <OnboardingContext
      value={{
        hasCompletedTour,
        isTourActive,
        startTour,
        restartTour,
        completeTour,
        currentStepId,
        setCurrentStepId,
      }}
    >
      {/* Fallback overlay - visible on desktop when tour is active OR when tour is about
          to start (demo mode users who haven't completed tour). This ensures the overlay
          is present before Shepherd initializes, preventing a flash of the unmasked page.
          Instantly hidden via CSS :has() when Shepherd's overlay appears.
          Hidden on mobile since tour is desktop-only. */}
      {isDesktop && (isTourActive || (isDemoMode && !hasCompletedTour)) && (
        <div
          className="tour-fallback-overlay fixed inset-0 bg-black/20 pointer-events-none"
          style={{ zIndex: 9996 }}
          aria-hidden="true"
        />
      )}
      {children}
    </OnboardingContext>
  );
}
