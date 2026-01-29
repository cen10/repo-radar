import { vi } from 'vitest';
import type { Repository, Release, User } from '../../types';
import type { RadarWithCount } from '../../types/database';
import type { AuthContextType } from '../../contexts/auth-context';

/**
 * Creates a mock Repository object with sensible defaults.
 * Use overrides to customize specific fields.
 */
export const createMockRepository = (overrides?: Partial<Repository>): Repository => ({
  id: 1,
  name: 'test-repo',
  full_name: 'user/test-repo',
  owner: {
    login: 'user',
    avatar_url: 'https://example.com/avatar.jpg',
  },
  description: 'Test repository description',
  html_url: 'https://github.com/user/test-repo',
  stargazers_count: 100,
  forks_count: 25,
  watchers_count: 10,
  open_issues_count: 5,
  language: 'TypeScript',
  license: { key: 'mit', name: 'MIT License', url: 'https://api.github.com/licenses/mit' },
  topics: ['react', 'typescript'],
  updated_at: '2024-01-15T10:00:00Z',
  pushed_at: '2024-01-15T10:00:00Z',
  created_at: '2023-01-01T00:00:00Z',
  is_starred: false,
  ...overrides,
});

/**
 * Creates a mock Radar object with sensible defaults.
 * Returns RadarWithCount for convenience. When mocking services that return
 * Radar (e.g., createRadar), the extra repo_count is safely ignored due to
 * TypeScript's structural typing.
 */
export const createMockRadar = (overrides?: Partial<RadarWithCount>): RadarWithCount => ({
  id: 'radar-1',
  user_id: 'user-1',
  name: 'Test Radar',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  repo_count: 5,
  ...overrides,
});

/**
 * Creates a mock Release object with sensible defaults.
 */
export const createMockRelease = (overrides?: Partial<Release>): Release => ({
  id: 1,
  tag_name: 'v1.0.0',
  name: 'Version 1.0.0',
  body: 'Release notes for v1.0.0',
  html_url: 'https://github.com/owner/repo/releases/tag/v1.0.0',
  published_at: '2024-01-15T10:00:00Z',
  created_at: '2024-01-15T09:00:00Z',
  prerelease: false,
  draft: false,
  author: {
    login: 'releaser',
    avatar_url: 'https://example.com/avatar.jpg',
  },
  ...overrides,
});

/**
 * Creates a mock User object with sensible defaults.
 */
export const createMockUser = (overrides?: Partial<User>): User => ({
  id: 'user-123',
  login: 'testuser',
  name: 'Test User',
  avatar_url: 'https://example.com/avatar.jpg',
  email: 'test@example.com',
  ...overrides,
});

/**
 * Creates a mock AuthContextType object for testing components that use useAuth.
 * All callback functions are vi.fn() mocks by default.
 */
export const createMockAuthContext = (overrides?: Partial<AuthContextType>): AuthContextType => ({
  user: createMockUser(),
  providerToken: 'test-github-token',
  authLoading: false,
  connectionError: null,
  signInWithGitHub: vi.fn(),
  signOut: vi.fn(),
  retryAuth: vi.fn(),
  ...overrides,
});
