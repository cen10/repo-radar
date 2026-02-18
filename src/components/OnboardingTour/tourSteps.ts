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

    // Auto-focus for keyboard accessibility.
    // - Steps requiring click: focus the target element
    // - All other steps: focus the Next/Finish button
    configuredStep.when = {
      show: function (this: { el?: HTMLElement }) {
        // Native <dialog> elements trap focus even when we programmatically focus
        // elements inside them. Add a keydown handler to forward Enter to the
        // appropriate element (Next button or clickable target).
        const handleKeydown = (e: KeyboardEvent) => {
          if (e.key !== 'Enter') return;

          // Don't interfere if user is focused on a button inside the dialog
          // (they can activate it normally with Enter)
          if (
            document.activeElement instanceof HTMLButtonElement &&
            document.activeElement.closest('.shepherd-element')
          ) {
            return;
          }

          if (step.advanceByClickingTarget && step.target) {
            // Click the target element to advance
            const targetEl = document.querySelector(step.target);
            if (targetEl) {
              const focusable = findFocusableElement(targetEl);
              if (focusable) {
                e.preventDefault();
                focusable.click();
              }
            }
          } else {
            // Click the primary button (Next/Finish) to advance
            const primaryButton = document.querySelector(
              '.shepherd-button:not(.shepherd-button-secondary)'
            );
            if (primaryButton instanceof HTMLElement) {
              e.preventDefault();
              primaryButton.click();
            }
          }
        };

        // Attach to the dialog element so it captures Enter even when dialog has focus
        const dialog = this.el;
        if (dialog) {
          dialog.addEventListener('keydown', handleKeydown);
          // Store reference for cleanup
          (
            dialog as HTMLElement & { _tourKeydownHandler?: typeof handleKeydown }
          )._tourKeydownHandler = handleKeydown;
        }

        const focusTarget = () => {
          // Native <dialog> elements lock focus to themselves when opened via showModal().
          // We can't programmatically move focus until something inside the dialog is
          // focused first. Focus the cancel icon briefly to break the lock.
          const cancelIcon = document.querySelector('.shepherd-cancel-icon');
          if (cancelIcon instanceof HTMLElement) {
            cancelIcon.focus();
          }

          if (step.advanceByClickingTarget && step.target) {
            // Focus the clickable target so Enter activates it
            const targetEl = document.querySelector(step.target);
            if (targetEl) {
              const focusable = findFocusableElement(targetEl);
              if (focusable) {
                focusable.focus();
              }
            }
          } else {
            // Focus the primary button (Next/Finish) so Enter advances the tour
            const primaryButton = document.querySelector(
              '.shepherd-button:not(.shepherd-button-secondary)'
            );
            if (primaryButton instanceof HTMLElement) {
              primaryButton.focus();
            }
          }
        };

        // Shepherd manages focus in complex ways during step transitions.
        // The dialog element locks focus until something inside it receives focus.
        // Poll with retries to ensure focus happens after Shepherd completes.
        let attempts = 0;
        const maxAttempts = 10;
        const tryFocus = () => {
          attempts++;
          focusTarget();
          // Check if we successfully moved focus away from the dialog
          const success = document.activeElement?.tagName !== 'DIALOG';
          if (!success && attempts < maxAttempts) {
            setTimeout(tryFocus, 100);
          }
        };
        // Start trying after a brief delay
        setTimeout(tryFocus, 100);
      },
      hide: function (this: { el?: HTMLElement }) {
        // Clean up keydown handler
        const dialog = this.el;
        if (dialog) {
          const handler = (
            dialog as HTMLElement & { _tourKeydownHandler?: (e: KeyboardEvent) => void }
          )._tourKeydownHandler;
          if (handler) {
            dialog.removeEventListener('keydown', handler);
          }
        }
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
