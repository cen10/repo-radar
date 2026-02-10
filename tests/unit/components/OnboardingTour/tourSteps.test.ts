import { describe, it, expect } from 'vitest';
import { getTourSteps, getCurrentPage } from '@/components/OnboardingTour/tourSteps';

describe('getTourSteps', () => {
  it('returns steps with welcome text when user has starred repos', () => {
    const steps = getTourSteps({ hasStarredRepos: true });

    expect(steps[0].content).toMatch(/welcome to repo radar/i);
    expect(steps[0].content).toMatch(/these are your starred/i);
  });

  it('returns steps with prompt text when user has no starred repos', () => {
    const steps = getTourSteps({ hasStarredRepos: false });

    expect(steps[0].content).toMatch(/welcome to repo radar/i);
    expect(steps[0].content).toMatch(/star repositories on github/i);
  });

  it('returns steps spanning all three pages', () => {
    const steps = getTourSteps({ hasStarredRepos: true });
    const pages = new Set(steps.map((s) => s.page));

    expect(pages).toContain('stars');
    expect(pages).toContain('radar');
    expect(pages).toContain('repo-detail');
  });

  it('has a centered welcome step with no specific target', () => {
    const steps = getTourSteps({ hasStarredRepos: true });

    expect(steps[0].target).toBe('');
    expect(steps[0].placement).toBe('center');
  });

  it('marks the sidebar step as desktopOnly', () => {
    const steps = getTourSteps({ hasStarredRepos: true });
    const sidebarStep = steps.find((s) => s.target === '[data-tour="sidebar-radars"]');

    expect(sidebarStep).toBeDefined();
    expect(sidebarStep!.desktopOnly).toBe(true);
  });

  it('marks the radar-icon step as spotlightClicks', () => {
    const steps = getTourSteps({ hasStarredRepos: true });
    const radarIconStep = steps.find((s) => s.target === '[data-tour="radar-icon"]');

    expect(radarIconStep).toBeDefined();
    expect(radarIconStep!.spotlightClicks).toBe(true);
  });

  it('has at least one step per page', () => {
    const steps = getTourSteps({ hasStarredRepos: true });

    const starsSteps = steps.filter((s) => s.page === 'stars');
    const radarSteps = steps.filter((s) => s.page === 'radar');
    const repoDetailSteps = steps.filter((s) => s.page === 'repo-detail');

    expect(starsSteps.length).toBeGreaterThan(0);
    expect(radarSteps.length).toBeGreaterThan(0);
    expect(repoDetailSteps.length).toBeGreaterThan(0);
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
