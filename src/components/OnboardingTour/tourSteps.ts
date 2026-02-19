import type { Tour, StepOptions, StepOptionsButton, PopperPlacement } from 'shepherd.js';

// Visual focus retry configuration - Shepherd may still be rendering when show() fires
const FOCUS_INITIAL_DELAY_MS = 100;
const FOCUS_RETRY_DELAY_MS = 50;
const FOCUS_MAX_RETRIES = 10;

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

const FOCUS_CLASS = 'tour-keyboard-focus';
type DialogWithHandler = HTMLElement & {
  _tourKeydownHandler?: (e: KeyboardEvent) => void;
  _tourFocusTimeoutId?: ReturnType<typeof setTimeout>;
};

/**
 * Attaches Enter key handler to forward keypresses to the appropriate element.
 * Native <dialog> elements trap focus, so we intercept Enter and click the
 * target element or primary button.
 */
function attachEnterKeyHandler(step: TourStep, dialog: HTMLElement | null | undefined): void {
  if (!dialog) return;

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return;

    // Don't interfere if user is focused on a button inside the dialog
    if (
      document.activeElement instanceof HTMLButtonElement &&
      document.activeElement.closest('.shepherd-element')
    ) {
      return;
    }

    if (step.advanceByClickingTarget && step.target) {
      const targetEl = document.querySelector(step.target);
      if (targetEl) {
        const focusable = findFocusableElement(targetEl);
        if (focusable) {
          e.preventDefault();
          focusable.click();
        }
      }
    } else {
      // Scope to current dialog to avoid stale buttons from previous steps
      const primaryButton = dialog.querySelector(
        '.shepherd-button:not(.shepherd-button-secondary)'
      );
      if (primaryButton instanceof HTMLElement) {
        e.preventDefault();
        primaryButton.click();
      }
    }
  };

  dialog.addEventListener('keydown', handleKeydown);
  (dialog as DialogWithHandler)._tourKeydownHandler = handleKeydown;
}

function cleanupEnterKeyHandler(dialog: HTMLElement | null | undefined): void {
  if (!dialog) return;
  const handler = (dialog as DialogWithHandler)._tourKeydownHandler;
  if (handler) {
    dialog.removeEventListener('keydown', handler);
  }
}

/**
 * Applies visual focus styling to the element that Enter will activate.
 * Uses a CSS class instead of actual focus() because native <dialog> traps focus.
 *
 * Delays before querying the DOM because Shepherd's show callback fires before
 * the dialog is fully rendered. Retries if the element still isn't found.
 */
function applyVisualFocus(step: TourStep, dialog: HTMLElement | null | undefined): void {
  const dialogWithHandler = dialog as DialogWithHandler | null | undefined;

  const addVisualFocus = (retryCount = 0) => {
    // Remove any existing visual focus
    document.querySelectorAll(`.${FOCUS_CLASS}`).forEach((el) => {
      el.classList.remove(FOCUS_CLASS);
    });

    let targetElement: HTMLElement | null = null;

    if (step.advanceByClickingTarget && step.target) {
      // Focus the clickable target (e.g., repo card)
      const targetEl = document.querySelector(step.target);
      if (targetEl instanceof HTMLElement) {
        targetElement = targetEl;
      }
    } else if (dialog) {
      // Focus the primary button (Next/Finish)
      const primaryButton = dialog.querySelector(
        '.shepherd-button:not(.shepherd-button-secondary)'
      );
      if (primaryButton instanceof HTMLElement) {
        targetElement = primaryButton;
      }
    }

    if (targetElement) {
      targetElement.classList.add(FOCUS_CLASS);
    } else if (retryCount < FOCUS_MAX_RETRIES) {
      const timeoutId = setTimeout(() => addVisualFocus(retryCount + 1), FOCUS_RETRY_DELAY_MS);
      if (dialogWithHandler) {
        dialogWithHandler._tourFocusTimeoutId = timeoutId;
      }
    }
  };

  const timeoutId = setTimeout(() => addVisualFocus(0), FOCUS_INITIAL_DELAY_MS);
  if (dialogWithHandler) {
    dialogWithHandler._tourFocusTimeoutId = timeoutId;
  }
}

function cancelVisualFocusRetry(dialog: HTMLElement | null | undefined): void {
  if (!dialog) return;
  const timeoutId = (dialog as DialogWithHandler)._tourFocusTimeoutId;
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
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

    // Keyboard accessibility: forward Enter to appropriate element and show visual focus
    configuredStep.when = {
      show: function (this: { el?: HTMLElement | null }) {
        attachEnterKeyHandler(step, this.el);
        applyVisualFocus(step, this.el);
      },
      hide: function (this: { el?: HTMLElement | null }) {
        cleanupEnterKeyHandler(this.el);
        cancelVisualFocusRetry(this.el);
        // Note: Don't remove .tour-keyboard-focus here - applyVisualFocus
        // already cleans up before adding. Removing here causes a race condition
        // where hide() from step N runs after show() from step N+1.
      },
    };

    return configuredStep;
  });
}

export function getCurrentPage(pathname: string): TourPage | null {
  if (pathname === '/stars') return 'stars';
  if (pathname.startsWith('/radar/')) return 'radar';
  if (pathname.startsWith('/repo/')) return 'repo-detail';
  return null;
}
