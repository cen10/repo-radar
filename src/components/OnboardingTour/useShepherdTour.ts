import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShepherd } from 'react-shepherd';
import { useOnboarding } from '../../contexts/use-onboarding';
import { configureStepsForShepherd, type TourStep } from './tourSteps';

/**
 * Custom hook that manages a Shepherd.js tour lifecycle.
 *
 * Handles tour creation, event listeners, keyboard navigation,
 * click-outside behavior, and cleanup. The tour is controlled
 * by the onboarding context's isTourActive state.
 */
export function useShepherdTour(pageSteps: TourStep[]) {
  const navigate = useNavigate();
  const Shepherd = useShepherd();
  const { isTourActive, completeTour, setCurrentStepId } = useOnboarding();
  const tourRef = useRef<InstanceType<typeof Shepherd.Tour> | null>(null);

  useEffect(() => {
    if (!isTourActive || pageSteps.length === 0) {
      if (tourRef.current?.isActive()) {
        void tourRef.current.cancel();
      }
      tourRef.current = null;
      return;
    }

    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        classes: 'shepherd-theme-custom',
        modalOverlayOpeningPadding: 8,
        modalOverlayOpeningRadius: 8,
      },
    });

    const handleBackTo = (stepId: string, path: string) => {
      sessionStorage.setItem('tour-start-from-step', stepId);
      void navigate(path);
    };

    const configuredSteps = configureStepsForShepherd(pageSteps, { tour, onBackTo: handleBackTo });
    tour.addSteps(configuredSteps);

    tour.on('complete', completeTour);
    tour.on('cancel', completeTour);

    const updateCurrentStepId = () => {
      const step = tour.getCurrentStep();
      setCurrentStepId(step?.id ?? null);
    };
    tour.on('show', updateCurrentStepId);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        void tour.cancel();
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const currentStep = tour.getCurrentStep();
        const tourStep = pageSteps.find((s) => s.id === currentStep?.id);
        const isFirstStepOnPage = tourStep?.id === pageSteps[0]?.id;

        if (tourStep?.backTo) {
          // Cross-page back navigation
          handleBackTo(tourStep.backTo.stepId, tourStep.backTo.path);
        } else if (!isFirstStepOnPage) {
          // Same-page back navigation
          void tour.back();
        }
        return;
      }

      if (e.key === 'ArrowRight') {
        const currentStep = tour.getCurrentStep();
        const tourStep = pageSteps.find((s) => s.id === currentStep?.id);
        if (tourStep?.advanceByClickingTarget) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);

    const handleOverlayClick = (e: MouseEvent) => {
      const target = e.target as Element;
      const isInsideTooltip = target.closest('.shepherd-element');
      const currentStep = tour.getCurrentStep();
      const tourStep = pageSteps.find((s) => s.id === currentStep?.id);
      const targetSelector = tourStep?.target;
      const isOnTarget = targetSelector && target.closest(targetSelector);

      if (!isInsideTooltip && !(tourStep?.canClickTarget && isOnTarget)) {
        void tour.cancel();
      }
    };
    document.addEventListener('click', handleOverlayClick, true);

    tourRef.current = tour;

    // Check for cross-page back navigation (e.g., Back button on repo-detail → radar page)
    const stepToResume = sessionStorage.getItem('tour-start-from-step');
    sessionStorage.removeItem('tour-start-from-step');
    const canResume = stepToResume && pageSteps.some((s) => s.id === stepToResume);

    if (canResume) {
      // Resume at the specific step (avoids race condition with first step's tooltipDelayMs)
      void tour.start();
      // Wait for first step's tooltipDelayMs (100ms) to resolve before switching
      setTimeout(() => void tour.show(stepToResume), 150);
    } else {
      // Normal forward navigation: start from first step on this page
      void tour.start();
    }

    return () => {
      tour.off('complete', completeTour);
      tour.off('cancel', completeTour);
      tour.off('show', updateCurrentStepId);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('click', handleOverlayClick, true);
      setCurrentStepId(null);
      if (tour.isActive()) {
        void tour.cancel();
      }
    };
  }, [isTourActive, pageSteps, Shepherd, completeTour, navigate, setCurrentStepId]);
}
