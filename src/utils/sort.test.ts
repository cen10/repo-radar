import { describe, it, expect } from 'vitest';
import type { Repository } from '../types';
import {
  createRepositoryComparator,
  sortRepositories,
  sortByStars,
  sortByName,
  sortByGrowthRate,
  sortByUpdated,
} from './sort';

// Factory function for creating test repositories
function createTestRepo(overrides: Partial<Repository> = {}): Repository {
  return {
    id: 1,
    name: 'test-repo',
    full_name: 'owner/test-repo',
    owner: { login: 'owner', avatar_url: 'https://example.com/avatar.png' },
    description: 'A test repository',
    html_url: 'https://github.com/owner/test-repo',
    stargazers_count: 100,
    open_issues_count: 10,
    language: 'TypeScript',
    topics: [],
    updated_at: '2024-01-15T12:00:00Z',
    pushed_at: '2024-01-15T12:00:00Z',
    created_at: '2023-01-01T00:00:00Z',
    is_starred: true,
    ...overrides,
  };
}

describe('sort utilities', () => {
  describe('createRepositoryComparator', () => {
    it('creates a comparator for stars descending', () => {
      const repos = [
        createTestRepo({ id: 1, stargazers_count: 100 }),
        createTestRepo({ id: 2, stargazers_count: 500 }),
        createTestRepo({ id: 3, stargazers_count: 50 }),
      ];

      const sorted = repos.sort(createRepositoryComparator('stars', 'desc'));

      expect(sorted.map((r) => r.stargazers_count)).toEqual([500, 100, 50]);
    });

    it('creates a comparator for stars ascending', () => {
      const repos = [
        createTestRepo({ id: 1, stargazers_count: 100 }),
        createTestRepo({ id: 2, stargazers_count: 500 }),
        createTestRepo({ id: 3, stargazers_count: 50 }),
      ];

      const sorted = repos.sort(createRepositoryComparator('stars', 'asc'));

      expect(sorted.map((r) => r.stargazers_count)).toEqual([50, 100, 500]);
    });

    it('creates a comparator for name alphabetically', () => {
      const repos = [
        createTestRepo({ full_name: 'charlie/repo' }),
        createTestRepo({ full_name: 'alice/repo' }),
        createTestRepo({ full_name: 'bob/repo' }),
      ];

      const sorted = repos.sort(createRepositoryComparator('name', 'asc'));

      expect(sorted.map((r) => r.full_name)).toEqual(['alice/repo', 'bob/repo', 'charlie/repo']);
    });

    it('creates a comparator for growth rate', () => {
      const repos = [
        createTestRepo({ id: 1, metrics: { stars_growth_rate: 0.1 } }),
        createTestRepo({ id: 2, metrics: { stars_growth_rate: 0.5 } }),
        createTestRepo({ id: 3, metrics: { stars_growth_rate: 0.25 } }),
      ];

      const sorted = repos.sort(createRepositoryComparator('growth_rate', 'desc'));

      expect(sorted.map((r) => r.metrics?.stars_growth_rate)).toEqual([0.5, 0.25, 0.1]);
    });

    it('handles missing metrics by treating growth rate as 0', () => {
      const repos = [
        createTestRepo({ id: 1, metrics: { stars_growth_rate: 0.1 } }),
        createTestRepo({ id: 2, metrics: undefined }),
        createTestRepo({ id: 3, metrics: { stars_growth_rate: 0.5 } }),
      ];

      const sorted = repos.sort(createRepositoryComparator('growth_rate', 'desc'));

      expect(sorted.map((r) => r.id)).toEqual([3, 1, 2]);
    });

    it('creates a comparator for updated date', () => {
      const repos = [
        createTestRepo({ id: 1, updated_at: '2024-01-15T00:00:00Z' }),
        createTestRepo({ id: 2, updated_at: '2024-03-01T00:00:00Z' }),
        createTestRepo({ id: 3, updated_at: '2024-02-01T00:00:00Z' }),
      ];

      const sorted = repos.sort(createRepositoryComparator('updated', 'desc'));

      expect(sorted.map((r) => r.id)).toEqual([2, 3, 1]);
    });

    it('creates a comparator for created date', () => {
      const repos = [
        createTestRepo({ id: 1, created_at: '2023-06-01T00:00:00Z' }),
        createTestRepo({ id: 2, created_at: '2023-01-01T00:00:00Z' }),
        createTestRepo({ id: 3, created_at: '2023-12-01T00:00:00Z' }),
      ];

      const sorted = repos.sort(createRepositoryComparator('created', 'desc'));

      expect(sorted.map((r) => r.id)).toEqual([3, 1, 2]);
    });

    it('creates a comparator for open issues', () => {
      const repos = [
        createTestRepo({ id: 1, open_issues_count: 50 }),
        createTestRepo({ id: 2, open_issues_count: 10 }),
        createTestRepo({ id: 3, open_issues_count: 100 }),
      ];

      const sorted = repos.sort(createRepositoryComparator('issues', 'desc'));

      expect(sorted.map((r) => r.open_issues_count)).toEqual([100, 50, 10]);
    });
  });

  describe('sortRepositories', () => {
    it('returns a new sorted array without mutating original', () => {
      const original = [
        createTestRepo({ id: 1, stargazers_count: 100 }),
        createTestRepo({ id: 2, stargazers_count: 500 }),
      ];

      const sorted = sortRepositories(original, 'stars', 'desc');

      // Original should be unchanged
      expect(original[0].id).toBe(1);
      expect(original[1].id).toBe(2);

      // Sorted should be different array with sorted order
      expect(sorted).not.toBe(original);
      expect(sorted[0].id).toBe(2);
      expect(sorted[1].id).toBe(1);
    });

    it('defaults to descending order', () => {
      const repos = [
        createTestRepo({ stargazers_count: 100 }),
        createTestRepo({ stargazers_count: 500 }),
      ];

      const sorted = sortRepositories(repos, 'stars');

      expect(sorted[0].stargazers_count).toBe(500);
    });

    it('handles empty arrays', () => {
      const sorted = sortRepositories([], 'stars', 'desc');
      expect(sorted).toEqual([]);
    });

    it('handles single-element arrays', () => {
      const single = [createTestRepo({ stargazers_count: 100 })];
      const sorted = sortRepositories(single, 'stars', 'desc');
      expect(sorted).toHaveLength(1);
      expect(sorted[0].stargazers_count).toBe(100);
    });
  });

  describe('sortByStars', () => {
    it('sorts by stars descending by default', () => {
      const repos = [
        createTestRepo({ stargazers_count: 100 }),
        createTestRepo({ stargazers_count: 500 }),
        createTestRepo({ stargazers_count: 250 }),
      ];

      const sorted = sortByStars(repos);

      expect(sorted.map((r) => r.stargazers_count)).toEqual([500, 250, 100]);
    });

    it('sorts by stars ascending when specified', () => {
      const repos = [
        createTestRepo({ stargazers_count: 100 }),
        createTestRepo({ stargazers_count: 500 }),
      ];

      const sorted = sortByStars(repos, 'asc');

      expect(sorted.map((r) => r.stargazers_count)).toEqual([100, 500]);
    });

    it('maintains stable order for equal values', () => {
      const repos = [
        createTestRepo({ id: 1, stargazers_count: 100 }),
        createTestRepo({ id: 2, stargazers_count: 100 }),
        createTestRepo({ id: 3, stargazers_count: 100 }),
      ];

      const sorted = sortByStars(repos);

      // With equal values, order should be stable (unchanged)
      expect(sorted.map((r) => r.id)).toEqual([1, 2, 3]);
    });
  });

  describe('sortByName', () => {
    it('sorts alphabetically ascending by default', () => {
      const repos = [
        createTestRepo({ full_name: 'zebra/repo' }),
        createTestRepo({ full_name: 'alpha/repo' }),
        createTestRepo({ full_name: 'mike/repo' }),
      ];

      const sorted = sortByName(repos);

      expect(sorted.map((r) => r.full_name)).toEqual(['alpha/repo', 'mike/repo', 'zebra/repo']);
    });

    it('sorts reverse alphabetically when descending', () => {
      const repos = [
        createTestRepo({ full_name: 'alpha/repo' }),
        createTestRepo({ full_name: 'zebra/repo' }),
      ];

      const sorted = sortByName(repos, 'desc');

      expect(sorted.map((r) => r.full_name)).toEqual(['zebra/repo', 'alpha/repo']);
    });

    it('handles case sensitivity consistently', () => {
      const repos = [
        createTestRepo({ full_name: 'Beta/repo' }),
        createTestRepo({ full_name: 'alpha/repo' }),
        createTestRepo({ full_name: 'gamma/repo' }),
      ];

      const sorted = sortByName(repos);

      // localeCompare is case-insensitive by default
      expect(sorted.map((r) => r.full_name)).toEqual(['alpha/repo', 'Beta/repo', 'gamma/repo']);
    });
  });

  describe('sortByGrowthRate', () => {
    it('sorts by growth rate descending by default', () => {
      const repos = [
        createTestRepo({ id: 1, metrics: { stars_growth_rate: 0.1 } }),
        createTestRepo({ id: 2, metrics: { stars_growth_rate: 0.5 } }),
        createTestRepo({ id: 3, metrics: { stars_growth_rate: 0.25 } }),
      ];

      const sorted = sortByGrowthRate(repos);

      expect(sorted.map((r) => r.id)).toEqual([2, 3, 1]);
    });

    it('treats repos without metrics as 0 growth', () => {
      const repos = [
        createTestRepo({ id: 1, metrics: undefined }),
        createTestRepo({ id: 2, metrics: { stars_growth_rate: 0.5 } }),
        createTestRepo({ id: 3, metrics: { stars_growth_rate: -0.1 } }),
      ];

      const sorted = sortByGrowthRate(repos);

      expect(sorted.map((r) => r.id)).toEqual([2, 1, 3]);
    });

    it('handles negative growth rates correctly', () => {
      const repos = [
        createTestRepo({ id: 1, metrics: { stars_growth_rate: -0.2 } }),
        createTestRepo({ id: 2, metrics: { stars_growth_rate: 0.1 } }),
        createTestRepo({ id: 3, metrics: { stars_growth_rate: -0.5 } }),
      ];

      const sorted = sortByGrowthRate(repos, 'asc');

      expect(sorted.map((r) => r.id)).toEqual([3, 1, 2]);
    });
  });

  describe('sortByUpdated', () => {
    it('sorts by most recently updated first by default', () => {
      const repos = [
        createTestRepo({ id: 1, updated_at: '2024-01-01T00:00:00Z' }),
        createTestRepo({ id: 2, updated_at: '2024-03-01T00:00:00Z' }),
        createTestRepo({ id: 3, updated_at: '2024-02-01T00:00:00Z' }),
      ];

      const sorted = sortByUpdated(repos);

      expect(sorted.map((r) => r.id)).toEqual([2, 3, 1]);
    });

    it('sorts by oldest first when ascending', () => {
      const repos = [
        createTestRepo({ id: 1, updated_at: '2024-01-01T00:00:00Z' }),
        createTestRepo({ id: 2, updated_at: '2024-03-01T00:00:00Z' }),
      ];

      const sorted = sortByUpdated(repos, 'asc');

      expect(sorted.map((r) => r.id)).toEqual([1, 2]);
    });

    it('handles same-day updates with different times', () => {
      const repos = [
        createTestRepo({ id: 1, updated_at: '2024-01-15T08:00:00Z' }),
        createTestRepo({ id: 2, updated_at: '2024-01-15T12:00:00Z' }),
        createTestRepo({ id: 3, updated_at: '2024-01-15T06:00:00Z' }),
      ];

      const sorted = sortByUpdated(repos);

      expect(sorted.map((r) => r.id)).toEqual([2, 1, 3]);
    });
  });
});
