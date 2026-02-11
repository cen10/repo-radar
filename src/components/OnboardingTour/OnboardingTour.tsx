import { useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useShepherd } from 'react-shepherd';
import { useOnboarding } from '../../contexts/onboarding-context';
import { getTourStepDefs, toShepherdSteps, getCurrentPage } from './tourSteps';
// Base Shepherd styles for structural layout (positioning, modal overlay, element attachment).
// Visual customizations (colors, buttons, spacing) are in src/index.css.
import 'shepherd.js/dist/css/shepherd.css';

interface OnboardingTourProps {
  hasStarredRepos: boolean;
}

export function OnboardingTour({ hasStarredRepos }: OnboardingTourProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const Shepherd = useShepherd();
  const { isTourActive, completeTour, setCurrentStepId } = useOnboarding();
  const tourRef = useRef<InstanceType<typeof Shepherd.Tour> | null>(null);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  const stepDefs = useMemo(() => {
    const allDefs = getTourStepDefs({ hasStarredRepos });
    return isMobile ? allDefs.filter((s) => !s.desktopOnly) : allDefs;
  }, [hasStarredRepos, isMobile]);

  // Filter to only show steps for the current page
  const currentPage = getCurrentPage(location.pathname);

  const pageStepDefs = useMemo(
    () => stepDefs.filter((s) => s.page === currentPage),
    [stepDefs, currentPage]
  );

  const handleComplete = useCallback(() => {
    completeTour();
  }, [completeTour]);

  // Create and start/stop tour when isTourActive changes
  useEffect(() => {
    if (!isTourActive || pageStepDefs.length === 0) {
      // If tour should stop, cancel any active tour
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
      // Use sessionStorage for reliable cross-navigation state
      sessionStorage.setItem('tour-start-from-step', stepId);
      void navigate(path);
    };

    const shepherdSteps = toShepherdSteps(pageStepDefs, { tour, onBackTo: handleBackTo });
    tour.addSteps(shepherdSteps);

    tour.on('complete', handleComplete);
    tour.on('cancel', handleComplete);

    // Track current step for conditional styling (e.g., radar icon pulse)
    // Also auto-focus the primary button for keyboard navigation
    let focusTimeout: ReturnType<typeof setTimeout> | null = null;
    const handleStepShow = () => {
      const step = tour.getCurrentStep();
      setCurrentStepId(step?.id ?? null);

      // Clear any pending focus timeout from previous step
      if (focusTimeout) {
        clearTimeout(focusTimeout);
      }

      // Focus the Next/Finish button for keyboard navigation
      const focusButton = () => {
        const primaryButton = document.querySelector(
          '.shepherd-element .shepherd-button:not(.shepherd-button-secondary)'
        ) as HTMLButtonElement | null;
        if (primaryButton) {
          primaryButton.focus();
        }
      };
      focusTimeout = setTimeout(focusButton, 500);
    };
    tour.on('show', handleStepShow);

    // Handle keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key cancels the tour
      if (e.key === 'Escape') {
        e.preventDefault();
        void tour.cancel();
        return;
      }

      // Block right arrow navigation on steps that hide the Next button
      // (these steps expect a click action to navigate to another page)
      if (e.key === 'ArrowRight') {
        const currentStep = tour.getCurrentStep();
        const stepDef = pageStepDefs.find((s) => s.id === currentStep?.id);
        if (stepDef?.hideNextOnly || stepDef?.advanceOn) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);

    // Click outside the tooltip cancels the tour
    const handleOverlayClick = (e: MouseEvent) => {
      const target = e.target as Element;
      // Check if click is inside the shepherd tooltip
      const isInsideTooltip = target.closest('.shepherd-element');
      // Check if click is on the highlighted target element (canClickTarget steps)
      const currentStep = tour.getCurrentStep();
      const stepDef = pageStepDefs.find((s) => s.id === currentStep?.id);
      const targetSelector = stepDef?.target;
      const isOnTarget = targetSelector && target.closest(targetSelector);

      // Cancel tour if clicking outside tooltip and not on an interactive target
      if (!isInsideTooltip && !(stepDef?.canClickTarget && isOnTarget)) {
        void tour.cancel();
      }
    };
    document.addEventListener('click', handleOverlayClick, true);

    // Check if we should start from a specific step (cross-page Back navigation)
    const savedStartFromStep = sessionStorage.getItem('tour-start-from-step');
    if (savedStartFromStep) {
      sessionStorage.removeItem('tour-start-from-step');
      const stepIndex = pageStepDefs.findIndex((s) => s.id === savedStartFromStep);
      if (stepIndex >= 0) {
        // Show the specific step after tour starts
        setTimeout(() => tour.show(savedStartFromStep), 0);
      }
    }

    // Hide tooltip when radar icon is clicked (modal opens)
    const handleRadarIconClick = (e: Event) => {
      const target = e.target as Element;
      const radarIcon = target.closest('[data-tour="radar-icon"]');
      const currentStep = tour.getCurrentStep();

      if (radarIcon && currentStep?.id === 'radar-icon') {
        // Hide the tooltip while modal is open
        currentStep.hide();
      }
    };
    document.addEventListener('click', handleRadarIconClick, true);

    // Manual event listener for Done button in AddToRadar modal
    // Shepherd's advanceOn doesn't work with Headless UI portals, so we handle it manually
    const handleDoneClick = (e: Event) => {
      const target = e.target as Element;
      const isDoneButton = target.tagName === 'BUTTON' && target.textContent?.trim() === 'Done';
      const currentStep = tour.getCurrentStep();

      if (isDoneButton && currentStep?.id === 'radar-icon') {
        setTimeout(() => tour.next(), 0);
      }
    };
    document.addEventListener('pointerdown', handleDoneClick, true);

    tourRef.current = tour;
    void tour.start();

    return () => {
      // Detach Shepherd event handlers FIRST, before canceling
      // This prevents navigation from triggering completeTour()
      tour.off('complete', handleComplete);
      tour.off('cancel', handleComplete);
      tour.off('show', handleStepShow);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('click', handleOverlayClick, true);
      document.removeEventListener('click', handleRadarIconClick, true);
      document.removeEventListener('pointerdown', handleDoneClick, true);
      if (focusTimeout) {
        clearTimeout(focusTimeout);
      }
      setCurrentStepId(null);
      // Now cancel the tour (won't trigger handleComplete since we unsubscribed)
      if (tour.isActive()) {
        void tour.cancel();
      }
    };
  }, [isTourActive, pageStepDefs, Shepherd, handleComplete, navigate, setCurrentStepId]);

  return null;
}
