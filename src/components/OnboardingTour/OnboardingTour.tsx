import { useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getCurrentPage } from './tourSteps';
import { getTourSteps } from './tourContent';
import { useShepherdTour } from './useShepherdTour';
import { useOnboarding } from '../../contexts/use-onboarding';
import { useDemoMode } from '../../demo/use-demo-mode';
import { useAllStarredRepositories } from '../../hooks/useAllStarredRepositories';
import { useAuth } from '../../hooks/useAuth';

export function OnboardingTour() {
  const location = useLocation();
  const { isTourActive, startTour, completeTour } = useOnboarding();
  const currentPage = getCurrentPage(location.pathname);

  // Reset tour if active but on a non-tour page (e.g., user navigated away and refreshed)
  useEffect(() => {
    if (isTourActive && currentPage === null) {
      completeTour();
    }
  }, [isTourActive, currentPage, completeTour]);

  // Check for pending tour start after navigation (from restartTour)
  useEffect(() => {
    const pending = sessionStorage.getItem('tour-pending-start');
    if (pending) {
      sessionStorage.removeItem('tour-pending-start');
      startTour();
    }
  }, [location.pathname, startTour]);
  const { isDemoMode } = useDemoMode();
  const { providerToken } = useAuth();

  // Fetch starred repos to determine if user has any (affects tour messaging)
  const { totalStarred } = useAllStarredRepositories({
    token: providerToken,
    enabled: isTourActive,
  });
  const hasStarredRepos = isDemoMode || totalStarred > 0;

  // Always true during tour since we prepend tour-demo-radar to guide users consistently
  const isUsingTourRadar = isTourActive;

  const steps = useMemo(
    () => getTourSteps(hasStarredRepos, isUsingTourRadar, isDemoMode),
    [hasStarredRepos, isUsingTourRadar, isDemoMode]
  );

  const pageSteps = useMemo(
    () => steps.filter((s) => s.page === currentPage),
    [steps, currentPage]
  );

  useShepherdTour(pageSteps);

  // Shepherd.js manages its own DOM (tooltips, overlay) outside React
  return null;
}
