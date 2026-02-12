import { describe, it, expect, vi } from 'vitest';
import {
  getTourStepDefs,
  toShepherdSteps,
  getCurrentPage,
} from '@/components/OnboardingTour/tourSteps';

describe('getTourStepDefs', () => {
  it('returns steps with welcome text when user has starred repos', () => {
    const steps = getTourStepDefs({ hasStarredRepos: true });

    expect(steps[0].text).toMatch(/welcome to repo radar/i);
    // Welcome text mentions tracking star growth, releases, and activity
    expect(steps[0].text).toMatch(/track.*momentum/i);
  });

  it('returns steps with prompt text when user has no starred repos', () => {
    const steps = getTourStepDefs({ hasStarredRepos: false });

    // First step is still welcome
    expect(steps[0].text).toMatch(/welcome to repo radar/i);
    // Empty state step prompts user to star repos on GitHub
    const emptyStateStep = steps.find((s) => s.id === 'my-stars-heading');
    expect(emptyStateStep).toBeDefined();
    expect(emptyStateStep!.text).toMatch(/star repositories on github/i);
  });

  it('returns steps spanning all three pages', () => {
    const steps = getTourStepDefs({ hasStarredRepos: true });
    const pages = new Set(steps.map((s) => s.page));

    expect(pages).toContain('stars');
    expect(pages).toContain('radar');
    expect(pages).toContain('repo-detail');
  });

  it('has a centered welcome step with no specific target', () => {
    const steps = getTourStepDefs({ hasStarredRepos: true });

    expect(steps[0].target).toBe('');
    expect(steps[0].placement).toBeUndefined(); // Centered steps don't need placement
  });

  it('includes keyboard tip in welcome text', () => {
    const steps = getTourStepDefs({ hasStarredRepos: true });

    expect(steps[0].text).toMatch(/arrow keys/i);
    expect(steps[0].text).toMatch(/tab/i);
  });

  it('marks the click-repo step as canClickTarget for navigation', () => {
    const steps = getTourStepDefs({ hasStarredRepos: true });
    const clickRepoStep = steps.find((s) => s.id === 'click-repo');

    expect(clickRepoStep).toBeDefined();
    expect(clickRepoStep!.canClickTarget).toBe(true);
  });

  it('has at least one step per page', () => {
    const steps = getTourStepDefs({ hasStarredRepos: true });

    const starsSteps = steps.filter((s) => s.page === 'stars');
    const radarSteps = steps.filter((s) => s.page === 'radar');
    const repoDetailSteps = steps.filter((s) => s.page === 'repo-detail');

    expect(starsSteps.length).toBeGreaterThan(0);
    expect(radarSteps.length).toBeGreaterThan(0);
    expect(repoDetailSteps.length).toBeGreaterThan(0);
  });

  it('assigns unique IDs to all steps', () => {
    const steps = getTourStepDefs({ hasStarredRepos: true });
    const ids = steps.map((s) => s.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe('toShepherdSteps', () => {
  const createMockTour = () => ({
    back: vi.fn(),
    next: vi.fn(),
    complete: vi.fn(),
  });

  it('converts step definitions to Shepherd step options', () => {
    const defs = getTourStepDefs({ hasStarredRepos: true });
    const starsSteps = defs.filter((s) => s.page === 'stars');
    const tour = createMockTour();

    const shepherdSteps = toShepherdSteps(starsSteps, { tour: tour as never });

    expect(shepherdSteps).toHaveLength(starsSteps.length);
    expect(shepherdSteps[0].id).toBe('welcome');
    expect(shepherdSteps[0].text).toMatch(/welcome/i);
  });

  it('adds Next button to non-last steps', () => {
    const defs = [
      { id: 'step1', target: '', text: 'First', page: 'stars' as const },
      { id: 'step2', target: '', text: 'Second', page: 'stars' as const },
    ];
    const tour = createMockTour();

    const shepherdSteps = toShepherdSteps(defs, { tour: tour as never });

    const firstStepButtons = shepherdSteps[0].buttons as Array<{ text: string }>;
    expect(firstStepButtons.some((b) => b.text === 'Next')).toBe(true);
  });

  it('adds Finish button to last step', () => {
    const defs = [
      { id: 'step1', target: '', text: 'First', page: 'stars' as const },
      { id: 'step2', target: '', text: 'Last', page: 'stars' as const },
    ];
    const tour = createMockTour();

    const shepherdSteps = toShepherdSteps(defs, { tour: tour as never });

    const lastStepButtons = shepherdSteps[1].buttons as Array<{ text: string }>;
    expect(lastStepButtons.some((b) => b.text === 'Finish')).toBe(true);
  });

  it('adds Back button to non-first steps', () => {
    const defs = [
      { id: 'step1', target: '', text: 'First', page: 'stars' as const },
      { id: 'step2', target: '', text: 'Second', page: 'stars' as const },
    ];
    const tour = createMockTour();

    const shepherdSteps = toShepherdSteps(defs, { tour: tour as never });

    const firstStepButtons = shepherdSteps[0].buttons as Array<{ text: string }>;
    const secondStepButtons = shepherdSteps[1].buttons as Array<{ text: string }>;

    expect(firstStepButtons.some((b) => b.text === 'Back')).toBe(false);
    expect(secondStepButtons.some((b) => b.text === 'Back')).toBe(true);
  });

  it('hides Next button when hideNextOnly is true', () => {
    const defs = [
      { id: 'step1', target: '', text: 'First', page: 'stars' as const },
      {
        id: 'step2',
        target: '',
        text: 'Click to continue',
        page: 'stars' as const,
        hideNextOnly: true,
      },
      { id: 'step3', target: '', text: 'Last', page: 'stars' as const },
    ];
    const tour = createMockTour();

    const shepherdSteps = toShepherdSteps(defs, { tour: tour as never });

    const step2Buttons = shepherdSteps[1].buttons as Array<{ text: string }>;
    expect(step2Buttons.some((b) => b.text === 'Next')).toBe(false);
    expect(step2Buttons.some((b) => b.text === 'Back')).toBe(true);
  });

  it('hides all buttons when hideButtons is true', () => {
    const defs = [
      { id: 'step1', target: '', text: 'No buttons', page: 'stars' as const, hideButtons: true },
    ];
    const tour = createMockTour();

    const shepherdSteps = toShepherdSteps(defs, { tour: tour as never });

    expect(shepherdSteps[0].buttons).toHaveLength(0);
  });

  it('sets attachTo for steps with targets', () => {
    const defs = [
      {
        id: 'step1',
        target: '[data-tour="test"]',
        text: 'Attached',
        page: 'stars' as const,
        placement: 'bottom' as const,
      },
    ];
    const tour = createMockTour();

    const shepherdSteps = toShepherdSteps(defs, { tour: tour as never });

    expect(shepherdSteps[0].attachTo).toEqual({
      element: '[data-tour="test"]',
      on: 'bottom',
    });
  });

  it('does not set attachTo for centered steps (empty target)', () => {
    const defs = [{ id: 'step1', target: '', text: 'Centered', page: 'stars' as const }];
    const tour = createMockTour();

    const shepherdSteps = toShepherdSteps(defs, { tour: tour as never });

    expect(shepherdSteps[0].attachTo).toBeUndefined();
  });

  it('sets advanceOn when specified', () => {
    const advanceOn = { selector: '.my-button', event: 'click' };
    const defs = [
      { id: 'step1', target: '', text: 'Auto-advance', page: 'stars' as const, advanceOn },
    ];
    const tour = createMockTour();

    const shepherdSteps = toShepherdSteps(defs, { tour: tour as never });

    expect(shepherdSteps[0].advanceOn).toEqual(advanceOn);
  });

  it('adds beforeShowPromise for showDelay', () => {
    const defs = [
      { id: 'step1', target: '', text: 'Delayed', page: 'stars' as const, showDelay: 100 },
    ];
    const tour = createMockTour();

    const shepherdSteps = toShepherdSteps(defs, { tour: tour as never });

    expect(shepherdSteps[0].beforeShowPromise).toBeDefined();
    expect(typeof shepherdSteps[0].beforeShowPromise).toBe('function');
  });

  it('uses backTo callback for cross-page Back navigation', () => {
    const onBackTo = vi.fn();
    const defs = [
      {
        id: 'step1',
        target: '',
        text: 'Cross-page',
        page: 'radar' as const,
        backTo: { stepId: 'sidebar-radars', path: '/stars' },
      },
    ];
    const tour = createMockTour();

    const shepherdSteps = toShepherdSteps(defs, { tour: tour as never, onBackTo });

    const buttons = shepherdSteps[0].buttons as Array<{ text: string; action: () => void }>;
    const backButton = buttons.find((b) => b.text === 'Back');

    expect(backButton).toBeDefined();
    backButton!.action();
    expect(onBackTo).toHaveBeenCalledWith('sidebar-radars', '/stars');
  });

  it('enables cancel icon on all steps', () => {
    const defs = [{ id: 'step1', target: '', text: 'Test', page: 'stars' as const }];
    const tour = createMockTour();

    const shepherdSteps = toShepherdSteps(defs, { tour: tour as never });

    expect(shepherdSteps[0].cancelIcon).toEqual({ enabled: true });
  });

  it('sets canClickTarget from step definition', () => {
    const defs = [
      {
        id: 'step1',
        target: '[data-tour="test"]',
        text: 'Clickable',
        page: 'stars' as const,
        canClickTarget: true,
      },
      { id: 'step2', target: '[data-tour="test2"]', text: 'Not clickable', page: 'stars' as const },
    ];
    const tour = createMockTour();

    const shepherdSteps = toShepherdSteps(defs, { tour: tour as never });

    expect(shepherdSteps[0].canClickTarget).toBe(true);
    expect(shepherdSteps[1].canClickTarget).toBe(false);
  });
});

describe('getCurrentPage', () => {
  it('returns "stars" for /stars', () => {
    expect(getCurrentPage('/stars')).toBe('stars');
  });

  it('returns "radar" for /radar/:id paths', () => {
    expect(getCurrentPage('/radar/abc-123')).toBe('radar');
    expect(getCurrentPage('/radar/xyz')).toBe('radar');
  });

  it('returns "repo-detail" for /repo/:owner/:name paths', () => {
    expect(getCurrentPage('/repo/user/test-repo')).toBe('repo-detail');
  });

  it('returns null for unrecognized paths', () => {
    expect(getCurrentPage('/')).toBeNull();
    expect(getCurrentPage('/settings')).toBeNull();
    expect(getCurrentPage('/explore')).toBeNull();
  });
});
