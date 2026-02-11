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
  /** Auto-advance when this selector is clicked (hides Next button) */
  advanceOn?: { selector: string; event: string };
  /** Delay in ms before showing this step (useful after animations) */
  showDelay?: number;
  /** Disable modal overlay for this step (allows interaction with page) */
  disableOverlay?: boolean;
  /** Hide Next/Back buttons (for steps where navigation continues tour) */
  hideButtons?: boolean;
  /** Hide only the Next button (for cross-page transitions where Back should still work) */
  hideNextOnly?: boolean;
  /** For cross-page Back: { stepId, path } to navigate to */
  backTo?: { stepId: string; path: string };
}

export function getTourStepDefs(options: { hasStarredRepos: boolean }): TourStepDef[] {
  const { hasStarredRepos } = options;

  // Steps shown to all users on stars page
  const starsCommonSteps: TourStepDef[] = [
    {
      id: 'welcome',
      target: '',
      text: 'Welcome to Repo Radar! Track the momentum of your favorite GitHub repositories — star growth, releases, and activity — all in one place.<br><br><em>Tip: Use arrow keys or Tab to navigate this tour.</em>',
      page: 'stars',
      placement: 'center',
    },
    {
      id: 'help-button',
      target: '[data-tour="help-button"]',
      text: 'You can retake this tour anytime from the Help menu. Click the "?" to access it later.',
      page: 'stars',
      placement: 'bottom',
    },
  ];

  // Steps shown only when user has NO starred repos
  const starsEmptySteps: TourStepDef[] = [
    {
      id: 'my-stars-heading',
      target: '[data-tour="my-stars-heading"]',
      text: 'Star repositories on GitHub to start tracking their momentum here.',
      page: 'stars',
      placement: 'bottom',
    },
  ];

  // Steps shown only when user HAS starred repos
  const starsWithReposSteps: TourStepDef[] = [
    {
      id: 'repo-link',
      target: '[data-tour="my-stars-heading"]',
      text: "Repo Radar is read-only by design to keep your data safe - we can track and organize your stars but never delete them. You'll find up to 500 of your starred repos on the My Stars page.",
      page: 'stars',
      placement: 'bottom',
    },
    {
      id: 'radar-icon',
      target: '[data-tour="repo-card"]',
      text: 'You can organize repos into collections called "Radars" via the radar icon. Click the icon now to make a change and then select "Done" to continue the tour.',
      page: 'stars',
      placement: 'right-start',
      canClickTarget: true,
      advanceOn: { selector: '[data-tour="bottom-sheet-done"]', event: 'click' }, // Hides buttons; actual advance handled in OnboardingTour.tsx
    },
    {
      id: 'sidebar-radars',
      target: '[data-tour="sidebar-radars"]',
      text: 'Your Radars and the number of repos they contain appear in the sidebar. Click any Radar to continue!',
      page: 'stars',
      placement: 'right',
      desktopOnly: true,
      showDelay: 350, // Wait for sheet to close
      canClickTarget: true,
      hideNextOnly: true, // Navigation continues tour on radar page
    },
  ];

  return [
    ...starsCommonSteps,
    ...(hasStarredRepos ? starsWithReposSteps : starsEmptySteps),

    // === RADAR PAGE ===
    {
      id: 'radar-intro',
      target: '[data-tour="radar-name"]',
      text: 'Use Radars to collect individual repositories. This lets you keep repos organized by your interests and gives you more flexibility than simply adding to the starred repos bucket on GitHub.',
      page: 'radar',
      placement: 'bottom',
      backTo: { stepId: 'sidebar-radars', path: '/stars' },
      showDelay: 100, // Wait for page to render before positioning
    },
    {
      id: 'create-radar',
      target: '[data-tour="create-radar"]',
      text: 'Create new Radars anytime to organize repos by project, technology, or whatever makes sense for you.',
      page: 'radar',
      placement: 'right',
      desktopOnly: true,
    },
    {
      id: 'radar-repos',
      target: '[data-tour="radar-icon"]',
      text: 'A repo can be individually removed from a Radar by clicking the radar icon. The repo will continue to be tracked on any other Radar that contains it.',
      page: 'radar',
      placement: 'left',
    },
    {
      id: 'radar-menu',
      target: '[data-tour="radar-menu"]',
      text: "Use this menu to rename or delete the Radar. Deleting a Radar doesn't delete any repos! They remain on other Radars and findable on the My Stars page and the Explore page.",
      page: 'radar',
      placement: 'bottom',
    },
    {
      id: 'click-repo',
      target: '[data-tour="repo-card"]',
      text: 'Click on the repo card to see detailed metrics, releases, and more.',
      page: 'radar',
      placement: 'right',
      canClickTarget: true,
      hideNextOnly: true, // Navigation continues tour on detail page
    },

    // === REPO DETAIL PAGE ===
    {
      id: 'repo-header',
      target: '[data-tour="repo-name"]',
      text: 'The detail page shows comprehensive metrics for any repository — stars, forks, issues, and more.',
      page: 'repo-detail',
      placement: 'bottom',
      showDelay: 100, // Wait for page to render before positioning
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

interface ToShepherdStepsOptions {
  tour: Tour;
  onBackTo?: (stepId: string, path: string) => void;
}

/**
 * Convert our step definitions into Shepherd.js step options.
 */
export function toShepherdSteps(
  defs: TourStepDef[],
  options: ToShepherdStepsOptions
): Tour.StepOptions[] {
  const { tour, onBackTo } = options;

  return defs.map((def, index) => {
    const isFirst = index === 0;
    const isLast = index === defs.length - 1;

    const buttons: Tour.StepOptions['buttons'] = [];

    // Show Back button for cross-page navigation
    if (def.backTo && onBackTo) {
      buttons.push({
        text: 'Back',
        action: () => onBackTo(def.backTo!.stepId, def.backTo!.path),
        secondary: true,
      });
    }
    // Show Back button if not hiding buttons and not first step
    // (advanceOn only hides Next button, not Back)
    else if (!isFirst && !def.hideButtons) {
      buttons.push({
        text: 'Back',
        action: () => tour.back(),
        secondary: true,
      });
    }

    // Only show Next/Finish button if not auto-advancing, not hiding buttons, and not hideNextOnly
    if (!def.advanceOn && !def.hideButtons && !def.hideNextOnly) {
      buttons.push({
        text: isLast ? 'Finish' : 'Next',
        action: () => (isLast ? tour.complete() : tour.next()),
      });
    }

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

    if (def.advanceOn) {
      step.advanceOn = def.advanceOn;
    }

    if (def.showDelay) {
      const delay = def.showDelay;
      step.beforeShowPromise = () => new Promise((resolve) => setTimeout(resolve, delay));
    }

    if (def.disableOverlay) {
      step.modalOverlayOpeningPadding = 5000;
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
