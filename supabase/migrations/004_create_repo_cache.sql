-- Migration: 004_create_repo_cache
-- Description: Creates repo_cache table for shared GitHub repository data caching with ETags
-- Date: 2026-01-16

-- =====================================================
-- REPO_CACHE TABLE
-- =====================================================
-- Shared cache for GitHub repository data across all users
-- Uses ETags for conditional requests to minimize API rate limit usage

CREATE TABLE IF NOT EXISTS repo_cache (
    github_repo_id BIGINT PRIMARY KEY,
    cached_data JSONB NOT NULL,
    etag TEXT,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Index for cleanup queries (finding expired entries)
CREATE INDEX IF NOT EXISTS idx_repo_cache_expires ON repo_cache(expires_at);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on repo_cache table
ALTER TABLE repo_cache ENABLE ROW LEVEL SECURITY;

-- Shared cache: any authenticated user can read
CREATE POLICY "Authenticated users can read cache"
    ON repo_cache FOR SELECT
    TO authenticated
    USING (true);

-- Any authenticated user can insert new cache entries
CREATE POLICY "Authenticated users can insert cache"
    ON repo_cache FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Any authenticated user can update cache entries
CREATE POLICY "Authenticated users can update cache"
    ON repo_cache FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Any authenticated user can delete expired cache entries
CREATE POLICY "Authenticated users can delete cache"
    ON repo_cache FOR DELETE
    TO authenticated
    USING (true);

-- =====================================================
-- COMMENTS
-- =====================================================
-- Cache design notes:
-- - Shared across all users (not user-scoped)
-- - ETags enable conditional GitHub API requests (304 Not Modified)
-- - Default TTL: 24 hours for list data
-- - Expired entries kept 7 days as rate-limit fallback, then cleaned up
-- - Manual refresh bypasses cache (fetches fresh data)
--
-- Rollback: DROP TABLE repo_cache;
