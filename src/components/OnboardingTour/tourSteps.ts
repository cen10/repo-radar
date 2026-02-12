import type { Tour, StepOptions, StepOptionsButton, PopperPlacement } from 'shepherd.js';

export type TourPage = 'stars' | 'radar' | 'repo-detail';

export interface TourStepDef {
  id: string;
  /** CSS selector for the target element (empty string = centered/no target) */
  target: string;
  /** Tooltip content text */
  text: string;
  /** Which page this step belongs to */
  page: TourPage;
  /** Tooltip placement relative to target (not needed for centered steps) */
  placement?: PopperPlacement;
  /** Allow clicks on the highlighted element */
  canClickTarget?: boolean;
  /** Don't show this step on small screens (< 1024px) */
  desktopOnly?: boolean;
  /** Only show this step on small screens (< 1024px) */
  mobileOnly?: boolean;
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
  /** Additional CSS classes for the step tooltip */
  extraClasses?: string;
}

export function getTourStepDefs(options: {
  hasStarredRepos: boolean;
  isMobile: boolean;
}): TourStepDef[] {
  const { hasStarredRepos, isMobile } = options;

  const welcomeText = isMobile
    ? 'Welcome to Repo Radar! Track the momentum of your favorite GitHub repositories — star growth, releases, and activity — all in one place.'
    : 'Welcome to Repo Radar! Track the momentum of your favorite GitHub repositories — star growth, releases, and activity — all in one place.<br><br><em>Tip: Use arrow keys or Tab to navigate this tour.</em>';

  // Steps shown to all users on stars page
  const starsCommonSteps: TourStepDef[] = [
    {
      id: 'welcome',
      target: '',
      text: welcomeText,
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
      id: 'menu-button',
      target: '[data-tour="menu-button"]',
      text: 'Tap the menu to open the sidebar and see your Radars.',
      page: 'stars',
      placement: 'bottom',
      mobileOnly: true,
      canClickTarget: true,
      advanceOn: { selector: '[data-tour="menu-button"]', event: 'click' },
    },
    {
      id: 'sidebar-radars',
      // On mobile, use centered tooltip (no target) since Dialog portals break Floating UI positioning.
      // CSS positions it at bottom of screen. Overlay is disabled so radars are visible/clickable.
      target: isMobile ? '' : '[data-tour="sidebar-radars"]',
      text: isMobile
        ? 'Tap any Radar in the sidebar to continue!'
        : 'Your Radars appear in the sidebar. <strong>Click any Radar to continue.</strong>',
      page: 'stars',
      placement: isMobile ? undefined : 'right',
      showDelay: isMobile ? 400 : undefined, // Wait for sidebar slide-in animation on mobile
      disableOverlay: isMobile, // Disable overlay on mobile so radars are visible/clickable
      extraClasses: isMobile ? 'tour-step-bottom' : undefined, // Position at bottom on mobile
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
      hideNextOnly: true, // Navigation continues tour on detail page
    },

    // === REPO DETAIL PAGE ===
    {
      id: 'repo-header',
      target: '[data-tour="repo-name"]',
      text: 'The repository page is a WIP. Coming soon: star trends and maintainer activity metrics.',
      page: 'repo-detail',
      placement: 'bottom',
      showDelay: 100, // Wait for page to render before positioning
    },
    {
      id: 'releases',
      target: '[data-tour="releases"]',
      text: 'Expand any release to see version details and release notes. Thanks for exploring!',
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
): StepOptions[] {
  const { tour, onBackTo } = options;

  return defs.map((def, index) => {
    const isFirst = index === 0;
    const isLast = index === defs.length - 1;

    const buttons: StepOptionsButton[] = [];

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

    const step: StepOptions = {
      id: def.id,
      text: def.text,
      buttons,
      classes: def.extraClasses,
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
