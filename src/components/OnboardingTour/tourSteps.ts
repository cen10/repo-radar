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

        // Add visual focus ring to the element that Enter will activate.
        // Native <dialog> elements trap focus, making actual focus() unreliable.
        // Instead, we add a CSS class that mimics the focus ring appearance.
        const FOCUS_CLASS = 'tour-keyboard-focus';

        const addVisualFocus = (retryCount = 0) => {
          console.log(
            `[tour-focus] addVisualFocus called for step "${step.id}", retry ${retryCount}`
          );

          // Remove any existing visual focus
          const existing = document.querySelectorAll(`.${FOCUS_CLASS}`);
          console.log(`[tour-focus] Removing ${existing.length} existing focus classes`);
          existing.forEach((el) => {
            el.classList.remove(FOCUS_CLASS);
          });

          let targetElement: HTMLElement | null = null;

          if (step.advanceByClickingTarget && step.target) {
            // Add visual focus to the clickable target
            const targetEl = document.querySelector(step.target);
            if (targetEl) {
              targetElement = findFocusableElement(targetEl);
            }
          } else {
            // Add visual focus to the primary button (Next/Finish)
            // Find the VISIBLE dialog - Shepherd keeps old dialogs in DOM briefly.
            // Use getBoundingClientRect since offsetParent is unreliable for dialogs.
            const allDialogs = document.querySelectorAll('.shepherd-element.shepherd-enabled');
            let visibleDialog: Element | null = null;
            allDialogs.forEach((dialog) => {
              const rect = dialog.getBoundingClientRect();
              const isVisible = rect.width > 0 && rect.height > 0;
              console.log(
                `[tour-focus] Dialog: ${dialog.className.substring(0, 50)}, rect=${rect.width}x${rect.height}, visible=${isVisible}`
              );
              if (isVisible) {
                visibleDialog = dialog;
              }
            });

            const primaryButton = visibleDialog?.querySelector(
              '.shepherd-button:not(.shepherd-button-secondary)'
            );
            console.log(`[tour-focus] Found primary button in visible dialog:`, primaryButton);
            if (primaryButton instanceof HTMLElement) {
              targetElement = primaryButton;
            }
          }

          if (targetElement) {
            console.log(`[tour-focus] Adding class to:`, targetElement);
            targetElement.classList.add(FOCUS_CLASS);
            console.log(`[tour-focus] Class added. Element classes now:`, targetElement.className);
          } else if (retryCount < 10) {
            console.log(`[tour-focus] Target not found, scheduling retry ${retryCount + 1}`);
            // Retry if element not found yet (Shepherd may still be rendering)
            setTimeout(() => addVisualFocus(retryCount + 1), 50);
          } else {
            console.log(`[tour-focus] Failed to find target after 10 retries`);
          }
        };

        // Add visual focus after a brief delay for DOM to settle.
        console.log(`[tour-focus] show() called for step "${step.id}", scheduling addVisualFocus`);
        setTimeout(() => addVisualFocus(0), 100);
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

        // Note: Don't remove .tour-keyboard-focus here - the show callback
        // already cleans up before adding. Removing here causes a race condition
        // where hide() from step N runs after show() from step N+1, removing
        // the class that was just added.
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
