import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { getCurrentPage } from './tourSteps';
import { getTourSteps } from './tourContent';
import { useShepherdTour } from './useShepherdTour';
import { useOnboarding } from '../../contexts/use-onboarding';
import { useDemoMode } from '../../demo/use-demo-mode';
import { useRadars } from '../../hooks/useRadars';
import { useAllStarredRepositories } from '../../hooks/useAllStarredRepositories';
import { useAuth } from '../../hooks/use-auth';
import { TOUR_RADAR_ID } from '../../demo/tour-data';

export function OnboardingTour() {
  const location = useLocation();
  const { isTourActive } = useOnboarding();
  const { isDemoMode } = useDemoMode();
  const { radars } = useRadars();
  const { providerToken } = useAuth();

  // Fetch starred repos to determine if user has any (affects tour messaging)
  const { totalStarred } = useAllStarredRepositories({
    token: providerToken,
    enabled: isTourActive,
  });
  const hasStarredRepos = isDemoMode || totalStarred > 0;

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
