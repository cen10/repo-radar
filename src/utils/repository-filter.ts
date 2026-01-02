import type { Repository } from '../types';

interface LocallyUnstarredRepo {
  id: number;
  timestamp: number;
}

const MAX_AGE_MS = 60000; // 1 minute

export function filterOutLocallyUnstarred(repos: Repository[]): Repository[] {
  const stored = localStorage.getItem('locallyUnstarredRepos');
  if (!stored) return repos;

  const locallyUnstarred: LocallyUnstarredRepo[] = JSON.parse(stored);
  const now = Date.now();

  // Clean up expired entries
  const validEntries = locallyUnstarred.filter((entry) => now - entry.timestamp < MAX_AGE_MS);

  if (validEntries.length !== locallyUnstarred.length) {
    localStorage.setItem('locallyUnstarredRepos', JSON.stringify(validEntries));
  }

  const hiddenIds = new Set(validEntries.map((entry) => entry.id));
  return repos.filter((repo) => !hiddenIds.has(repo.id));
}

export function addToLocallyUnstarred(repoId: number): void {
  const stored = localStorage.getItem('locallyUnstarredRepos') || '[]';
  const entries: LocallyUnstarredRepo[] = JSON.parse(stored);

  // Remove existing entry for this repo and add new one
  const filtered = entries.filter((entry) => entry.id !== repoId);
  filtered.push({ id: repoId, timestamp: Date.now() });

  localStorage.setItem('locallyUnstarredRepos', JSON.stringify(filtered));
}

export function removeFromLocallyUnstarred(repoId: number): void {
  const stored = localStorage.getItem('locallyUnstarredRepos') || '[]';
  const entries: LocallyUnstarredRepo[] = JSON.parse(stored);
  const filtered = entries.filter((entry) => entry.id !== repoId);

  localStorage.setItem('locallyUnstarredRepos', JSON.stringify(filtered));
}
