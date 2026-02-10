import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useDemoMode } from '../demo/demo-context';

const STORAGE_KEY = 'repo-radar-onboarding';

interface OnboardingState {
  hasCompletedTour: boolean;
  currentStep: number;
  isTourActive: boolean;
}

interface OnboardingContextType extends OnboardingState {
  startTour: () => void;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  completeTour: () => void;
  skipTour: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

const DEFAULT_STATE: OnboardingState = {
  hasCompletedTour: false,
  currentStep: 0,
  isTourActive: false,
};

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { isDemoMode } = useDemoMode();

  const [state, setState] = useState<OnboardingState>(() => {
    if (isDemoMode) return DEFAULT_STATE;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as OnboardingState;
        // Only restore completion flag, never restore mid-tour state
        return { ...DEFAULT_STATE, hasCompletedTour: parsed.hasCompletedTour };
      }
    } catch {
      // Ignore malformed localStorage
    }
    return DEFAULT_STATE;
  });

  // Persist completion to localStorage (except demo mode)
  useEffect(() => {
    if (!isDemoMode && state.hasCompletedTour) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ hasCompletedTour: true }));
    }
  }, [state.hasCompletedTour, isDemoMode]);

  const startTour = useCallback(() => {
    setState({ hasCompletedTour: false, currentStep: 0, isTourActive: true });
  }, []);

  const setStep = useCallback((step: number) => {
    setState((s) => ({ ...s, currentStep: step }));
  }, []);

  const nextStep = useCallback(() => {
    setState((s) => ({ ...s, currentStep: s.currentStep + 1 }));
  }, []);

  const prevStep = useCallback(() => {
    setState((s) => ({ ...s, currentStep: Math.max(0, s.currentStep - 1) }));
  }, []);

  const completeTour = useCallback(() => {
    setState({ hasCompletedTour: true, currentStep: 0, isTourActive: false });
  }, []);

  const skipTour = useCallback(() => {
    setState({ hasCompletedTour: true, currentStep: 0, isTourActive: false });
  }, []);

  return (
    <OnboardingContext.Provider
      value={{ ...state, startTour, setStep, nextStep, prevStep, completeTour, skipTour }}
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
