/**
 * Consistency tests for demo mode data.
 *
 * Ensures starred repos are valid and tour data is consistent.
 */
import { describe, it, expect } from 'vitest';
import { DEMO_STARRED_REPOS } from '../../../src/demo/demo-data';
import { getTourRadar, getTourRepo, TOUR_RADAR_ID } from '../../../src/demo/tour-data';

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
      expect(radar.repo_count).toBe(1);
    });

    it('getTourRepo returns the React repo', () => {
      const repo = getTourRepo();

      expect(repo.full_name).toBe('facebook/react');
      expect(repo.id).toBe(10270250);
    });

    it('tour radar and repo are consistent', () => {
      const radar = getTourRadar();
      const repo = getTourRepo();

      // The tour radar should have repo_count matching the number of tour repos (1)
      expect(radar.repo_count).toBe(1);
      // The repo should be a valid GitHub repo
      expect(repo.id).toBeGreaterThan(0);
      expect(repo.full_name).toMatch(/^[^/]+\/[^/]+$/);
    });
  });
});
