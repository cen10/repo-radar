import type { Repository } from './index';

// GitHub API response types
export interface GitHubStarredResponse {
  repo: Repository;
}

// API error response
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

// Paginated response wrapper
export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  per_page: number;
  has_more: boolean;
}

// Our API endpoints response types
export interface StarredRepositoriesResponse {
  repositories: Repository[];
  total: number;
  page: number;
  per_page: number;
}

export interface UserPreferencesResponse {
  following_ids: number[];
  updated_at: string;
}

export interface MetricsResponse {
  repository_id: number;
  stars_history: Array<{ date: string; count: number }>;
  issues_history: Array<{ date: string; count: number }>;
  releases: Array<{ date: string; tag_name: string }>;
  calculated_metrics: {
    stars_growth_rate: number;
    issues_growth_rate: number;
    is_trending: boolean;
  };
}

export interface SyncStatusResponse {
  last_sync: string | null;
  is_syncing: boolean;
  next_sync: string;
  repositories_synced: number;
}
