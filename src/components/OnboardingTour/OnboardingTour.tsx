import { useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useShepherd } from 'react-shepherd';
import { useOnboarding } from '../../contexts/onboarding-context';
import { getTourStepDefs, toShepherdSteps, getCurrentPage } from './tourSteps';
import 'shepherd.js/dist/css/shepherd.css';

interface OnboardingTourProps {
  hasStarredRepos: boolean;
}

export function OnboardingTour({ hasStarredRepos }: OnboardingTourProps) {
  const location = useLocation();
  const Shepherd = useShepherd();
  const { isTourActive, completeTour } = useOnboarding();
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

    const shepherdSteps = toShepherdSteps(pageStepDefs, tour);
    tour.addSteps(shepherdSteps);

    tour.on('complete', handleComplete);
    tour.on('cancel', handleComplete);

    tourRef.current = tour;
    void tour.start();

    return () => {
      tour.off('complete', handleComplete);
      tour.off('cancel', handleComplete);
      if (tour.isActive()) {
        void tour.cancel();
      }
    };
  }, [isTourActive, pageStepDefs, Shepherd, handleComplete]);

  return null;
}
