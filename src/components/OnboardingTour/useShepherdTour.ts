import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShepherd } from 'react-shepherd';
import { useOnboarding } from '../../contexts/onboarding-context';
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

    const handleStepShow = () => {
      const step = tour.getCurrentStep();
      setCurrentStepId(step?.id ?? null);
    };
    tour.on('show', handleStepShow);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        void tour.cancel();
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

    const savedStartFromStep = sessionStorage.getItem('tour-start-from-step');
    if (savedStartFromStep) {
      sessionStorage.removeItem('tour-start-from-step');
      const stepIndex = pageSteps.findIndex((s) => s.id === savedStartFromStep);
      if (stepIndex >= 0) {
        setTimeout(() => tour.show(savedStartFromStep), 0);
      }
    }

    tourRef.current = tour;
    void tour.start();

    return () => {
      tour.off('complete', completeTour);
      tour.off('cancel', completeTour);
      tour.off('show', handleStepShow);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('click', handleOverlayClick, true);
      setCurrentStepId(null);
      if (tour.isActive()) {
        void tour.cancel();
      }
    };
  }, [isTourActive, pageSteps, Shepherd, completeTour, navigate, setCurrentStepId]);
}
