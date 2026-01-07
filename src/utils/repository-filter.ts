import type { Repository } from '../types';

interface PendingUnstar {
  id: number;
  timestamp: number;
}

const STORAGE_KEY = 'pendingUnstars';
const MAX_AGE_MS = 60000; // 1 minute

export function excludePendingUnstars(repos: Repository[]): Repository[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return repos;

  const pending: PendingUnstar[] = JSON.parse(stored);
  const now = Date.now();

  const validEntries = pending.filter((entry) => now - entry.timestamp < MAX_AGE_MS);

  if (validEntries.length !== pending.length) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validEntries));
  }

  const pendingIds = new Set(validEntries.map((entry) => entry.id));
  return repos.filter((repo) => !pendingIds.has(repo.id));
}

export function markPendingUnstar(repoId: number): void {
  const stored = localStorage.getItem(STORAGE_KEY) || '[]';
  const entries: PendingUnstar[] = JSON.parse(stored);

  const filtered = entries.filter((entry) => entry.id !== repoId);
  filtered.push({ id: repoId, timestamp: Date.now() });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function clearPendingUnstar(repoId: number): void {
  const stored = localStorage.getItem(STORAGE_KEY) || '[]';
  const entries: PendingUnstar[] = JSON.parse(stored);
  const filtered = entries.filter((entry) => entry.id !== repoId);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
