/**
 * Tests for demo mode MSW handlers.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers, resetDemoState } from '../../../src/demo/handlers';
import { DEMO_RADAR_REPOS, DEMO_STARRED_REPOS } from '../../../src/demo/demo-data';

// Set up MSW server with demo handlers
const server = setupServer(...handlers);

// Use a test Supabase URL that matches what handlers.ts will use
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://test.supabase.co';

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
    it('returns only radar_repos matching the given repo ID', async () => {
      // React (id: 10270250) is in Frontend Tools radar
      const reactId = 10270250;
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/radar_repos?github_repo_id=eq.${reactId}`
      );
      const data = await response.json();

      // Should return exactly the radar_repos entries for React
      const expectedEntries = DEMO_RADAR_REPOS.filter((rr) => rr.github_repo_id === reactId);
      expect(data).toHaveLength(expectedEntries.length);
      expect(data.every((rr: { github_repo_id: number }) => rr.github_repo_id === reactId)).toBe(
        true
      );
    });

    it('returns empty array for repo not on any radar', async () => {
      // Find a starred repo that is NOT in any radar
      const radarRepoIds = new Set(DEMO_RADAR_REPOS.map((rr) => rr.github_repo_id));
      const repoNotOnRadar = DEMO_STARRED_REPOS.find((r) => !radarRepoIds.has(r.id));

      if (!repoNotOnRadar) {
        throw new Error('Test setup error: all starred repos are on radars');
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

      expect(data).toHaveLength(DEMO_RADAR_REPOS.length);
    });
  });

  describe('GET /rest/v1/radar_repos with radar_id', () => {
    it('returns only radar_repos for the given radar', async () => {
      const radarId = 'demo-radar-frontend';
      const response = await fetch(`${SUPABASE_URL}/rest/v1/radar_repos?radar_id=eq.${radarId}`);
      const data = await response.json();

      const expectedEntries = DEMO_RADAR_REPOS.filter((rr) => rr.radar_id === radarId);
      expect(data).toHaveLength(expectedEntries.length);
      expect(data.every((rr: { radar_id: string }) => rr.radar_id === radarId)).toBe(true);
    });
  });
});
