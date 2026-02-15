/**
 * Tour data - small file for onboarding tour.
 *
 * This is imported by production hooks (useRadars, useRadar, useRadarRepositories)
 * for the onboarding journey. Kept separate from demo-data.ts (1600+ lines) to
 * ensure only this tiny file is included in the main bundle.
 *
 * Demo mode imports from here to reuse the same radar definition.
 */

import type { Repository } from '../types';
import type { RadarWithCount } from '../types/database';

export const TOUR_RADAR_ID = 'tour-demo-radar';

const TOUR_RADAR: RadarWithCount = {
  id: TOUR_RADAR_ID,
  user_id: 'tour-user',
  name: 'React Ecosystem',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  repo_count: 1,
};

/**
 * The single demo repo shown in the tour radar.
 * Hardcoded to avoid pulling in the full DEMO_STARRED_REPOS array.
 */
const TOUR_REPO: Repository = {
  id: 10270250,
  name: 'react',
  full_name: 'facebook/react',
  owner: {
    login: 'facebook',
    avatar_url: 'https://avatars.githubusercontent.com/u/69631?v=4',
  },
  description: 'The library for web and native user interfaces.',
  html_url: 'https://github.com/facebook/react',
  stargazers_count: 232000,
  forks_count: 47400,
  watchers_count: 6700,
  open_issues_count: 950,
  language: 'JavaScript',
  license: {
    key: 'mit',
    name: 'MIT License',
    url: 'https://api.github.com/licenses/mit',
  },
  topics: ['declarative', 'frontend', 'javascript', 'library', 'react', 'ui'],
  updated_at: '2025-01-15T14:30:00Z',
  pushed_at: '2025-01-15T14:30:00Z',
  created_at: '2013-05-24T16:15:54Z',
  starred_at: '2025-01-15T10:00:00Z',
  is_starred: true,
  metrics: {
    is_trending: true,
    stars_growth_rate: 0.018,
    stars_gained: 4200,
    releases_count: 18,
    last_release_date: '2025-01-12T09:00:00Z',
  },
};

/**
 * Get the demo radar shown during onboarding tour.
 * Used in both production (auth users with no radars) and demo mode.
 */
export function getTourRadar(): RadarWithCount {
  return TOUR_RADAR;
}

/**
 * Get the demo repo for the tour radar.
 */
export function getTourRepo(): Repository {
  return TOUR_REPO;
}
