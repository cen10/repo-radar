-- Migration: 001_create_radars
-- Description: Creates radars and radar_repos tables for user repository collections
-- Date: 2026-01-15

-- =====================================================
-- RADARS TABLE
-- =====================================================
-- A user-created collection for organizing repositories to actively monitor

CREATE TABLE IF NOT EXISTS radars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Validation: name must be 1-50 characters (enforced by VARCHAR(50))
    CONSTRAINT radars_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

-- Index for fetching user's radars
CREATE INDEX IF NOT EXISTS idx_radars_user_id ON radars(user_id);

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_radars_updated_at
    BEFORE UPDATE ON radars
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RADAR_REPOS TABLE
-- =====================================================
-- The association between a radar and a GitHub repository

CREATE TABLE IF NOT EXISTS radar_repos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    radar_id UUID NOT NULL REFERENCES radars(id) ON DELETE CASCADE,
    github_repo_id BIGINT NOT NULL,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint: a repo can only be in a radar once
    CONSTRAINT radar_repos_unique UNIQUE (radar_id, github_repo_id)
);

-- Index for looking up which radars contain a specific repo
CREATE INDEX IF NOT EXISTS idx_radar_repos_github_id ON radar_repos(github_repo_id);

-- Note: No separate index on radar_id needed - the unique constraint on
-- (radar_id, github_repo_id) already provides an index usable for radar_id queries

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on radars table
ALTER TABLE radars ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own radars
CREATE POLICY "Users can view own radars"
    ON radars FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own radars"
    ON radars FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own radars"
    ON radars FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own radars"
    ON radars FOR DELETE
    USING (auth.uid() = user_id);

-- Enable RLS on radar_repos table
ALTER TABLE radar_repos ENABLE ROW LEVEL SECURITY;

-- Users can only manage repos in their own radars
-- This uses a subquery to check radar ownership
CREATE POLICY "Users can view repos in own radars"
    ON radar_repos FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM radars
            WHERE radars.id = radar_repos.radar_id
            AND radars.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can add repos to own radars"
    ON radar_repos FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM radars
            WHERE radars.id = radar_repos.radar_id
            AND radars.user_id = auth.uid()
        )
    );

-- Note: No UPDATE policy - radar_repos are added/removed, not modified

CREATE POLICY "Users can remove repos from own radars"
    ON radar_repos FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM radars
            WHERE radars.id = radar_repos.radar_id
            AND radars.user_id = auth.uid()
        )
    );

-- =====================================================
-- COMMENTS
-- =====================================================
-- Limits are enforced at application level:
-- - Maximum 5 radars per user
-- - Maximum 25 repos per radar
-- - Maximum 50 total repos across all user's radars
--
-- Rollback: DROP TABLE radar_repos; DROP TABLE radars; DROP FUNCTION update_updated_at_column;
