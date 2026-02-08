/**
 * Consistency tests for demo mode data.
 *
 * Ensures that radar repos reference valid starred repos and counts are accurate.
 */
import { describe, it, expect } from 'vitest';
import { DEMO_STARRED_REPOS, DEMO_RADARS, DEMO_RADAR_REPOS } from '../../../src/demo/demo-data';

describe('Demo Data Consistency', () => {
  describe('DEMO_RADAR_REPOS', () => {
    it('only references repo IDs that exist in DEMO_STARRED_REPOS', () => {
      const starredRepoIds = new Set(DEMO_STARRED_REPOS.map((r) => r.id));

      const orphanedRepoIds = DEMO_RADAR_REPOS.filter(
        (rr) => !starredRepoIds.has(rr.github_repo_id)
      ).map((rr) => rr.github_repo_id);

      expect(orphanedRepoIds).toEqual([]);
    });

    it('only references radar IDs that exist in DEMO_RADARS', () => {
      const radarIds = new Set(DEMO_RADARS.map((r) => r.id));

      const orphanedRadarIds = DEMO_RADAR_REPOS.filter((rr) => !radarIds.has(rr.radar_id)).map(
        (rr) => rr.radar_id
      );

      expect(orphanedRadarIds).toEqual([]);
    });

    it('has no duplicate radar-repo pairs', () => {
      const pairs = DEMO_RADAR_REPOS.map((rr) => `${rr.radar_id}:${rr.github_repo_id}`);
      const uniquePairs = new Set(pairs);

      expect(pairs.length).toBe(uniquePairs.size);
    });
  });

  describe('DEMO_RADARS repo_count', () => {
    it.each(DEMO_RADARS)('$name has correct repo_count', (radar) => {
      const actualCount = DEMO_RADAR_REPOS.filter((rr) => rr.radar_id === radar.id).length;

      expect(actualCount).toBe(radar.repo_count);
    });

    it('total repos on radars equals sum of individual counts', () => {
      const totalFromRadars = DEMO_RADARS.reduce((sum, r) => sum + r.repo_count, 0);
      const totalFromRadarRepos = DEMO_RADAR_REPOS.length;

      expect(totalFromRadarRepos).toBe(totalFromRadars);
    });
  });

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
});
