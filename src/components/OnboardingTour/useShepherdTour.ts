import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShepherd } from 'react-shepherd';
import { useOnboarding } from '../../contexts/use-onboarding';
import { configureStepsForShepherd, type TourStep } from './tourSteps';

/**
 * Custom hook that manages a Shepherd.js tour lifecycle.
 *
 * Handles tour creation, event listeners, keyboard navigation,
 * and cleanup. The tour is controlled by the onboarding context's
 * isTourActive state.
 *
 * Exit behavior: Users must click the X button to exit, which shows a
 * confirmation modal. Clicking outside the tour tooltip does not dismiss it.
 */
export function useShepherdTour(pageSteps: TourStep[]) {
  const navigate = useNavigate();
  const Shepherd = useShepherd();
  const { isTourActive, completeTour, setCurrentStepId, exitTour, showExitConfirmation } =
    useOnboarding();
  const tourRef = useRef<InstanceType<typeof Shepherd.Tour> | null>(null);
  // Track current step to preserve position when effect re-runs (e.g., hasStarredRepos changes)
  const currentStepRef = useRef<string | null>(null);
  // Track exit confirmation state without adding to effect deps (would recreate tour)
  const showExitConfirmationRef = useRef(false);
  showExitConfirmationRef.current = showExitConfirmation;

  useEffect(() => {
    // Use a cancelled flag to prevent the first effect's tour from starting
    // when React Strict Mode double-invokes effects
    let cancelled = false;

    // Clean up any existing tour before creating a new one
    if (tourRef.current) {
      void tourRef.current.cancel();
      tourRef.current = null;
    }
    // Also remove any orphaned Shepherd DOM elements
    document.querySelectorAll('.shepherd-element').forEach((el) => el.remove());

    if (!isTourActive || pageSteps.length === 0) {
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
    tourRef.current = tour;

    const handleBackTo = (stepId: string, path: string) => {
      sessionStorage.setItem('tour-start-from-step', stepId);
      void navigate(path);
    };

    const configuredSteps = configureStepsForShepherd(pageSteps, { tour, onBackTo: handleBackTo });
    tour.addSteps(configuredSteps);

    // Only mark tour as completed when it naturally completes (user reaches the end).
    // Do NOT call completeTour on cancel - cancel happens during cleanup/unmount,
    // and we want the tour to resume on refresh.
    tour.on('complete', () => {
      currentStepRef.current = null;
      completeTour();
    });

    const updateCurrentStepId = () => {
      const step = tour.getCurrentStep();
      const stepId = step?.id ?? null;
      currentStepRef.current = stepId;
      setCurrentStepId(stepId);
    };
    tour.on('show', updateCurrentStepId);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showExitConfirmationRef.current) {
          // Let the confirmation modal handle Escape via HeadlessUI Dialog
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        exitTour();
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
          e.stopImmediatePropagation();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);

    // Intercept clicks on the cancel icon (X button) to show confirmation modal
    // instead of immediately cancelling the tour. Uses capturing to handle
    // the event before Shepherd processes it.
    const handleCancelIconClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target.closest('.shepherd-cancel-icon')) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        exitTour();
      }
    };
    document.addEventListener('click', handleCancelIconClick, true);

    // Determine which step to show:
    // 1. Cross-page back navigation (sessionStorage flag from backTo)
    // 2. Same-page effect re-run (currentStepRef preserved from previous tour instance)
    // 3. Normal start (first step on this page)
    // Note: We intentionally don't resume to the exact persisted step on refresh because
    // the target element may not be ready yet (async loading). Starting from the first
    // step of the current page is more reliable.
    const crossPageStep = sessionStorage.getItem('tour-start-from-step');
    sessionStorage.removeItem('tour-start-from-step');
    const samePageStep = currentStepRef.current;

    const stepToResume =
      (crossPageStep && pageSteps.some((s) => s.id === crossPageStep) && crossPageStep) ||
      (samePageStep && pageSteps.some((s) => s.id === samePageStep) && samePageStep);

    // Defer tour start to next tick so cleanup can cancel it if React Strict Mode
    // double-invokes this effect. Without this, both effects' tours would start.
    const startTimeout = setTimeout(() => {
      if (cancelled) return;
      if (stepToResume) {
        void tour.show(stepToResume);
      } else {
        void tour.start();
      }
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(startTimeout);
      tour.off('show', updateCurrentStepId);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('click', handleCancelIconClick, true);
      // Clean up visual focus styling that may remain on target elements
      document.querySelectorAll('.tour-keyboard-focus').forEach((el) => {
        el.classList.remove('tour-keyboard-focus');
      });
      // Don't clear currentStepId or currentStepRef - they're needed to resume after refresh
      void tour.cancel();
    };
  }, [isTourActive, pageSteps, Shepherd, completeTour, navigate, setCurrentStepId, exitTour]);
}
