import type { Tour, StepOptions, StepOptionsButton, PopperPlacement } from 'shepherd.js';

export type TourPage = 'stars' | 'radar' | 'repo-detail';

export interface TourStepDef {
  id: string;
  target: string;
  text: string;
  page: TourPage;
  placement?: PopperPlacement;
  canClickTarget?: boolean;
  showDelay?: number;
  hideNextOnly?: boolean;
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
  const isFirst = index === 0;
  const isLast = index === total - 1;

  if (def.backTo && onBackTo) {
    buttons.push({
      text: 'Back',
      action: () => onBackTo(def.backTo!.stepId, def.backTo!.path),
      secondary: true,
    });
  } else if (!isFirst) {
    buttons.push({
      text: 'Back',
      action: () => tour.back(),
      secondary: true,
    });
  }

  if (!def.hideNextOnly) {
    buttons.push({
      text: isLast ? 'Finish' : 'Next',
      action: () => (isLast ? tour.complete() : tour.next()),
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

    if (def.showDelay) {
      step.beforeShowPromise = () => new Promise((r) => setTimeout(r, def.showDelay));
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
