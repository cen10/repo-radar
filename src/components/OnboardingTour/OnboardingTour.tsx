import { useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useOnboarding } from '../../contexts/onboarding-context';
import { getTourSteps, getCurrentPage } from './tourSteps';
import { TourOverlay } from './TourOverlay';

interface OnboardingTourProps {
  hasStarredRepos: boolean;
}

export function OnboardingTour({ hasStarredRepos }: OnboardingTourProps) {
  const location = useLocation();
  const { isTourActive, currentStep, nextStep, prevStep, completeTour, skipTour, setStep } =
    useOnboarding();
  const prevPathnameRef = useRef(location.pathname);

  const allSteps = useMemo(() => getTourSteps({ hasStarredRepos }), [hasStarredRepos]);

  const currentPage = getCurrentPage(location.pathname);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  // Filter out desktop-only steps on mobile
  const activeSteps = useMemo(
    () => (isMobile ? allSteps.filter((s) => !s.desktopOnly) : allSteps),
    [allSteps, isMobile]
  );

  // Auto-advance when user navigates to a new page that has tour steps
  useEffect(() => {
    if (!isTourActive) return;

    const prevPage = getCurrentPage(prevPathnameRef.current);
    prevPathnameRef.current = location.pathname;

    if (prevPage === currentPage) return;
    if (!currentPage) return;

    // Find the first step for the new page
    const nextPageStepIndex = activeSteps.findIndex((s) => s.page === currentPage);
    if (nextPageStepIndex !== -1 && nextPageStepIndex > currentStep) {
      setStep(nextPageStepIndex);
    }
  }, [location.pathname, currentPage, isTourActive, activeSteps, currentStep, setStep]);

  if (!isTourActive) return null;

  // Bounds check
  if (currentStep >= activeSteps.length) {
    completeTour();
    return null;
  }

  const step = activeSteps[currentStep];

  // Only show steps for the current page
  if (step.page !== currentPage) return null;

  const handleNext = () => {
    if (currentStep >= activeSteps.length - 1) {
      completeTour();
    } else {
      nextStep();
    }
  };

  const handlePrev = () => {
    // Only go back within the same page
    const prevStepDef = activeSteps[currentStep - 1];
    if (prevStepDef && prevStepDef.page === currentPage) {
      prevStep();
    }
  };

  return (
    <TourOverlay
      key={`tour-step-${currentStep}`}
      target={step.target}
      content={step.content}
      placement={step.placement}
      spotlightClicks={step.spotlightClicks}
      currentStep={currentStep}
      totalSteps={activeSteps.length}
      onNext={handleNext}
      onPrev={handlePrev}
      onSkip={skipTour}
      isFirst={currentStep === 0 || activeSteps[currentStep - 1]?.page !== currentPage}
      isLast={currentStep === activeSteps.length - 1}
    />
  );
}
