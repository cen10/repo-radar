import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { getCurrentPage } from './tourSteps';
import { getTourSteps } from './tourContent';
import { useShepherdTour } from './useShepherdTour';
import { useOnboarding } from '../../contexts/use-onboarding';
import { useDemoMode } from '../../demo/use-demo-mode';
import { useRadars } from '../../hooks/useRadars';
import { TOUR_RADAR_ID } from '../../demo/tour-data';

interface OnboardingTourProps {
  hasStarredRepos: boolean;
}

export function OnboardingTour({ hasStarredRepos }: OnboardingTourProps) {
  const location = useLocation();
  const { isTourActive } = useOnboarding();
  const { isDemoMode } = useDemoMode();
  const { radars } = useRadars();

  // True when showing the injected tour radar (React Ecosystem)
  const isUsingTourRadar = isTourActive && radars.length === 1 && radars[0].id === TOUR_RADAR_ID;

  const steps = useMemo(
    () => getTourSteps(hasStarredRepos, isUsingTourRadar, isDemoMode),
    [hasStarredRepos, isUsingTourRadar, isDemoMode]
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
