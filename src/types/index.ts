export interface User {
  id: string;
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
}

// License information from GitHub's license detection (e.g., MIT, Apache-2.0)
// See: https://docs.github.com/en/rest/licenses
export interface RepositoryLicense {
  key: string; // SPDX identifier (e.g., "mit", "apache-2.0")
  name: string; // Human-readable name (e.g., "MIT License")
  url: string | null; // Link to license details on GitHub
}

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  watchers_count?: number; // Only available from full repo fetch (GitHub's subscribers_count)
  open_issues_count: number;
  language: string | null;
  license: RepositoryLicense | null;
  topics: string[];
  updated_at: string;
  pushed_at: string | null;
  created_at: string;
  starred_at?: string; // When the user starred this repo (from GitHub star+json API)
  is_starred: boolean; // Simple boolean to indicate star status
  metrics?: RepositoryMetrics;
  isTourTarget?: boolean; // Set by RadarPage to mark the first repo as the onboarding tour target
}

export interface RepositoryMetrics {
  stars_growth_rate?: number; // Decimal format: 0.25 = 25%
  stars_gained?: number; // Absolute stars gained in period
  issues_growth_rate?: number;
  releases_count?: number;
  last_release_date?: string | null;
  is_trending?: boolean;
}

export interface Release {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  published_at: string | null;
  created_at: string;
  prerelease: boolean;
  draft: boolean;
  author: {
    login: string;
    avatar_url: string;
  } | null;
}

/**
 * Cache structure for all starred repositories.
 * Used by TanStack Query cache for the allStarredRepositories query.
 */
export interface AllStarredData {
  repositories: Repository[];
  totalFetched: number;
  totalStarred: number;
}
