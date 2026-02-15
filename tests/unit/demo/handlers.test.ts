/**
 * Tests for demo mode MSW handlers.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers, resetDemoState, getSupabaseUrl } from '../../../src/demo/handlers';
import { DEMO_STARRED_REPOS } from '../../../src/demo/demo-data';
import { getTourRepo, TOUR_RADAR_ID } from '../../../src/demo/tour-data';

// Set up MSW server with demo handlers
const server = setupServer(...handlers);

// Use the same URL that handlers are listening on
const SUPABASE_URL = getSupabaseUrl();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' });
});

afterEach(() => {
  resetDemoState();
});

afterAll(() => {
  server.close();
});

describe('Demo Handlers - radar_repos', () => {
  describe('GET /rest/v1/radar_repos with github_repo_id', () => {
    it('returns radar_repos for the React repo (tour radar repo)', async () => {
      const reactId = getTourRepo().id;
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/radar_repos?github_repo_id=eq.${reactId}`
      );
      const data = await response.json();

      // Should return exactly 1 entry for React in the tour radar
      expect(data).toHaveLength(1);
      expect(data[0].github_repo_id).toBe(reactId);
      expect(data[0].radar_id).toBe(TOUR_RADAR_ID);
    });

    it('returns empty array for repo not on any radar', async () => {
      // Find a starred repo that is NOT the React repo (tour radar repo)
      const tourRepoId = getTourRepo().id;
      const repoNotOnRadar = DEMO_STARRED_REPOS.find((r) => r.id !== tourRepoId);

      if (!repoNotOnRadar) {
        throw new Error('Test setup error: only React repo in starred repos');
      }

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/radar_repos?github_repo_id=eq.${repoNotOnRadar.id}`
      );
      const data = await response.json();

      expect(data).toHaveLength(0);
    });

    it('returns all radar_repos when no filter is provided', async () => {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/radar_repos`);
      const data = await response.json();

      // Demo mode starts with 1 radar_repo entry (React in tour radar)
      expect(data).toHaveLength(1);
    });
  });

  describe('GET /rest/v1/radar_repos with radar_id', () => {
    it('returns only radar_repos for the tour radar', async () => {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/radar_repos?radar_id=eq.${TOUR_RADAR_ID}`
      );
      const data = await response.json();

      expect(data).toHaveLength(1);
      expect(data[0].radar_id).toBe(TOUR_RADAR_ID);
    });
  });
});
