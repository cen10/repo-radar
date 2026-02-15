/**
 * Consistency tests for demo mode data.
 *
 * Ensures starred repos are valid and tour data is consistent.
 */
import { describe, it, expect } from 'vitest';
import { DEMO_STARRED_REPOS } from '../../../src/demo/demo-data';
import { getTourRadar, getTourRepos, TOUR_RADAR_ID } from '../../../src/demo/tour-data';

describe('Demo Data Consistency', () => {
  describe('DEMO_STARRED_REPOS', () => {
    it('has unique repo IDs', () => {
      const ids = DEMO_STARRED_REPOS.map((r) => r.id);
      const uniqueIds = new Set(ids);

      expect(ids.length).toBe(uniqueIds.size);
    });

    it('has expected count for scrolling', () => {
      // Plan specifies ~45 repos for 3-4 pages of scrolling
      expect(DEMO_STARRED_REPOS.length).toBeGreaterThanOrEqual(40);
      expect(DEMO_STARRED_REPOS.length).toBeLessThanOrEqual(50);
    });
  });

  describe('Tour Data', () => {
    it('getTourRadar returns radar with correct ID and name', () => {
      const radar = getTourRadar();

      expect(radar.id).toBe(TOUR_RADAR_ID);
      expect(radar.name).toBe('React Ecosystem');
      expect(radar.repo_count).toBe(4);
    });

    it('getTourRepos returns 4 React ecosystem repos', () => {
      const repos = getTourRepos();

      expect(repos).toHaveLength(4);
      expect(repos.map((r) => r.full_name)).toEqual([
        'facebook/react',
        'vercel/next.js',
        'remix-run/react-router',
        'pmndrs/zustand',
      ]);
    });

    it('tour radar and repos are consistent', () => {
      const radar = getTourRadar();
      const repos = getTourRepos();

      // The tour radar repo_count should match the number of tour repos
      expect(radar.repo_count).toBe(repos.length);
      // All repos should be valid GitHub repos
      for (const repo of repos) {
        expect(repo.id).toBeGreaterThan(0);
        expect(repo.full_name).toMatch(/^[^/]+\/[^/]+$/);
      }
    });
  });
});
