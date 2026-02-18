import type { Tour, StepOptions, StepOptionsButton, PopperPlacement } from 'shepherd.js';

export type TourPage = 'stars' | 'radar' | 'repo-detail';

export interface TourStep {
  id: string;
  target: string;
  text: string;
  page: TourPage;
  placement?: PopperPlacement;
  canClickTarget?: boolean;
  tooltipDelayMs?: number;
  advanceByClickingTarget?: boolean;
  backTo?: { stepId: string; path: string };
}

interface AddShepherdOptionsConfig {
  tour: Tour;
  onBackTo?: (stepId: string, path: string) => void;
}

function buildButtons(
  step: TourStep,
  isFirstStep: boolean,
  isLastStep: boolean,
  tour: Tour,
  onBackTo?: (stepId: string, path: string) => void,
  previousStepIndex?: number
): StepOptionsButton[] {
  const buttons: StepOptionsButton[] = [];
  const isCrossPageNav = step.backTo && onBackTo;

  if (isCrossPageNav) {
    buttons.push({
      text: 'Back',
      action: () => onBackTo(step.backTo!.stepId, step.backTo!.path),
      secondary: true,
    });
  } else if (!isFirstStep && previousStepIndex !== undefined && previousStepIndex >= 0) {
    // Use numeric index with forward=false to match Shepherd's back() behavior
    buttons.push({
      text: 'Back',
      action: () => tour.show(previousStepIndex, false),
      secondary: true,
    });
  }

  // Next/Finish: hidden when user must click the target to advance
  if (!step.advanceByClickingTarget) {
    buttons.push({
      text: isLastStep ? 'Finish' : 'Next',
      action: () => (isLastStep ? tour.complete() : tour.next()),
    });
  }

  return buttons;
}

/**
 * Finds a focusable element for keyboard activation.
 * Prioritizes links/buttons (inside or the target itself) over generic focusable elements,
 * since Shepherd adds tabindex="0" to targets which makes them focusable but not activatable.
 */
function findFocusableElement(target: Element): HTMLElement | null {
  // If target itself is a link or button, use it directly
  if (target instanceof HTMLAnchorElement || target instanceof HTMLButtonElement) {
    return target;
  }

  // Look for a link inside the target (these respond to Enter key)
  const link = target.querySelector('a[href]');
  if (link instanceof HTMLElement) return link;

  // Look for a button inside the target
  const button = target.querySelector('button');
  if (button instanceof HTMLElement) return button;

  // Fall back to target if it's focusable (e.g., has tabindex)
  // Note: This is less useful since generic focusable elements don't respond to Enter
  if (target instanceof HTMLElement && target.tabIndex >= 0) {
    return target;
  }

  return null;
}

/** Converts our tour steps to Shepherd-compatible steps with buttons and callbacks. */
export function configureStepsForShepherd(
  steps: TourStep[],
  config: AddShepherdOptionsConfig
): StepOptions[] {
  const { tour, onBackTo } = config;

  return steps.map((step, index) => {
    const isFirstStep = index === 0;
    const isLastStep = index === steps.length - 1;
    const previousStepIndex = index > 0 ? index - 1 : undefined;

    const configuredStep: StepOptions = {
      id: step.id,
      text: step.text,
      buttons: buildButtons(step, isFirstStep, isLastStep, tour, onBackTo, previousStepIndex),
      cancelIcon: { enabled: true },
      canClickTarget: step.canClickTarget ?? false,
      scrollTo: { behavior: 'smooth', block: 'center' } as ScrollIntoViewOptions,
    };

    if (step.target) {
      configuredStep.attachTo = { element: step.target, on: step.placement };
    }

    // Delay tooltip after page navigation to let the DOM settle before attaching
    if (step.tooltipDelayMs) {
      configuredStep.beforeShowPromise = () =>
        new Promise((r) => setTimeout(r, step.tooltipDelayMs));
    }

    // Auto-focus the target element for steps that require clicking it to advance.
    // This allows keyboard users to press Enter immediately without tabbing.
    if (step.advanceByClickingTarget && step.target) {
      configuredStep.when = {
        show: () => {
          // Delay must be long enough for:
          // 1. Element to be visible and scrolled into view
          // 2. Shepherd to finish its focus management (moves focus to dialog)
          // 500ms is safely after Shepherd's animation/focus setup completes
          setTimeout(() => {
            const targetEl = document.querySelector(step.target);
            if (targetEl) {
              const focusable = findFocusableElement(targetEl);
              if (focusable) {
                focusable.focus();
              }
            }
          }, 500);
        },
      };
    }

    return configuredStep;
  });
}

export function getCurrentPage(pathname: string): TourPage | null {
  if (pathname === '/stars') return 'stars';
  if (pathname.startsWith('/radar/')) return 'radar';
  if (pathname.startsWith('/repo/')) return 'repo-detail';
  return null;
}
