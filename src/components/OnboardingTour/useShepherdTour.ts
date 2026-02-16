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
  // Track current step to preserve position when effect re-runs (e.g., hasStarredRepos changes)
  const currentStepRef = useRef<string | null>(null);

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

    const handleTourEnd = () => {
      currentStepRef.current = null;
      completeTour();
    };
    tour.on('complete', handleTourEnd);
    tour.on('cancel', handleTourEnd);

    const updateCurrentStepId = () => {
      const step = tour.getCurrentStep();
      const stepId = step?.id ?? null;
      currentStepRef.current = stepId;
      setCurrentStepId(stepId);
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
        e.stopPropagation();
        e.stopImmediatePropagation();

        const currentStep = tour.getCurrentStep();
        const currentStepIndex = pageSteps.findIndex((s) => s.id === currentStep?.id);
        const tourStep = currentStepIndex >= 0 ? pageSteps[currentStepIndex] : null;

        if (tourStep?.backTo) {
          handleBackTo(tourStep.backTo.stepId, tourStep.backTo.path);
        } else if (currentStepIndex > 0) {
          // Use numeric index with forward=false to match Shepherd's back() behavior
          void tour.show(currentStepIndex - 1, false);
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

    // Determine which step to show:
    // 1. Cross-page back navigation (sessionStorage flag from backTo)
    // 2. Same-page effect re-run (currentStepRef preserved from previous tour instance)
    // 3. Normal start (first step on this page)
    const crossPageStep = sessionStorage.getItem('tour-start-from-step');
    sessionStorage.removeItem('tour-start-from-step');
    const samePageStep = currentStepRef.current;

    const stepToResume =
      (crossPageStep && pageSteps.some((s) => s.id === crossPageStep) && crossPageStep) ||
      (samePageStep && pageSteps.some((s) => s.id === samePageStep) && samePageStep);

    if (stepToResume) {
      void tour.show(stepToResume);
    } else {
      void tour.start();
    }

    return () => {
      tour.off('complete', handleTourEnd);
      tour.off('cancel', handleTourEnd);
      tour.off('show', updateCurrentStepId);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('click', handleOverlayClick, true);
      setCurrentStepId(null);
      // Don't clear currentStepRef here - it's needed to resume after effect re-runs
      if (tour.isActive()) {
        void tour.cancel();
      }
    };
  }, [isTourActive, pageSteps, Shepherd, completeTour, navigate, setCurrentStepId]);
}
