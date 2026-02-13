import type { TourStepDef } from './tourSteps';

const starsCommonSteps: TourStepDef[] = [
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

const starsEmptySteps: TourStepDef[] = [
  {
    id: 'my-stars-heading',
    target: '[data-tour="my-stars-heading"]',
    text: 'Star repositories on GitHub to start tracking their momentum here.',
    page: 'stars',
    placement: 'bottom',
  },
];

const starsWithReposSteps: TourStepDef[] = [
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
    text: 'Your Radars appear in the sidebar. <strong>Click any Radar to continue.</strong>',
    page: 'stars',
    placement: 'right',
    canClickTarget: true,
    hideNextOnly: true,
  },
];

const radarSteps: TourStepDef[] = [
  {
    id: 'radar-intro',
    target: '[data-tour="radar-name"]',
    text: 'Use Radars to collect individual repositories. This lets you keep repos organized by your interests and gives you more flexibility than simply adding to the starred repos bucket on GitHub.',
    page: 'radar',
    placement: 'bottom',
    backTo: { stepId: 'sidebar-radars', path: '/stars' },
    showDelay: 100,
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
    hideNextOnly: true,
  },
];

const repoDetailSteps: TourStepDef[] = [
  {
    id: 'repo-header',
    target: '[data-tour="repo-name"]',
    text: 'The repository page is a WIP. Coming soon: star trends and maintainer activity metrics.',
    page: 'repo-detail',
    placement: 'bottom',
    showDelay: 100,
  },
  {
    id: 'releases',
    target: '[data-tour="releases"]',
    text: 'Expand any release to see version details and release notes. Thanks for exploring!',
    page: 'repo-detail',
    placement: 'top',
  },
];

export function getTourStepDefs(hasStarredRepos: boolean): TourStepDef[] {
  return [
    ...starsCommonSteps,
    ...(hasStarredRepos ? starsWithReposSteps : starsEmptySteps),
    ...radarSteps,
    ...repoDetailSteps,
  ];
}
