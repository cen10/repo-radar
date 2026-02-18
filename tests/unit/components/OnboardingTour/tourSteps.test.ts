import { describe, it, expect, vi } from 'vitest';
import { configureStepsForShepherd, getCurrentPage } from '@/components/OnboardingTour/tourSteps';
import { getTourSteps } from '@/components/OnboardingTour/tourContent';

describe('getTourSteps', () => {
  it('returns steps with welcome text when user has starred repos', () => {
    const steps = getTourSteps(true);

    expect(steps[0].text).toMatch(/welcome to repo radar/i);
    // Welcome text mentions tracking star growth, releases, and activity
    expect(steps[0].text).toMatch(/track.*momentum/i);
  });

  it('returns steps with prompt text when user has no starred repos', () => {
    const steps = getTourSteps(false);

    // First step is still welcome
    expect(steps[0].text).toMatch(/welcome to repo radar/i);
    // My Stars heading step prompts user to star repos on GitHub when empty
    const myStarsStep = steps.find((s) => s.id === 'my-stars-heading');
    expect(myStarsStep).toBeDefined();
    expect(myStarsStep!.text).toMatch(/star repositories on github/i);
  });

  it('returns steps spanning all three pages', () => {
    const steps = getTourSteps(true);
    const pages = new Set(steps.map((s) => s.page));

    expect(pages).toContain('stars');
    expect(pages).toContain('radar');
    expect(pages).toContain('repo-detail');
  });

  it('welcome step is centered (no target)', () => {
    const steps = getTourSteps(true);

    expect(steps[0].id).toBe('welcome');
    expect(steps[0].target).toBe('');
    expect(steps[0].placement).toBeUndefined();
  });

  it('my-stars-heading step targets the My Stars heading', () => {
    const steps = getTourSteps(true);
    const myStarsStep = steps.find((s) => s.id === 'my-stars-heading');

    expect(myStarsStep).toBeDefined();
    expect(myStarsStep!.target).toBe('[data-tour="my-stars-heading"]');
    expect(myStarsStep!.placement).toBe('bottom');
  });

  it('includes keyboard tip in welcome text', () => {
    const steps = getTourSteps(true);

    expect(steps[0].text).toMatch(/arrow keys/i);
    expect(steps[0].text).toMatch(/tab/i);
  });

  it('marks the click-repo step as canClickTarget for navigation', () => {
    const steps = getTourSteps(true);
    const clickRepoStep = steps.find((s) => s.id === 'click-repo');

    expect(clickRepoStep).toBeDefined();
    expect(clickRepoStep!.canClickTarget).toBe(true);
  });

  it('includes radar icon step on repo detail page', () => {
    const steps = getTourSteps(true);
    const radarIconStep = steps.find((s) => s.id === 'repo-detail-radar-icon');

    expect(radarIconStep).toBeDefined();
    expect(radarIconStep!.page).toBe('repo-detail');
    expect(radarIconStep!.target).toBe('[data-tour="repo-radar-icon"]');
    expect(radarIconStep!.text).toMatch(/add or remove.*radars.*without leaving/i);
  });

  it('has at least one step per page', () => {
    const steps = getTourSteps(true);

    const starsSteps = steps.filter((s) => s.page === 'stars');
    const radarSteps = steps.filter((s) => s.page === 'radar');
    const repoDetailSteps = steps.filter((s) => s.page === 'repo-detail');

    expect(starsSteps.length).toBeGreaterThan(0);
    expect(radarSteps.length).toBeGreaterThan(0);
    expect(repoDetailSteps.length).toBeGreaterThan(0);
  });

  it('assigns unique IDs to all steps', () => {
    const steps = getTourSteps(true);
    const ids = steps.map((s) => s.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(ids.length);
  });

  describe('React Ecosystem flow (authenticated users with no radars)', () => {
    it('includes help-button as final step', () => {
      const steps = getTourSteps(true, true); // hasStarredRepos=true, isUsingExampleRadar=true
      const helpButtonStep = steps.find((s) => s.id === 'help-button');

      expect(helpButtonStep).toBeDefined();
      expect(helpButtonStep!.text).toMatch(/tour is complete/i);
      expect(helpButtonStep!.page).toBe('repo-detail');
    });

    it('includes help-button step regardless of radar type', () => {
      const steps = getTourSteps(true, false); // hasStarredRepos=true, isUsingExampleRadar=false
      const helpButtonStep = steps.find((s) => s.id === 'help-button');

      expect(helpButtonStep).toBeDefined();
    });

    it('shows React Ecosystem-specific text in sidebar-radars step', () => {
      const steps = getTourSteps(true, true);
      const sidebarStep = steps.find((s) => s.id === 'sidebar-radars');

      expect(sidebarStep!.text).toMatch(/react ecosystem/i);
      expect(sidebarStep!.text).toMatch(/click it to continue/i);
    });

    it('shows generic text in sidebar-radars step when user has real radars', () => {
      const steps = getTourSteps(true, false);
      const sidebarStep = steps.find((s) => s.id === 'sidebar-radars');

      expect(sidebarStep!.text).not.toMatch(/example radar/i);
      expect(sidebarStep!.text).toMatch(/click any radar/i);
    });

    it('shows React Ecosystem-specific text in radar-intro step', () => {
      const steps = getTourSteps(true, true);
      const radarIntroStep = steps.find((s) => s.id === 'radar-intro');

      expect(radarIntroStep!.text).toMatch(/react ecosystem radar contains demo data/i);
    });
  });

  describe('backTo navigation', () => {
    it('uses tour demo radar path for repo-header backTo', () => {
      const steps = getTourSteps(true, false);
      const repoHeaderStep = steps.find((s) => s.id === 'repo-header');

      expect(repoHeaderStep).toBeDefined();
      expect(repoHeaderStep!.backTo).toBeDefined();
      expect(repoHeaderStep!.backTo!.path).toBe('/radar/tour-demo-radar');
    });
  });
});

describe('configureStepsForShepherd', () => {
  const createMockTour = () => ({
    back: vi.fn(),
    next: vi.fn(),
    complete: vi.fn(),
  });

  it('converts step definitions to Shepherd step options', () => {
    const steps = getTourSteps(true);
    const starsSteps = steps.filter((s) => s.page === 'stars');
    const tour = createMockTour();

    const options = configureStepsForShepherd(starsSteps, { tour: tour as never });

    expect(options).toHaveLength(starsSteps.length);
    expect(options[0].id).toBe('welcome');
    expect(options[0].text).toMatch(/welcome/i);
  });

  it('adds Next button to non-last steps', () => {
    const steps = [
      { id: 'step1', target: '', text: 'First', page: 'stars' as const },
      { id: 'step2', target: '', text: 'Second', page: 'stars' as const },
    ];
    const tour = createMockTour();

    const options = configureStepsForShepherd(steps, { tour: tour as never });

    const firstStepButtons = options[0].buttons as Array<{ text: string }>;
    expect(firstStepButtons.some((b) => b.text === 'Next')).toBe(true);
  });

  it('adds Finish button to last step', () => {
    const steps = [
      { id: 'step1', target: '', text: 'First', page: 'stars' as const },
      { id: 'step2', target: '', text: 'Last', page: 'stars' as const },
    ];
    const tour = createMockTour();

    const options = configureStepsForShepherd(steps, { tour: tour as never });

    const lastStepButtons = options[1].buttons as Array<{ text: string }>;
    expect(lastStepButtons.some((b) => b.text === 'Finish')).toBe(true);
  });

  it('adds Back button to non-first steps', () => {
    const steps = [
      { id: 'step1', target: '', text: 'First', page: 'stars' as const },
      { id: 'step2', target: '', text: 'Second', page: 'stars' as const },
    ];
    const tour = createMockTour();

    const options = configureStepsForShepherd(steps, { tour: tour as never });

    const firstStepButtons = options[0].buttons as Array<{ text: string }>;
    const secondStepButtons = options[1].buttons as Array<{ text: string }>;

    expect(firstStepButtons.some((b) => b.text === 'Back')).toBe(false);
    expect(secondStepButtons.some((b) => b.text === 'Back')).toBe(true);
  });

  it('hides Next button when user must click target to advance', () => {
    const steps = [
      { id: 'step1', target: '', text: 'First', page: 'stars' as const },
      {
        id: 'step2',
        target: '',
        text: 'Click to continue',
        page: 'stars' as const,
        advanceByClickingTarget: true,
      },
      { id: 'step3', target: '', text: 'Last', page: 'stars' as const },
    ];
    const tour = createMockTour();

    const options = configureStepsForShepherd(steps, { tour: tour as never });

    const step2Buttons = options[1].buttons as Array<{ text: string }>;
    expect(step2Buttons.some((b) => b.text === 'Next')).toBe(false);
    expect(step2Buttons.some((b) => b.text === 'Back')).toBe(true);
  });

  it('sets attachTo for steps with targets', () => {
    const steps = [
      {
        id: 'step1',
        target: '[data-tour="test"]',
        text: 'Attached',
        page: 'stars' as const,
        placement: 'bottom' as const,
      },
    ];
    const tour = createMockTour();

    const options = configureStepsForShepherd(steps, { tour: tour as never });

    expect(options[0].attachTo).toEqual({
      element: '[data-tour="test"]',
      on: 'bottom',
    });
  });

  it('does not set attachTo for centered steps (empty target)', () => {
    const steps = [{ id: 'step1', target: '', text: 'Centered', page: 'stars' as const }];
    const tour = createMockTour();

    const options = configureStepsForShepherd(steps, { tour: tour as never });

    expect(options[0].attachTo).toBeUndefined();
  });

  it('delays tooltip display when tooltipDelayMs is set', () => {
    const steps = [
      { id: 'step1', target: '', text: 'Delayed', page: 'stars' as const, tooltipDelayMs: 100 },
    ];
    const tour = createMockTour();

    const options = configureStepsForShepherd(steps, { tour: tour as never });

    expect(options[0].beforeShowPromise).toBeDefined();
    expect(typeof options[0].beforeShowPromise).toBe('function');
  });

  it('uses backTo callback for cross-page Back navigation', () => {
    const onBackTo = vi.fn();
    const steps = [
      {
        id: 'step1',
        target: '',
        text: 'Cross-page',
        page: 'radar' as const,
        backTo: { stepId: 'sidebar-radars', path: '/stars' },
      },
    ];
    const tour = createMockTour();

    const options = configureStepsForShepherd(steps, { tour: tour as never, onBackTo });

    const buttons = options[0].buttons as Array<{ text: string; action: () => void }>;
    const backButton = buttons.find((b) => b.text === 'Back');

    expect(backButton).toBeDefined();
    backButton!.action();
    expect(onBackTo).toHaveBeenCalledWith('sidebar-radars', '/stars');
  });

  it('shows Back button on first page step when backTo is defined', () => {
    // This tests the fix for the bug where repo-header (first step on repo-detail page)
    // had no Back button even though it had a backTo pointing to the radar page
    const onBackTo = vi.fn();
    const steps = [
      {
        id: 'repo-header',
        target: '[data-tour="repo-name"]',
        text: 'First step on this page',
        page: 'repo-detail' as const,
        backTo: { stepId: 'click-repo', path: '/radar/tour-demo-radar' },
      },
      {
        id: 'releases',
        target: '[data-tour="releases"]',
        text: 'Second step',
        page: 'repo-detail' as const,
      },
    ];
    const tour = createMockTour();

    const options = configureStepsForShepherd(steps, { tour: tour as never, onBackTo });

    // First step (index 0) should still have Back button because backTo is defined
    const firstStepButtons = options[0].buttons as Array<{ text: string }>;
    expect(firstStepButtons.some((b) => b.text === 'Back')).toBe(true);
  });

  it('enables cancel icon on all steps', () => {
    const steps = [{ id: 'step1', target: '', text: 'Test', page: 'stars' as const }];
    const tour = createMockTour();

    const options = configureStepsForShepherd(steps, { tour: tour as never });

    expect(options[0].cancelIcon).toEqual({ enabled: true });
  });

  it('sets canClickTarget from step definition', () => {
    const steps = [
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

    const options = configureStepsForShepherd(steps, { tour: tour as never });

    expect(options[0].canClickTarget).toBe(true);
    expect(options[1].canClickTarget).toBe(false);
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
