/**
 * Schema validation tests for GitHub mock data factories.
 *
 * TypeScript compilation provides implicit schema validation since the factories
 * use types generated from GitHub's OpenAPI spec. These tests verify runtime
 * behavior and catch issues with required fields.
 */
import { describe, it, expect } from 'vitest';
import { createMockStarredReposList, MOCK_LICENSE } from '../fixtures/github-mock-data';

describe('GitHub Mock Data Factories', () => {
  describe('MOCK_LICENSE', () => {
    it('has required license fields', () => {
      expect(MOCK_LICENSE.key).toBe('mit');
      expect(MOCK_LICENSE.name).toBe('MIT License');
      expect(MOCK_LICENSE.spdx_id).toBe('MIT');
    });
  });

  describe('createMockStarredReposList', () => {
    it('creates repos from tour data', () => {
      const list = createMockStarredReposList();
      expect(list.length).toBeGreaterThan(0);
    });

    it('creates repos with unique IDs', () => {
      const list = createMockStarredReposList();
      const ids = list.map((item) => item.repo.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(list.length);
    });

    it('creates repos with required GitHub API fields', () => {
      const list = createMockStarredReposList();
      const repo = list[0].repo;

      // Required fields from GitHub API schema
      expect(repo.id).toBeDefined();
      expect(repo.name).toBeDefined();
      expect(repo.full_name).toContain('/');
      expect(repo.owner.login).toBeDefined();
      expect(repo.html_url).toMatch(/^https:\/\/github\.com\//);
      expect(typeof repo.stargazers_count).toBe('number');
      expect(typeof repo.forks_count).toBe('number');
      expect(typeof repo.watchers_count).toBe('number');
    });

    it('wraps repository with starred_at timestamp', () => {
      const list = createMockStarredReposList();
      expect(list[0].starred_at).toBeDefined();
      expect(new Date(list[0].starred_at).getTime()).not.toBeNaN();
    });
  });
});
