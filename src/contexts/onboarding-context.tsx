import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useDemoMode } from '../demo/demo-context';

const STORAGE_KEY = 'repo-radar-onboarding';

interface OnboardingContextType {
  hasCompletedTour: boolean;
  isTourActive: boolean;
  startTour: () => void;
  completeTour: () => void;
  /** Step ID to start from (for cross-page Back navigation) */
  startFromStep: string | null;
  setStartFromStep: (stepId: string | null) => void;
  /** Current active step ID (for conditional styling) */
  currentStepId: string | null;
  setCurrentStepId: (stepId: string | null) => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { isDemoMode } = useDemoMode();

  const [hasCompletedTour, setHasCompletedTour] = useState(() => {
    if (isDemoMode) return false;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
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

  // Persist completion to localStorage (except demo mode)
  useEffect(() => {
    if (!isDemoMode && hasCompletedTour) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ hasCompletedTour: true }));
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
    <OnboardingContext.Provider
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
      {children}
    </OnboardingContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- one-liner tightly coupled to OnboardingProvider
export function useOnboarding(): OnboardingContextType {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
