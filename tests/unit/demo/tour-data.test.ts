import { describe, it, expect } from 'vitest';
import { getTourRadar, getTourRepos } from '@/demo/tour-data';

describe('getTourRadar', () => {
  it('returns independent copies to prevent cross-caller mutation', () => {
    const radar1 = getTourRadar();
    const originalName = radar1.name;
    const originalRepoCount = radar1.repo_count;

    // Simulate what demo handlers do when renaming or updating repo count
    radar1.name = 'MUTATED_NAME';
    radar1.repo_count = 999;

    const radar2 = getTourRadar();

    // Should return fresh copy with original values, not the mutated ones
    expect(radar2.name).toBe(originalName);
    expect(radar2.repo_count).toBe(originalRepoCount);
  });

  it('returns a radar with expected structure', () => {
    const radar = getTourRadar();

    expect(radar.id).toBeDefined();
    expect(radar.name).toBeDefined();
    expect(typeof radar.repo_count).toBe('number');
  });
});

describe('getTourRepos', () => {
  it('returns independent copies to prevent cross-caller mutation', () => {
    const repos1 = getTourRepos();
    const originalFirstRepoName = repos1[0].full_name;

    // Simulate mutation
    repos1[0].full_name = 'MUTATED/REPO';

    const repos2 = getTourRepos();

    // Should return fresh copy with original values
    expect(repos2[0].full_name).toBe(originalFirstRepoName);
  });
});
