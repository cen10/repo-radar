import type { TourStep } from './tourSteps';

// Welcome step is always shown first, centered (no target)
const welcomeStep: TourStep = {
  id: 'welcome',
  target: '',
  text: 'Welcome to Repo Radar! Track the momentum of your favorite GitHub repositories — star growth, releases, and activity — all in one place.<br><br><em>Tip: Use arrow keys or Tab to navigate this tour.</em>',
  page: 'stars',
};

// My Stars heading step with conditional text based on whether user has starred repos
function getMyStarsStep(hasStarredRepos: boolean): TourStep {
  return {
    id: 'my-stars-heading',
    target: '[data-tour="my-stars-heading"]',
    text: hasStarredRepos
      ? 'Your starred GitHub repositories appear here. Click any repo to see detailed metrics.'
      : 'Star repositories on GitHub to start tracking their momentum here.',
    page: 'stars',
    placement: 'bottom',
  };
}

const exploreStep: TourStep = {
  id: 'explore-link',
  target: '[data-tour="explore-link"]',
  text: 'Search for any GitHub repository on the Explore page and add it to your Radars.',
  page: 'stars',
  placement: 'right',
};

function getStarsWithReposSteps(isUsingTourRadar: boolean): TourStep[] {
  const sidebarRadarsText = isUsingTourRadar
    ? "Your Radars appear in the sidebar. We've added a <strong>React Ecosystem</strong> radar for this tour. <strong>Click it to continue.</strong>"
    : 'Your Radars appear in the sidebar. <strong>Click any Radar to continue.</strong>';

  return [
    {
      id: 'sidebar-radars',
      target: '[data-tour="sidebar-radars"]',
      text: sidebarRadarsText,
      page: 'stars',
      placement: 'right',
      canClickTarget: true,
      advanceByClickingTarget: true,
    },
  ];
}

function getRadarSteps(isUsingTourRadar: boolean): TourStep[] {
  const radarIntroText = isUsingTourRadar
    ? 'This React Ecosystem radar contains demo data for the tour. Create your own Radars to organize repos by your interests — more flexible than just starring on GitHub.'
    : 'Use Radars to collect individual repositories. This lets you keep repos organized by your interests and gives you more flexibility than simply adding to the starred repos bucket on GitHub.';

  return [
    {
      id: 'radar-intro',
      target: '[data-tour="radar-name"]',
      text: radarIntroText,
      page: 'radar',
      placement: 'bottom',
      backTo: { stepId: 'sidebar-radars', path: '/stars' },
      tooltipDelayMs: 100,
    },
    {
      id: 'radar-repos',
      target: '[data-tour="radar-icon"]',
      text: "Use the radar icon to manage which Radars contain this repo. Removing a repo from one Radar will not remove it from any other Radar you've saved it to.",
      page: 'radar',
      placement: 'left',
    },
    {
      id: 'click-repo',
      target: '[data-tour="repo-card"]',
      text: '<strong>Click on the repo card</strong> to see detailed metrics, releases, and more.',
      page: 'radar',
      placement: 'right',
      canClickTarget: true,
      advanceByClickingTarget: true,
    },
  ];
}

function getRepoDetailSteps(): TourStep[] {
  return [
    {
      id: 'repo-header',
      target: '[data-tour="repo-name"]',
      text: 'The repository page is a WIP. Coming soon: star trends and maintainer activity metrics.',
      page: 'repo-detail',
      placement: 'bottom',
      backTo: { stepId: 'click-repo', path: '/radar/tour-demo-radar' },
      tooltipDelayMs: 100,
    },
    {
      id: 'repo-detail-radar-icon',
      target: '[data-tour="repo-radar-icon"]',
      text: 'Add or remove this repo from any of your Radars without leaving this page.',
      page: 'repo-detail',
      placement: 'left',
      tooltipDelayMs: 100,
    },
    {
      id: 'releases',
      target: '[data-tour="releases"]',
      text: 'Expand any release to see version details and release notes.',
      page: 'repo-detail',
      placement: 'top',
    },
    {
      id: 'help-button',
      target: '[data-tour="help-button"]',
      text: 'Thanks for exploring Repo Radar! The tour is complete, but you can retake it from the Help menu at any time.',
      page: 'repo-detail',
      placement: 'bottom',
    },
  ];
}

export function getTourSteps(
  hasStarredRepos: boolean,
  isUsingTourRadar: boolean = false,
  _isDemoMode: boolean = false
): TourStep[] {
  return [
    welcomeStep,
    getMyStarsStep(hasStarredRepos),
    exploreStep,
    ...getStarsWithReposSteps(isUsingTourRadar),
    ...getRadarSteps(isUsingTourRadar),
    ...getRepoDetailSteps(),
  ];
}
