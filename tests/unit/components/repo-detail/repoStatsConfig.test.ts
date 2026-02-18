import { describe, it, expect } from 'vitest';
import { getStats, getLinks } from '@/components/repo-detail/repoStatsConfig';

const defaultCounts = {
  stargazers_count: 100,
  forks_count: 50,
  watchers_count: 25,
};

const defaultLinkParams = {
  html_url: 'https://github.com/owner/repo',
  issueCount: 42 as number | null,
};

describe('repoStatsConfig', () => {
  describe('getStats', () => {
    it('returns 3 stat items', () => {
      const stats = getStats(defaultCounts);

      expect(stats).toHaveLength(3);
    });

    it('returns stats with correct keys', () => {
      const stats = getStats(defaultCounts);
      const keys = stats.map((s) => s.key);

      expect(keys).toEqual(['stars', 'forks', 'watchers']);
    });

    it('maps values correctly', () => {
      const stats = getStats(defaultCounts);

      expect(stats[0].value).toBe(100);
      expect(stats[1].value).toBe(50);
      expect(stats[2].value).toBe(25);
    });

    it('includes icon component for each stat', () => {
      const stats = getStats(defaultCounts);

      stats.forEach((stat) => {
        expect(stat.icon).toBeDefined();
      });
    });
  });

  describe('getLinks', () => {
    it('returns 2 link items', () => {
      const links = getLinks(defaultLinkParams);

      expect(links).toHaveLength(2);
    });

    it('returns links with correct keys', () => {
      const links = getLinks(defaultLinkParams);
      const keys = links.map((l) => l.key);

      expect(keys).toEqual(['issues', 'pulls']);
    });

    it('constructs correct hrefs from html_url', () => {
      const links = getLinks(defaultLinkParams);

      expect(links[0].href).toBe('https://github.com/owner/repo/issues');
      expect(links[1].href).toBe('https://github.com/owner/repo/pulls');
    });

    it('formats open issues count in label', () => {
      const links = getLinks(defaultLinkParams);

      expect(links[0].label).toBe('42 open issues');
    });

    it('formats large open issues count compactly', () => {
      const links = getLinks({ ...defaultLinkParams, issueCount: 1500 });

      expect(links[0].label).toBe('1.5k open issues');
    });

    it('omits issues link when issueCount is null', () => {
      const links = getLinks({ ...defaultLinkParams, issueCount: null });

      expect(links).toHaveLength(1);
      expect(links[0].key).toBe('pulls');
    });
  });
});
