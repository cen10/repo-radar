/**
 * Schema validation tests for GitHub mock data factories.
 *
 * TypeScript compilation provides implicit schema validation since the factories
 * use types generated from GitHub's OpenAPI spec. These tests verify runtime
 * behavior and catch issues with required fields that TypeScript allows as optional.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMockGitHubUser,
  createMockGitHubRepository,
  createMockStarredRepo,
  createMockStarredReposList,
  createMockLicense,
  createMockRateLimitResponse,
  resetIdCounter,
} from '../../e2e/fixtures/github-mock-data';

describe('GitHub Mock Data Factories', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  describe('createMockGitHubUser', () => {
    it('creates a user with required fields', () => {
      const user = createMockGitHubUser();

      // Required fields per GitHub API
      expect(user.login).toBeDefined();
      expect(typeof user.login).toBe('string');
      expect(user.id).toBeDefined();
      expect(typeof user.id).toBe('number');
      expect(user.node_id).toBeDefined();
      expect(user.avatar_url).toMatch(/^https:\/\//);
      expect(user.html_url).toMatch(/^https:\/\/github\.com\//);
      expect(user.type).toBe('User');
    });

    it('allows overriding fields', () => {
      const user = createMockGitHubUser({
        login: 'custom-user',
        id: 12345,
      });

      expect(user.login).toBe('custom-user');
      expect(user.id).toBe(12345);
    });

    it('generates consistent URLs based on login', () => {
      const user = createMockGitHubUser({ login: 'test-user' });

      expect(user.url).toBe('https://api.github.com/users/test-user');
      expect(user.html_url).toBe('https://github.com/test-user');
      expect(user.repos_url).toBe('https://api.github.com/users/test-user/repos');
    });
  });

  describe('createMockLicense', () => {
    it('creates a valid license object', () => {
      const license = createMockLicense();

      expect(license).not.toBeNull();
      expect(license?.key).toBe('mit');
      expect(license?.name).toBe('MIT License');
      expect(license?.spdx_id).toBe('MIT');
      expect(license?.url).toMatch(/^https:\/\/api\.github\.com\/licenses\//);
    });

    it('allows custom license details', () => {
      const license = createMockLicense({
        key: 'apache-2.0',
        name: 'Apache License 2.0',
        spdx_id: 'Apache-2.0',
      });

      expect(license?.key).toBe('apache-2.0');
      expect(license?.name).toBe('Apache License 2.0');
    });
  });

  describe('createMockGitHubRepository', () => {
    it('creates a repository with all required fields', () => {
      const repo = createMockGitHubRepository();

      // Core identification
      expect(repo.id).toBeDefined();
      expect(typeof repo.id).toBe('number');
      expect(repo.name).toBeDefined();
      expect(repo.full_name).toBeDefined();
      expect(repo.node_id).toBeDefined();

      // Owner
      expect(repo.owner).toBeDefined();
      expect(repo.owner.login).toBeDefined();

      // URLs - critical for the app
      expect(repo.html_url).toMatch(/^https:\/\/github\.com\//);
      expect(repo.url).toMatch(/^https:\/\/api\.github\.com\/repos\//);
      expect(repo.stargazers_url).toBeDefined();

      // Counts - displayed in UI
      expect(typeof repo.stargazers_count).toBe('number');
      expect(typeof repo.forks_count).toBe('number');
      expect(typeof repo.watchers_count).toBe('number');
      expect(typeof repo.open_issues_count).toBe('number');

      // Timestamps
      expect(repo.created_at).toBeDefined();
      expect(repo.updated_at).toBeDefined();
    });

    it('generates unique IDs for each call', () => {
      const repo1 = createMockGitHubRepository();
      const repo2 = createMockGitHubRepository();

      expect(repo1.id).not.toBe(repo2.id);
      expect(repo1.name).not.toBe(repo2.name);
    });

    it('builds full_name from owner and name', () => {
      const repo = createMockGitHubRepository({
        name: 'my-repo',
        owner: { login: 'my-org' },
      });

      expect(repo.full_name).toBe('my-org/my-repo');
    });

    it('includes license when not explicitly set to null', () => {
      const repo = createMockGitHubRepository();
      expect(repo.license).not.toBeNull();
      expect(repo.license?.key).toBe('mit');
    });

    it('allows null license', () => {
      const repo = createMockGitHubRepository({ license: null });
      expect(repo.license).toBeNull();
    });
  });

  describe('createMockStarredRepo', () => {
    it('wraps repository with starred_at timestamp', () => {
      const starred = createMockStarredRepo();

      expect(starred.starred_at).toBeDefined();
      expect(new Date(starred.starred_at).getTime()).not.toBeNaN();
      expect(starred.repo).toBeDefined();
      expect(starred.repo.id).toBeDefined();
    });

    it('passes options through to repository', () => {
      const starred = createMockStarredRepo({
        name: 'starred-repo',
        stargazers_count: 1000,
      });

      expect(starred.repo.name).toBe('starred-repo');
      expect(starred.repo.stargazers_count).toBe(1000);
    });

    it('allows custom starred_at date', () => {
      const date = '2024-01-15T10:00:00Z';
      const starred = createMockStarredRepo({ starred_at: date });

      expect(starred.starred_at).toBe(date);
    });
  });

  describe('createMockStarredReposList', () => {
    it('creates specified number of repos', () => {
      const list = createMockStarredReposList(3);

      expect(list).toHaveLength(3);
      list.forEach((item) => {
        expect(item.starred_at).toBeDefined();
        expect(item.repo).toBeDefined();
      });
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

    it('applies base options to all repos', () => {
      const list = createMockStarredReposList(2, {
        owner: { login: 'shared-owner' },
        language: 'Rust',
      });

      list.forEach((item) => {
        expect(item.repo.owner.login).toBe('shared-owner');
        expect(item.repo.language).toBe('Rust');
      });
    });
  });

  describe('createMockRateLimitResponse', () => {
    it('creates valid rate limit structure', () => {
      const rateLimit = createMockRateLimitResponse();

      // Core rate limit
      expect(rateLimit.rate).toBeDefined();
      expect(rateLimit.rate.limit).toBe(5000);
      expect(rateLimit.rate.remaining).toBeLessThanOrEqual(rateLimit.rate.limit);

      // Resources
      expect(rateLimit.resources).toBeDefined();
      expect(rateLimit.resources.core).toBeDefined();
      expect(rateLimit.resources.search).toBeDefined();

      // Reset time should be in the future
      const now = Math.floor(Date.now() / 1000);
      expect(rateLimit.rate.reset).toBeGreaterThan(now);
    });
  });

  describe('resetIdCounter', () => {
    it('resets ID generation to starting value', () => {
      // Generate some IDs
      createMockGitHubRepository();
      createMockGitHubRepository();

      // Reset
      resetIdCounter();

      // New repo should have ID close to starting value (1000)
      const repo = createMockGitHubRepository();
      expect(repo.id).toBe(1000);
    });
  });
});
