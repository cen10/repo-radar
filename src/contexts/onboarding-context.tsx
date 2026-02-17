import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useDemoMode } from '../demo/use-demo-mode';
import { OnboardingContext, ONBOARDING_STORAGE_KEY } from './OnboardingContext';
import { ExitTourConfirmationModal } from '../components/OnboardingTour/ExitTourConfirmationModal';

const DEMO_ONBOARDING_SESSION_KEY = 'demo-onboarding';

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { isDemoMode } = useDemoMode();
  // Tour is desktop-only (matches lg: breakpoint)
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;

  const [hasCompletedTour, setHasCompletedTour] = useState(() => {
    try {
      // Demo mode: use sessionStorage so completion persists across refresh but not new sessions
      // Real users: use localStorage for permanent persistence
      const storage = isDemoMode ? sessionStorage : localStorage;
      const key = isDemoMode ? DEMO_ONBOARDING_SESSION_KEY : ONBOARDING_STORAGE_KEY;
      const saved = storage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved) as { hasCompletedTour: boolean };
        return parsed.hasCompletedTour;
      }
    } catch {
      // Ignore malformed storage
    }
    return false;
  });

  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);

  // Track previous completion state to detect transitions
  const prevHasCompletedTourRef = useRef(hasCompletedTour);

  // Persist completion state when tour is completed.
  // Only write when hasCompletedTour transitions to true, not when isDemoMode changes.
  // This prevents writing to the wrong storage when exiting demo mode.
  // Demo mode: sessionStorage (survives refresh, clears on new session)
  // Real users: localStorage (permanent)
  useEffect(() => {
    const justCompleted = hasCompletedTour && !prevHasCompletedTourRef.current;
    prevHasCompletedTourRef.current = hasCompletedTour;

    if (justCompleted) {
      const storage = isDemoMode ? sessionStorage : localStorage;
      const key = isDemoMode ? DEMO_ONBOARDING_SESSION_KEY : ONBOARDING_STORAGE_KEY;
      storage.setItem(key, JSON.stringify({ hasCompletedTour: true }));
    }
  }, [hasCompletedTour, isDemoMode]);

  const startTour = useCallback(() => {
    setHasCompletedTour(false);
    setIsTourActive(true);
  }, []);

  const restartTour = (navigateTo?: string, navigateFn?: (path: string) => void) => {
    setHasCompletedTour(false);
    setIsTourActive(false);

    // Clear persisted completion so refresh mid-tour doesn't restore "completed" state
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    sessionStorage.removeItem(DEMO_ONBOARDING_SESSION_KEY);

    if (navigateTo && navigateFn) {
      // Signal that tour should start after navigation completes
      sessionStorage.setItem('tour-pending-start', 'true');
      navigateFn(navigateTo);
    } else {
      setIsTourActive(true);
    }
  };

  const completeTour = useCallback(() => {
    setHasCompletedTour(true);
    setIsTourActive(false);
    setCurrentStepId(null);
  }, []);

  const exitTour = useCallback(() => {
    setShowExitConfirmation(true);
  }, []);

  const confirmExitTour = () => {
    setShowExitConfirmation(false);
    completeTour();
  };

  const cancelExitTour = () => {
    setShowExitConfirmation(false);
  };

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
        showExitConfirmation,
        exitTour,
        confirmExitTour,
        cancelExitTour,
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
      <ExitTourConfirmationModal />
      {children}
    </OnboardingContext>
  );
}
