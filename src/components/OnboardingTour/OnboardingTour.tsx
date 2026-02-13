import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { getCurrentPage } from './tourSteps';
import { getTourSteps } from './tourContent';
import { useShepherdTour } from './useShepherdTour';

interface OnboardingTourProps {
  hasStarredRepos: boolean;
}

export function OnboardingTour({ hasStarredRepos }: OnboardingTourProps) {
  const location = useLocation();

  const steps = useMemo(() => getTourSteps(hasStarredRepos), [hasStarredRepos]);

  const currentPage = getCurrentPage(location.pathname);

  const pageSteps = useMemo(
    () => steps.filter((s) => s.page === currentPage),
    [steps, currentPage]
  );

  useShepherdTour(pageSteps);

  // Shepherd.js manages its own DOM (tooltips, overlay) outside React
  return null;
}
