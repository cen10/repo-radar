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
  repo_count: 4,
};

/**
 * Demo repos shown in the tour radar.
 * Hardcoded to avoid pulling in the full DEMO_STARRED_REPOS array.
 */
const TOUR_REPOS: Repository[] = [
  {
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
  },
  {
    id: 70107786,
    name: 'next.js',
    full_name: 'vercel/next.js',
    owner: {
      login: 'vercel',
      avatar_url: 'https://avatars.githubusercontent.com/u/14985020?v=4',
    },
    description: 'The React Framework',
    html_url: 'https://github.com/vercel/next.js',
    stargazers_count: 128000,
    forks_count: 27500,
    watchers_count: 1500,
    open_issues_count: 3200,
    language: 'JavaScript',
    license: {
      key: 'mit',
      name: 'MIT License',
      url: 'https://api.github.com/licenses/mit',
    },
    topics: ['nextjs', 'react', 'server-rendering', 'ssg', 'vercel'],
    updated_at: '2025-01-01T12:00:00Z',
    pushed_at: '2025-01-01T12:00:00Z',
    created_at: '2016-10-05T23:32:51Z',
    starred_at: '2024-06-15T10:00:00Z',
    is_starred: true,
  },
  {
    id: 29028775,
    name: 'react-router',
    full_name: 'remix-run/react-router',
    owner: {
      login: 'remix-run',
      avatar_url: 'https://avatars.githubusercontent.com/u/64235328?v=4',
    },
    description: 'Declarative routing for React',
    html_url: 'https://github.com/remix-run/react-router',
    stargazers_count: 53500,
    forks_count: 10400,
    watchers_count: 890,
    open_issues_count: 180,
    language: 'TypeScript',
    license: {
      key: 'mit',
      name: 'MIT License',
      url: 'https://api.github.com/licenses/mit',
    },
    topics: ['react', 'react-router', 'routing'],
    updated_at: '2025-01-15T10:00:00Z',
    pushed_at: '2025-01-14T10:00:00Z',
    created_at: '2014-05-16T22:22:51Z',
    starred_at: '2023-03-20T10:00:00Z',
    is_starred: true,
  },
  {
    id: 83827139,
    name: 'zustand',
    full_name: 'pmndrs/zustand',
    owner: {
      login: 'pmndrs',
      avatar_url: 'https://avatars.githubusercontent.com/u/45790596?v=4',
    },
    description: 'Bear necessities for state management in React',
    html_url: 'https://github.com/pmndrs/zustand',
    stargazers_count: 49000,
    forks_count: 1500,
    watchers_count: 210,
    open_issues_count: 12,
    language: 'TypeScript',
    license: {
      key: 'mit',
      name: 'MIT License',
      url: 'https://api.github.com/licenses/mit',
    },
    topics: ['flux', 'hooks', 'react', 'state', 'store', 'zustand'],
    updated_at: '2024-12-01T10:00:00Z',
    pushed_at: '2024-12-01T10:00:00Z',
    created_at: '2019-04-09T07:40:13Z',
    starred_at: '2024-01-10T10:00:00Z',
    is_starred: true,
  },
];

/**
 * Get the demo radar shown during onboarding tour.
 * Used in both production (auth users with no radars) and demo mode.
 * Returns a shallow copy to prevent callers from mutating the shared constant.
 */
export function getTourRadar(): RadarWithCount {
  return { ...TOUR_RADAR };
}

/**
 * Get the demo repos for the tour radar.
 * Returns shallow copies to prevent callers from mutating the shared array.
 */
export function getTourRepos(): Repository[] {
  return TOUR_REPOS.map((repo) => ({ ...repo }));
}
