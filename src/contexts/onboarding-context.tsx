import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { useDemoMode } from '../demo/use-demo-mode';
import { OnboardingContext, ONBOARDING_STORAGE_KEY } from './OnboardingContext';

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { isDemoMode } = useDemoMode();

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
  const [startFromStep, setStartFromStep] = useState<string | null>(null);
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
        completeTour,
        startFromStep,
        setStartFromStep,
        currentStepId,
        setCurrentStepId,
      }}
    >
      {/* Fallback overlay - visible during page transitions when Shepherd's overlay
          is absent. Instantly hidden via CSS :has() when Shepherd's overlay appears. */}
      {isTourActive && (
        <div
          className="tour-fallback-overlay fixed inset-0 bg-black/50 pointer-events-none"
          style={{ zIndex: 9996 }}
          aria-hidden="true"
        />
      )}
      {children}
    </OnboardingContext>
  );
}
