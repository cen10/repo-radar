import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { getCurrentPage } from './tourSteps';
import { getTourSteps } from './tourContent';
import { useShepherdTour } from './useShepherdTour';
import { useOnboarding } from '../../contexts/use-onboarding';
import { useRadars } from '../../hooks/useRadars';
import { TOUR_DEMO_RADAR_ID } from '../../demo/demo-data';

interface OnboardingTourProps {
  hasStarredRepos: boolean;
}

export function OnboardingTour({ hasStarredRepos }: OnboardingTourProps) {
  const location = useLocation();
  const { isTourActive } = useOnboarding();
  const { radars } = useRadars();

  // True when showing the React Ecosystem radar (injected for tour in both demo and auth modes)
  const isUsingExampleRadar =
    isTourActive && radars.length === 1 && radars[0].id === TOUR_DEMO_RADAR_ID;

  const steps = useMemo(
    () => getTourSteps(hasStarredRepos, isUsingExampleRadar),
    [hasStarredRepos, isUsingExampleRadar]
  );

  const currentPage = getCurrentPage(location.pathname);

  const pageSteps = useMemo(
    () => steps.filter((s) => s.page === currentPage),
    [steps, currentPage]
  );

  useShepherdTour(pageSteps);

  // Shepherd.js manages its own DOM (tooltips, overlay) outside React
  return null;
}
