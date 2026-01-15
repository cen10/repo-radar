import { supabase } from './supabase';
import type { Radar, RadarRepo, RadarWithCount, RadarInsert } from '../types/database';
import { logger } from '../utils/logger';

// Limit constants
export const RADAR_LIMITS = {
  MAX_RADARS_PER_USER: 5,
  MAX_REPOS_PER_RADAR: 25,
  MAX_TOTAL_REPOS: 50,
} as const;

// Error types for limit violations
export class RadarLimitError extends Error {
  constructor(
    message: string,
    public readonly limitType: 'radars' | 'repos_per_radar' | 'total_repos'
  ) {
    super(message);
    this.name = 'RadarLimitError';
  }
}

// =====================================================
// RADAR CRUD OPERATIONS
// =====================================================

/**
 * Fetches all radars for the authenticated user with repo counts
 */
export async function getRadars(): Promise<RadarWithCount[]> {
  const { data, error } = await supabase
    .from('radars')
    .select(
      `
      *,
      radar_repos(count)
    `
    )
    .order('created_at', { ascending: true });

  if (error) {
    logger.error('Failed to fetch radars', error);
    throw new Error('Failed to fetch radars');
  }

  // Transform the response to include repo_count
  return (data || []).map((radar) => ({
    ...radar,
    repo_count: (radar.radar_repos as unknown as { count: number }[])?.[0]?.count ?? 0,
  }));
}

/**
 * Fetches a single radar by ID
 */
export async function getRadar(radarId: string): Promise<Radar | null> {
  const { data, error } = await supabase.from('radars').select('*').eq('id', radarId).single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    logger.error('Failed to fetch radar', error);
    throw new Error('Failed to fetch radar');
  }

  return data;
}

/**
 * Creates a new radar for the authenticated user
 * Enforces the maximum radars per user limit
 */
export async function createRadar(name: string): Promise<Radar> {
  // Validate name
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('Radar name cannot be empty');
  }
  if (trimmedName.length > 50) {
    throw new Error('Radar name cannot exceed 50 characters');
  }

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Check radar count limit
  const { count, error: countError } = await supabase
    .from('radars')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (countError) {
    logger.error('Failed to check radar count', countError);
    throw new Error('Failed to create radar');
  }

  if (count !== null && count >= RADAR_LIMITS.MAX_RADARS_PER_USER) {
    throw new RadarLimitError(
      `You can only have ${RADAR_LIMITS.MAX_RADARS_PER_USER} radars. Delete an existing radar to create a new one.`,
      'radars'
    );
  }

  // Create the radar
  const radarInsert: RadarInsert = {
    user_id: user.id,
    name: trimmedName,
  };

  const { data, error } = await supabase.from('radars').insert(radarInsert).select().single();

  if (error) {
    logger.error('Failed to create radar', error);
    throw new Error('Failed to create radar');
  }

  return data;
}

/**
 * Updates a radar's name
 */
export async function updateRadar(radarId: string, name: string): Promise<Radar> {
  // Validate name
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('Radar name cannot be empty');
  }
  if (trimmedName.length > 50) {
    throw new Error('Radar name cannot exceed 50 characters');
  }

  const { data, error } = await supabase
    .from('radars')
    .update({ name: trimmedName })
    .eq('id', radarId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Radar not found');
    }
    logger.error('Failed to update radar', error);
    throw new Error('Failed to update radar');
  }

  return data;
}

/**
 * Deletes a radar and all its repo associations
 */
export async function deleteRadar(radarId: string): Promise<void> {
  const { error } = await supabase.from('radars').delete().eq('id', radarId);

  if (error) {
    logger.error('Failed to delete radar', error);
    throw new Error('Failed to delete radar');
  }
}

// =====================================================
// RADAR REPO OPERATIONS
// =====================================================

/**
 * Fetches all repos in a radar
 */
export async function getRadarRepos(radarId: string): Promise<RadarRepo[]> {
  const { data, error } = await supabase
    .from('radar_repos')
    .select('*')
    .eq('radar_id', radarId)
    .order('added_at', { ascending: false });

  if (error) {
    logger.error('Failed to fetch radar repos', error);
    throw new Error('Failed to fetch radar repos');
  }

  return data || [];
}

/**
 * Fetches all GitHub repo IDs across all of the user's radars
 * Useful for checking if a repo is already in any radar
 */
export async function getAllRadarRepoIds(): Promise<Set<number>> {
  const { data, error } = await supabase.from('radars').select(
    `
      radar_repos(github_repo_id)
    `
  );

  if (error) {
    logger.error('Failed to fetch radar repo IDs', error);
    throw new Error('Failed to fetch radar repo IDs');
  }

  const repoIds = new Set<number>();
  for (const radar of data || []) {
    for (const repo of radar.radar_repos as unknown as { github_repo_id: number }[]) {
      repoIds.add(repo.github_repo_id);
    }
  }

  return repoIds;
}

/**
 * Gets a map of radar IDs for each GitHub repo ID (for repos that are in radars)
 * Returns Map<github_repo_id, radar_id[]>
 */
export async function getRepoRadarMap(): Promise<Map<number, string[]>> {
  const { data, error } = await supabase.from('radars').select(
    `
      id,
      radar_repos(github_repo_id)
    `
  );

  if (error) {
    logger.error('Failed to fetch repo radar map', error);
    throw new Error('Failed to fetch repo radar map');
  }

  const repoRadarMap = new Map<number, string[]>();
  for (const radar of data || []) {
    for (const repo of radar.radar_repos as unknown as { github_repo_id: number }[]) {
      const existing = repoRadarMap.get(repo.github_repo_id) || [];
      existing.push(radar.id);
      repoRadarMap.set(repo.github_repo_id, existing);
    }
  }

  return repoRadarMap;
}

/**
 * Adds a repository to a radar
 * Enforces limits: max repos per radar and max total repos
 */
export async function addRepoToRadar(radarId: string, githubRepoId: number): Promise<RadarRepo> {
  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Check repos per radar limit
  const { count: radarRepoCount, error: radarCountError } = await supabase
    .from('radar_repos')
    .select('*', { count: 'exact', head: true })
    .eq('radar_id', radarId);

  if (radarCountError) {
    logger.error('Failed to check radar repo count', radarCountError);
    throw new Error('Failed to add repo to radar');
  }

  if (radarRepoCount !== null && radarRepoCount >= RADAR_LIMITS.MAX_REPOS_PER_RADAR) {
    throw new RadarLimitError(
      `This radar already has ${RADAR_LIMITS.MAX_REPOS_PER_RADAR} repositories. Remove some to add more.`,
      'repos_per_radar'
    );
  }

  // Check total repos limit
  const { data: allRadars, error: totalCountError } = await supabase.from('radars').select(
    `
      radar_repos(count)
    `
  );

  if (totalCountError) {
    logger.error('Failed to check total repo count', totalCountError);
    throw new Error('Failed to add repo to radar');
  }

  const totalRepos = (allRadars || []).reduce((sum, radar) => {
    const count = (radar.radar_repos as unknown as { count: number }[])?.[0]?.count ?? 0;
    return sum + count;
  }, 0);

  if (totalRepos >= RADAR_LIMITS.MAX_TOTAL_REPOS) {
    throw new RadarLimitError(
      `You've reached the limit of ${RADAR_LIMITS.MAX_TOTAL_REPOS} total repositories across all radars.`,
      'total_repos'
    );
  }

  // Add the repo
  const { data, error } = await supabase
    .from('radar_repos')
    .insert({
      radar_id: radarId,
      github_repo_id: githubRepoId,
    })
    .select()
    .single();

  if (error) {
    // Check for unique constraint violation
    if (error.code === '23505') {
      throw new Error('This repository is already in this radar');
    }
    logger.error('Failed to add repo to radar', error);
    throw new Error('Failed to add repo to radar');
  }

  return data;
}

/**
 * Removes a repository from a radar
 */
export async function removeRepoFromRadar(radarId: string, githubRepoId: number): Promise<void> {
  const { error } = await supabase
    .from('radar_repos')
    .delete()
    .eq('radar_id', radarId)
    .eq('github_repo_id', githubRepoId);

  if (error) {
    logger.error('Failed to remove repo from radar', error);
    throw new Error('Failed to remove repo from radar');
  }
}

/**
 * Checks if a repository is in any of the user's radars
 */
export async function isRepoInAnyRadar(githubRepoId: number): Promise<boolean> {
  const repoIds = await getAllRadarRepoIds();
  return repoIds.has(githubRepoId);
}

/**
 * Gets the radar IDs that contain a specific repository
 */
export async function getRadarsContainingRepo(githubRepoId: number): Promise<string[]> {
  const { data, error } = await supabase
    .from('radar_repos')
    .select('radar_id')
    .eq('github_repo_id', githubRepoId);

  if (error) {
    logger.error('Failed to check repo radar membership', error);
    throw new Error('Failed to check repo radar membership');
  }

  return (data || []).map((r) => r.radar_id);
}
