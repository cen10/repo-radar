import { supabase } from './supabase';
import type { RepoCache, RepoCacheInsert } from '../types/database';
import { logger } from '../utils/logger';

// Cache configuration
export const CACHE_CONFIG = {
  DEFAULT_TTL_HOURS: 24,
  // Expired entries kept as fallback for rate-limited scenarios
  CLEANUP_AFTER_DAYS: 7,
} as const;

// =====================================================
// CACHE READ OPERATIONS
// =====================================================

/**
 * Fetches cached repository data if it exists and is not expired
 * Returns null if no cache exists or if cache is expired
 */
export async function getRepoCache(githubRepoId: number): Promise<RepoCache | null> {
  const { data, error } = await supabase
    .from('repo_cache')
    .select('*')
    .eq('github_repo_id', githubRepoId)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned (no cache or expired)
      return null;
    }
    logger.error('Failed to fetch repo cache', error);
    throw new Error('Failed to fetch repo cache');
  }

  return data;
}

/**
 * Gets the ETag for a cached repository, regardless of expiration
 * Used for conditional requests even when cache is stale
 */
export async function getCacheETag(githubRepoId: number): Promise<string | null> {
  const { data, error } = await supabase
    .from('repo_cache')
    .select('etag')
    .eq('github_repo_id', githubRepoId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    logger.error('Failed to fetch cache ETag', error);
    throw new Error('Failed to fetch cache ETag');
  }

  return data?.etag ?? null;
}

/**
 * Checks if a valid (non-expired) cache entry exists for a repository
 */
export async function isCacheValid(githubRepoId: number): Promise<boolean> {
  const { count, error } = await supabase
    .from('repo_cache')
    .select('*', { count: 'exact', head: true })
    .eq('github_repo_id', githubRepoId)
    .gt('expires_at', new Date().toISOString());

  if (error) {
    logger.error('Failed to check cache validity', error);
    throw new Error('Failed to check cache validity');
  }

  return count !== null && count > 0;
}

// =====================================================
// CACHE WRITE OPERATIONS
// =====================================================

/**
 * Stores or updates cached repository data
 * Uses upsert to handle both new entries and updates
 */
export async function setRepoCache(
  githubRepoId: number,
  cachedData: unknown,
  etag?: string | null
): Promise<RepoCache> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CACHE_CONFIG.DEFAULT_TTL_HOURS * 60 * 60 * 1000);

  const cacheEntry: RepoCacheInsert = {
    github_repo_id: githubRepoId,
    cached_data: cachedData,
    etag: etag ?? null,
    fetched_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  };

  const { data, error } = await supabase
    .from('repo_cache')
    .upsert(cacheEntry, { onConflict: 'github_repo_id' })
    .select()
    .single();

  if (error) {
    logger.error('Failed to set repo cache', error);
    throw new Error('Failed to set repo cache');
  }

  return data;
}

/**
 * Updates the fetched_at timestamp and extends expiration without changing data
 * Used when a 304 Not Modified response confirms cached data is still valid
 */
export async function refreshCacheTimestamp(githubRepoId: number): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CACHE_CONFIG.DEFAULT_TTL_HOURS * 60 * 60 * 1000);

  const { error } = await supabase
    .from('repo_cache')
    .update({
      fetched_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .eq('github_repo_id', githubRepoId);

  if (error) {
    logger.error('Failed to refresh cache timestamp', error);
    throw new Error('Failed to refresh cache timestamp');
  }
}

// =====================================================
// CACHE MAINTENANCE
// =====================================================

/**
 * Removes cache entries that have been expired for longer than CLEANUP_AFTER_DAYS
 * Returns the number of entries deleted
 */
export async function cleanupExpiredCache(): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CACHE_CONFIG.CLEANUP_AFTER_DAYS);

  const { data, error } = await supabase
    .from('repo_cache')
    .delete()
    .lt('expires_at', cutoffDate.toISOString())
    .select('github_repo_id');

  if (error) {
    logger.error('Failed to cleanup expired cache', error);
    throw new Error('Failed to cleanup expired cache');
  }

  return data?.length ?? 0;
}
