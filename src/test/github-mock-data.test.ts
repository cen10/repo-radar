/**
 * Schema validation tests for GitHub mock data factories.
 *
 * TypeScript compilation provides implicit schema validation since the factories
 * use types generated from GitHub's OpenAPI spec. These tests verify runtime
 * behavior and catch issues with required fields.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMockStarredReposList,
  MOCK_LICENSE,
  resetIdCounter,
} from '../../e2e/fixtures/github-mock-data';

describe('GitHub Mock Data Factories', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  describe('MOCK_LICENSE', () => {
    it('has required license fields', () => {
      expect(MOCK_LICENSE.key).toBe('mit');
      expect(MOCK_LICENSE.name).toBe('MIT License');
      expect(MOCK_LICENSE.spdx_id).toBe('MIT');
    });
  });

  describe('createMockStarredReposList', () => {
    it('creates specified number of repos', () => {
      const list = createMockStarredReposList(3);
      expect(list).toHaveLength(3);
    });

    it('creates repos with unique IDs', () => {
      const list = createMockStarredReposList(5);
      const ids = list.map((item) => item.repo.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);
    });

    it('names repos sequentially', () => {
      const list = createMockStarredReposList(3);
      expect(list[0].repo.name).toBe('repo-1');
      expect(list[1].repo.name).toBe('repo-2');
      expect(list[2].repo.name).toBe('repo-3');
    });

    it('orders repos with most recent starred first', () => {
      const list = createMockStarredReposList(3);
      const dates = list.map((item) => new Date(item.starred_at).getTime());
      expect(dates[0]).toBeGreaterThan(dates[1]);
      expect(dates[1]).toBeGreaterThan(dates[2]);
    });

    it('creates repos with required GitHub API fields', () => {
      const list = createMockStarredReposList(1);
      const repo = list[0].repo;

      // Required fields from GitHub API schema
      expect(repo.id).toBeDefined();
      expect(repo.name).toBeDefined();
      expect(repo.full_name).toContain('mock-user/');
      expect(repo.owner.login).toBe('mock-user');
      expect(repo.html_url).toMatch(/^https:\/\/github\.com\//);
      expect(typeof repo.stargazers_count).toBe('number');
      expect(typeof repo.forks_count).toBe('number');
      expect(typeof repo.watchers_count).toBe('number');
    });

    it('wraps repository with starred_at timestamp', () => {
      const list = createMockStarredReposList(1);
      expect(list[0].starred_at).toBeDefined();
      expect(new Date(list[0].starred_at).getTime()).not.toBeNaN();
    });
  });

  describe('resetIdCounter', () => {
    it('resets ID generation', () => {
      createMockStarredReposList(2);
      resetIdCounter();
      const list = createMockStarredReposList(1);
      expect(list[0].repo.id).toBe(1000);
    });
  });
});
