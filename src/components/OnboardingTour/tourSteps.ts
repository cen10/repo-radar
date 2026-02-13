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
  onBackTo?: (stepId: string, path: string) => void
): StepOptionsButton[] {
  const buttons: StepOptionsButton[] = [];
  const isCrossPageNav = step.backTo && onBackTo;

  if (isCrossPageNav) {
    buttons.push({
      text: 'Back',
      action: () => onBackTo(step.backTo!.stepId, step.backTo!.path),
      secondary: true,
    });
  } else if (!isFirstStep) {
    buttons.push({
      text: 'Back',
      action: () => tour.back(),
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

/** Converts our tour steps to Shepherd-compatible steps with buttons and callbacks. */
export function configureStepsForShepherd(
  steps: TourStep[],
  config: AddShepherdOptionsConfig
): StepOptions[] {
  const { tour, onBackTo } = config;

  return steps.map((step, index) => {
    const isFirstStep = index === 0;
    const isLastStep = index === steps.length - 1;

    const configuredStep: StepOptions = {
      id: step.id,
      text: step.text,
      buttons: buildButtons(step, isFirstStep, isLastStep, tour, onBackTo),
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

    return configuredStep;
  });
}

export function getCurrentPage(pathname: string): TourPage | null {
  if (pathname === '/stars') return 'stars';
  if (pathname.startsWith('/radar/')) return 'radar';
  if (pathname.startsWith('/repo/')) return 'repo-detail';
  return null;
}
