import type Tour from 'shepherd.js/src/tour';

export type TourPage = 'stars' | 'radar' | 'repo-detail';

export interface TourStepDef {
  id: string;
  /** CSS selector for the target element (empty string = centered/no target) */
  target: string;
  /** Tooltip content text */
  text: string;
  /** Which page this step belongs to */
  page: TourPage;
  /** Tooltip placement relative to target */
  placement: string;
  /** Allow clicks on the highlighted element */
  canClickTarget?: boolean;
  /** Don't show this step on small screens (< 1024px) */
  desktopOnly?: boolean;
}

export function getTourStepDefs(options: { hasStarredRepos: boolean }): TourStepDef[] {
  const { hasStarredRepos } = options;

  return [
    // === STARS PAGE ===
    {
      id: 'welcome',
      target: '',
      text: hasStarredRepos
        ? 'Welcome to Repo Radar! These are your starred GitHub repositories. We track their momentum — stars, releases, and activity.'
        : 'Welcome to Repo Radar! Star repositories on GitHub to start tracking their momentum — stars, releases, and activity.',
      page: 'stars',
      placement: 'center',
    },
    {
      id: 'repo-link',
      target: '[data-tour="repo-link"]',
      text: 'Click any repo name to see detailed metrics, releases, and more.',
      page: 'stars',
      placement: 'bottom',
    },
    {
      id: 'search',
      target: '[data-tour="search"]',
      text: 'Search across your starred repositories to quickly find what you need.',
      page: 'stars',
      placement: 'bottom',
    },
    {
      id: 'sort',
      target: '[data-tour="sort"]',
      text: 'Sort by recent updates, star date, or other criteria to surface what matters most.',
      page: 'stars',
      placement: 'bottom',
    },
    {
      id: 'radar-icon',
      target: '[data-tour="radar-icon"]',
      text: 'Click the radar icon to organize repos into collections called "radars." Try it now!',
      page: 'stars',
      placement: 'left',
      canClickTarget: true,
    },
    {
      id: 'sidebar-radars',
      target: '[data-tour="sidebar-radars"]',
      text: 'Your radars appear here in the sidebar. Click one to see all repos in that collection.',
      page: 'stars',
      placement: 'right',
      desktopOnly: true,
    },

    // === RADAR PAGE ===
    {
      id: 'radar-repos',
      target: '[data-tour="radar-repos"]',
      text: 'All repos in this radar are shown here. Remove any by clicking its radar icon.',
      page: 'radar',
      placement: 'bottom',
    },
    {
      id: 'radar-menu',
      target: '[data-tour="radar-menu"]',
      text: "Use this menu to rename or delete the radar. Deleting a radar doesn't remove the repos themselves.",
      page: 'radar',
      placement: 'bottom',
    },

    // === REPO DETAIL PAGE ===
    {
      id: 'repo-header',
      target: '[data-tour="repo-header"]',
      text: 'The detail page shows comprehensive metrics for any repository — stars, forks, issues, and more.',
      page: 'repo-detail',
      placement: 'bottom',
    },
    {
      id: 'refresh-button',
      target: '[data-tour="refresh-button"]',
      text: 'Click refresh to fetch the latest data from GitHub anytime.',
      page: 'repo-detail',
      placement: 'bottom',
    },
    {
      id: 'releases',
      target: '[data-tour="releases"]',
      text: 'Expand any release to see version details and release notes.',
      page: 'repo-detail',
      placement: 'top',
    },
    {
      id: 'coming-soon',
      target: '[data-tour="coming-soon"]',
      text: "Coming soon: Historical tracking with sparklines and trend charts. We'll track star growth over time so you can spot repos gaining momentum. Thanks for exploring!",
      page: 'repo-detail',
      placement: 'top',
    },
  ];
}

/**
 * Convert our step definitions into Shepherd.js step options.
 */
export function toShepherdSteps(defs: TourStepDef[], tour: Tour): Tour.StepOptions[] {
  return defs.map((def, index) => {
    const isFirst = index === 0;
    const isLast = index === defs.length - 1;

    const buttons: Tour.StepOptions['buttons'] = [];

    buttons.push({
      text: 'Skip tour',
      action: () => tour.cancel(),
      classes: 'shepherd-button-skip',
    });

    if (!isFirst) {
      buttons.push({
        text: 'Back',
        action: () => tour.back(),
        secondary: true,
      });
    }

    buttons.push({
      text: isLast ? 'Finish' : 'Next',
      action: () => (isLast ? tour.complete() : tour.next()),
    });

    const step: Tour.StepOptions = {
      id: def.id,
      text: def.text,
      buttons,
      cancelIcon: { enabled: true },
      canClickTarget: def.canClickTarget ?? false,
      scrollTo: { behavior: 'smooth', block: 'center' } as ScrollIntoViewOptions,
    };

    if (def.target) {
      step.attachTo = { element: def.target, on: def.placement };
    }

    return step;
  });
}

export function getCurrentPage(pathname: string): TourPage | null {
  if (pathname === '/stars') return 'stars';
  if (pathname.startsWith('/radar/')) return 'radar';
  if (pathname.startsWith('/repo/')) return 'repo-detail';
  return null;
}
