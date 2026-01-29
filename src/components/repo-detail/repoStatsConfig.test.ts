import { describe, it, expect } from 'vitest';
import { getStats, getLinks } from './repoStatsConfig';
import { createMockRepository } from '../../test/mocks/factories';

describe('repoStatsConfig', () => {
  describe('getStats', () => {
    it('returns 3 stat items', () => {
      const repository = createMockRepository();
      const stats = getStats(repository);

      expect(stats).toHaveLength(3);
    });

    it('returns stats with correct keys', () => {
      const repository = createMockRepository();
      const stats = getStats(repository);
      const keys = stats.map((s) => s.key);

      expect(keys).toEqual(['stars', 'forks', 'watchers']);
    });

    it('maps repository values correctly', () => {
      const repository = createMockRepository({
        stargazers_count: 100,
        forks_count: 50,
        watchers_count: 25,
      });
      const stats = getStats(repository);

      expect(stats[0].value).toBe(100);
      expect(stats[1].value).toBe(50);
      expect(stats[2].value).toBe(25);
    });

    it('includes icon component for each stat', () => {
      const repository = createMockRepository();
      const stats = getStats(repository);

      stats.forEach((stat) => {
        expect(stat.icon).toBeDefined();
      });
    });
  });

  describe('getLinks', () => {
    it('returns 2 link items', () => {
      const repository = createMockRepository();
      const links = getLinks(repository);

      expect(links).toHaveLength(2);
    });

    it('returns links with correct keys', () => {
      const repository = createMockRepository();
      const links = getLinks(repository);
      const keys = links.map((l) => l.key);

      expect(keys).toEqual(['issues', 'pulls']);
    });

    it('constructs correct hrefs from html_url', () => {
      const repository = createMockRepository({
        html_url: 'https://github.com/owner/repo',
      });
      const links = getLinks(repository);

      expect(links[0].href).toBe('https://github.com/owner/repo/issues');
      expect(links[1].href).toBe('https://github.com/owner/repo/pulls');
    });

    it('formats open issues count in label', () => {
      const repository = createMockRepository({
        open_issues_count: 42,
      });
      const links = getLinks(repository);

      expect(links[0].label).toBe('42 open issues');
    });

    it('formats large open issues count compactly', () => {
      const repository = createMockRepository({
        open_issues_count: 1500,
      });
      const links = getLinks(repository);

      expect(links[0].label).toBe('1.5k open issues');
    });
  });
});
