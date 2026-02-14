import type { TourStep } from './tourSteps';

const starsCommonSteps: TourStep[] = [
  {
    id: 'welcome',
    target: '',
    text: 'Welcome to Repo Radar! Track the momentum of your favorite GitHub repositories — star growth, releases, and activity — all in one place.<br><br><em>Tip: Use arrow keys or Tab to navigate this tour.</em>',
    page: 'stars',
  },
  {
    id: 'help-button',
    target: '[data-tour="help-button"]',
    text: 'You can retake this tour anytime from the Help menu. Click the "?" to access it later.',
    page: 'stars',
    placement: 'bottom',
  },
];

const starsEmptySteps: TourStep[] = [
  {
    id: 'my-stars-heading',
    target: '[data-tour="my-stars-heading"]',
    text: 'Star repositories on GitHub to start tracking their momentum here.',
    page: 'stars',
    placement: 'bottom',
  },
];

function getStarsWithReposSteps(isUsingExampleRadar: boolean): TourStep[] {
  const sidebarRadarsText = isUsingExampleRadar
    ? "Your Radars appear in the sidebar. We've added a <strong>React Ecosystem</strong> radar for this tour. <strong>Click it to continue.</strong>"
    : 'Your Radars appear in the sidebar. <strong>Click any Radar to continue.</strong>';

  return [
    {
      id: 'repo-link',
      target: '[data-tour="my-stars-heading"]',
      text: "Repo Radar is read-only by design to keep your data safe - we can track and organize your stars but never delete them. You'll find up to 500 of your starred repos on the My Stars page.",
      page: 'stars',
      placement: 'bottom',
    },
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

function getRadarSteps(isUsingExampleRadar: boolean): TourStep[] {
  const radarIntroText = isUsingExampleRadar
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
      text: 'Use the radar icon to manage which Radars contain this repo. It will still stay tracked on any other Radars you have it on.',
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

function getRepoDetailSteps(isUsingExampleRadar: boolean): TourStep[] {
  const steps: TourStep[] = [
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
      id: 'releases',
      target: '[data-tour="releases"]',
      text: 'Expand any release to see version details and release notes.',
      page: 'repo-detail',
      placement: 'top',
    },
  ];

  // Add tour-complete step only when using the tour's React Ecosystem radar
  if (isUsingExampleRadar) {
    steps.push({
      id: 'tour-complete',
      target: '',
      text: 'Thanks for taking the tour! The React Ecosystem radar will disappear when you finish. Create your own Radar from the sidebar to start tracking repos that matter to you.',
      page: 'repo-detail',
    });
  } else {
    // Demo mode gets a simpler ending
    steps[1].text =
      'Expand any release to see version details and release notes. Thanks for exploring!';
  }

  return steps;
}

export function getTourSteps(
  hasStarredRepos: boolean,
  isUsingExampleRadar: boolean = false
): TourStep[] {
  return [
    ...starsCommonSteps,
    ...(hasStarredRepos ? getStarsWithReposSteps(isUsingExampleRadar) : starsEmptySteps),
    ...getRadarSteps(isUsingExampleRadar),
    ...getRepoDetailSteps(isUsingExampleRadar),
  ];
}
