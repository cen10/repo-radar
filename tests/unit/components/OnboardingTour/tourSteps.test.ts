import { describe, it, expect } from 'vitest';
import { getTourStepDefs, getCurrentPage } from '@/components/OnboardingTour/tourSteps';

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

  it('marks the sidebar step as desktopOnly', () => {
    const steps = getTourStepDefs({ hasStarredRepos: true });
    const sidebarStep = steps.find((s) => s.target === '[data-tour="sidebar-radars"]');

    expect(sidebarStep).toBeDefined();
    expect(sidebarStep!.desktopOnly).toBe(true);
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
