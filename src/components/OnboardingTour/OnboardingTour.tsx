import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { getCurrentPage } from './tourSteps';
import { getTourStepDefs } from './tourContent';
import { useShepherdTour } from './useShepherdTour';
// Base Shepherd styles for structural layout (positioning, modal overlay, element attachment).
// Visual customizations (colors, buttons, spacing) are in src/index.css.
import 'shepherd.js/dist/css/shepherd.css';

interface OnboardingTourProps {
  hasStarredRepos: boolean;
}

export function OnboardingTour({ hasStarredRepos }: OnboardingTourProps) {
  const location = useLocation();

  const stepDefs = useMemo(() => getTourStepDefs({ hasStarredRepos }), [hasStarredRepos]);

  const currentPage = getCurrentPage(location.pathname);

  const pageStepDefs = useMemo(
    () => stepDefs.filter((s) => s.page === currentPage),
    [stepDefs, currentPage]
  );

  useShepherdTour(pageStepDefs);

  // Shepherd.js manages its own DOM (tooltips, overlay) outside React
  return null;
}
