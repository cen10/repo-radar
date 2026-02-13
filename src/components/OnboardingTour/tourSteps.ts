import type { Tour, StepOptions, StepOptionsButton, PopperPlacement } from 'shepherd.js';

export type TourPage = 'stars' | 'radar' | 'repo-detail';

export interface TourStepDef {
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

interface ToShepherdStepsOptions {
  tour: Tour;
  onBackTo?: (stepId: string, path: string) => void;
}

function buildButtons(
  def: TourStepDef,
  index: number,
  total: number,
  tour: Tour,
  onBackTo?: (stepId: string, path: string) => void
): StepOptionsButton[] {
  const buttons: StepOptionsButton[] = [];
  const isFirstStep = index === 0;
  const isLastStep = index === total - 1;
  const isCrossPageNav = def.backTo && onBackTo;

  if (isCrossPageNav) {
    buttons.push({
      text: 'Back',
      action: () => onBackTo(def.backTo!.stepId, def.backTo!.path),
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
  if (!def.advanceByClickingTarget) {
    buttons.push({
      text: isLastStep ? 'Finish' : 'Next',
      action: () => (isLastStep ? tour.complete() : tour.next()),
    });
  }

  return buttons;
}

export function toShepherdSteps(
  defs: TourStepDef[],
  options: ToShepherdStepsOptions
): StepOptions[] {
  const { tour, onBackTo } = options;

  return defs.map((def, index) => {
    const step: StepOptions = {
      id: def.id,
      text: def.text,
      buttons: buildButtons(def, index, defs.length, tour, onBackTo),
      cancelIcon: { enabled: true },
      canClickTarget: def.canClickTarget ?? false,
      scrollTo: { behavior: 'smooth', block: 'center' } as ScrollIntoViewOptions,
    };

    if (def.target) {
      step.attachTo = { element: def.target, on: def.placement };
    }

    // Delay tooltip after page navigation to let the DOM settle before attaching
    if (def.tooltipDelayMs) {
      step.beforeShowPromise = () => new Promise((r) => setTimeout(r, def.tooltipDelayMs));
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
