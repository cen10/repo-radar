export type TourPage = 'stars' | 'radar' | 'repo-detail';

export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center';

export interface TourStep {
  /** CSS selector for the target element */
  target: string;
  /** Tooltip content text */
  content: string;
  /** Which page this step belongs to */
  page: TourPage;
  /** Tooltip placement relative to target */
  placement: TourPlacement;
  /** Allow clicks on the highlighted element */
  spotlightClicks?: boolean;
  /** This step expects the user to navigate to the next page */
  waitForNavigation?: boolean;
  /** Don't show this step on small screens (< 1024px) */
  desktopOnly?: boolean;
}

export function getTourSteps(options: { hasStarredRepos: boolean }): TourStep[] {
  const { hasStarredRepos } = options;

  return [
    // === STARS PAGE ===
    {
      target: '',
      content: hasStarredRepos
        ? 'Welcome to Repo Radar! These are your starred GitHub repositories. We track their momentum — stars, releases, and activity.'
        : 'Welcome to Repo Radar! Star repositories on GitHub to start tracking their momentum — stars, releases, and activity.',
      page: 'stars',
      placement: 'center',
    },
    {
      target: '[data-tour="repo-link"]',
      content: 'Click any repo name to see detailed metrics, releases, and more.',
      page: 'stars',
      placement: 'bottom',
    },
    {
      target: '[data-tour="search"]',
      content: 'Search across your starred repositories to quickly find what you need.',
      page: 'stars',
      placement: 'bottom',
    },
    {
      target: '[data-tour="sort"]',
      content: 'Sort by recent updates, star date, or other criteria to surface what matters most.',
      page: 'stars',
      placement: 'bottom',
    },
    {
      target: '[data-tour="radar-icon"]',
      content:
        'Click the radar icon to organize repos into collections called "radars." Try it now!',
      page: 'stars',
      placement: 'left',
      spotlightClicks: true,
    },
    {
      target: '[data-tour="sidebar-radars"]',
      content:
        'Your radars appear here in the sidebar. Click one to see all repos in that collection.',
      page: 'stars',
      placement: 'right',
      desktopOnly: true,
    },

    // === RADAR PAGE ===
    {
      target: '[data-tour="radar-repos"]',
      content: 'All repos in this radar are shown here. Remove any by clicking its radar icon.',
      page: 'radar',
      placement: 'bottom',
    },
    {
      target: '[data-tour="radar-menu"]',
      content:
        "Use this menu to rename or delete the radar. Deleting a radar doesn't remove the repos themselves.",
      page: 'radar',
      placement: 'bottom',
    },

    // === REPO DETAIL PAGE ===
    {
      target: '[data-tour="repo-header"]',
      content:
        'The detail page shows comprehensive metrics for any repository — stars, forks, issues, and more.',
      page: 'repo-detail',
      placement: 'bottom',
    },
    {
      target: '[data-tour="refresh-button"]',
      content: 'Click refresh to fetch the latest data from GitHub anytime.',
      page: 'repo-detail',
      placement: 'bottom',
    },
    {
      target: '[data-tour="releases"]',
      content: 'Expand any release to see version details and release notes.',
      page: 'repo-detail',
      placement: 'top',
    },
    {
      target: '[data-tour="coming-soon"]',
      content:
        "Coming soon: Historical tracking with sparklines and trend charts. We'll track star growth over time so you can spot repos gaining momentum. Thanks for exploring!",
      page: 'repo-detail',
      placement: 'top',
    },
  ];
}

export function getCurrentPage(pathname: string): TourPage | null {
  if (pathname === '/stars') return 'stars';
  if (pathname.startsWith('/radar/')) return 'radar';
  if (pathname.startsWith('/repo/')) return 'repo-detail';
  return null;
}
