import { createContext } from 'react';

export const ONBOARDING_STORAGE_KEY = 'repo-radar-onboarding';

export interface OnboardingContextType {
  hasCompletedTour: boolean;
  isTourActive: boolean;
  startTour: () => void;
  completeTour: () => void;
  /** Current active step ID (for conditional styling) */
  currentStepId: string | null;
  setCurrentStepId: (stepId: string | null) => void;
}

export const OnboardingContext = createContext<OnboardingContextType | null>(null);
