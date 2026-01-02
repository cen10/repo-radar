export interface User {
  id: string;
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
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
  open_issues_count: number;
  language: string | null;
  topics: string[];
  updated_at: string;
  pushed_at: string | null;
  created_at: string;
  starred_at?: string; // Actual timestamp from GitHub when available
  is_starred: boolean; // Simple boolean to indicate star status
  metrics?: RepositoryMetrics;
  is_following?: boolean; // Deprecated - to be removed
}

export interface RepositoryMetrics {
  stars_growth_rate?: number;
  issues_growth_rate?: number;
  releases_count?: number;
  last_release_date?: string | null;
  is_trending?: boolean;
}
