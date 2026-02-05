import { vi } from 'vitest';
import type { RadarWithCount, Radar, RadarRepo } from '../../src/types/database';
import type { Repository, Release } from '../../src/types';

function mockWithError<T extends Record<string, unknown>>(
  mock: T,
  method: keyof T,
  error: Error
): T {
  const fn = mock[method];
  if (typeof fn === 'function' && 'mockRejectedValue' in fn) {
    (fn as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(error);
  }
  return mock;
}

function resetMock<T extends Record<string, unknown>>(mock: T): T {
  Object.values(mock).forEach((value) => {
    if (typeof value === 'function' && 'mockReset' in value) {
      (value as ReturnType<typeof vi.fn>).mockReset();
    }
  });
  return mock;
}

type RadarServiceMethods =
  | 'getRadars'
  | 'getRadar'
  | 'createRadar'
  | 'updateRadar'
  | 'deleteRadar'
  | 'getRadarRepos'
  | 'getAllRadarRepoIds'
  | 'addRepoToRadar'
  | 'removeRepoFromRadar'
  | 'getRadarsContainingRepo';

/**
 * Creates a mock radar service with all functions as vi.fn() mocks.
 *
 * Use the fluent builder methods to configure responses:
 * @example
 * ```tsx
 * const radarService = createRadarServiceMock()
 *   .withRadars([mockRadar])
 *   .withError('createRadar', new Error('Failed'));
 *
 * vi.mock('../../src/services/radar', () => radarService);
 * ```
 */
export function createRadarServiceMock() {
  const mock = {
    // Radar CRUD
    getRadars: vi.fn<() => Promise<RadarWithCount[]>>().mockResolvedValue([]),
    getRadar: vi.fn<(id: string) => Promise<Radar | null>>().mockResolvedValue(null),
    createRadar: vi.fn<(name: string) => Promise<Radar>>(),
    updateRadar: vi.fn<(id: string, name: string) => Promise<Radar>>(),
    deleteRadar: vi.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined),

    // Radar repos
    getRadarRepos: vi.fn<(id: string) => Promise<RadarRepo[]>>().mockResolvedValue([]),
    getAllRadarRepoIds: vi.fn<() => Promise<Set<number>>>().mockResolvedValue(new Set()),
    addRepoToRadar: vi.fn<(radarId: string, githubRepoId: number) => Promise<RadarRepo>>(),
    removeRepoFromRadar: vi
      .fn<(radarId: string, githubRepoId: number) => Promise<void>>()
      .mockResolvedValue(undefined),
    getRadarsContainingRepo: vi
      .fn<(githubRepoId: number) => Promise<string[]>>()
      .mockResolvedValue([]),

    // Constants
    RADAR_LIMITS: {
      MAX_RADARS_PER_USER: 5,
      MAX_REPOS_PER_RADAR: 25,
      MAX_TOTAL_REPOS: 50,
    },

    // Fluent builders
    withRadars(radars: RadarWithCount[]) {
      this.getRadars.mockResolvedValue(radars);
      return this;
    },

    withRadar(radar: Radar | null) {
      this.getRadar.mockResolvedValue(radar);
      return this;
    },

    withRadarRepos(repos: RadarRepo[]) {
      this.getRadarRepos.mockResolvedValue(repos);
      return this;
    },

    withRadarRepoIds(ids: number[]) {
      this.getAllRadarRepoIds.mockResolvedValue(new Set(ids));
      return this;
    },

    withRadarsContainingRepo(radarIds: string[]) {
      this.getRadarsContainingRepo.mockResolvedValue(radarIds);
      return this;
    },

    withCreateRadarResult(radar: Radar) {
      this.createRadar.mockResolvedValue(radar);
      return this;
    },

    withError(method: RadarServiceMethods, error: Error) {
      return mockWithError(this, method, error);
    },

    reset() {
      return resetMock(this);
    },
  };

  return mock;
}

export type RadarServiceMock = ReturnType<typeof createRadarServiceMock>;

interface SearchResult {
  repositories: Repository[];
  totalCount: number;
  apiSearchResultTotal: number;
}

type GitHubServiceMethods =
  | 'fetchStarredRepoCount'
  | 'fetchAllStarredRepositories'
  | 'fetchStarredRepositories'
  | 'searchRepositories'
  | 'searchStarredRepositories'
  | 'isRepositoryStarred'
  | 'fetchRepositoryById'
  | 'fetchRepositoriesByIds'
  | 'fetchRepositoryReleases'
  | 'fetchRateLimit';

/**
 * Creates a mock GitHub service with all functions as vi.fn() mocks.
 *
 * @example
 * ```tsx
 * const githubService = createGitHubServiceMock()
 *   .withSearchResults([repo1, repo2], 100)
 *   .withStarredRepos([repo1]);
 *
 * vi.mock('../../src/services/github', () => githubService);
 * ```
 */
export function createGitHubServiceMock() {
  const mock = {
    // Constants
    MAX_STARRED_REPOS: 500,

    // Starred repos
    fetchStarredRepoCount: vi.fn<(token: string) => Promise<number>>().mockResolvedValue(0),
    fetchAllStarredRepositories: vi
      .fn<
        (token: string) => Promise<{
          repositories: Repository[];
          totalFetched: number;
          totalStarred: number;
        }>
      >()
      .mockResolvedValue({ repositories: [], totalFetched: 0, totalStarred: 0 }),
    fetchStarredRepositories: vi.fn().mockResolvedValue({
      repositories: [],
      totalCount: 0,
      hasNextPage: false,
    }),

    // Search
    searchRepositories: vi
      .fn<(token: string, query: string, sort?: string, page?: number) => Promise<SearchResult>>()
      .mockResolvedValue({
        repositories: [],
        totalCount: 0,
        apiSearchResultTotal: 0,
      }),
    searchStarredRepositories: vi.fn().mockResolvedValue([]),

    // Individual repos
    isRepositoryStarred: vi
      .fn<(token: string, owner: string, repo: string) => Promise<boolean>>()
      .mockResolvedValue(false),
    fetchRepositoryById: vi
      .fn<(token: string, id: number) => Promise<Repository | null>>()
      .mockResolvedValue(null),
    fetchRepositoriesByIds: vi
      .fn<(token: string, ids: number[]) => Promise<Repository[]>>()
      .mockResolvedValue([]),

    // Releases
    fetchRepositoryReleases: vi
      .fn<(token: string, owner: string, repo: string) => Promise<Release[]>>()
      .mockResolvedValue([]),

    // Rate limit
    fetchRateLimit: vi.fn().mockResolvedValue({
      limit: 5000,
      remaining: 5000,
      reset: Math.floor(Date.now() / 1000) + 3600,
    }),

    // Fluent builders
    withSearchResults(repositories: Repository[], totalCount: number) {
      this.searchRepositories.mockResolvedValue({
        repositories,
        totalCount,
        apiSearchResultTotal: Math.min(totalCount, 1000),
      });
      return this;
    },

    withStarredRepos(repositories: Repository[]) {
      this.fetchAllStarredRepositories.mockResolvedValue({
        repositories,
        totalFetched: repositories.length,
        totalStarred: repositories.length,
      });
      this.fetchStarredRepoCount.mockResolvedValue(repositories.length);
      return this;
    },

    withStarredReposPage(repositories: Repository[], totalCount: number, hasNextPage: boolean) {
      this.fetchStarredRepositories.mockResolvedValue({
        repositories,
        totalCount,
        hasNextPage,
      });
      return this;
    },

    withRepositoriesByIds(repositories: Repository[]) {
      this.fetchRepositoriesByIds.mockResolvedValue(repositories);
      return this;
    },

    withRepository(repository: Repository | null) {
      this.fetchRepositoryById.mockResolvedValue(repository);
      return this;
    },

    withReleases(releases: Release[]) {
      this.fetchRepositoryReleases.mockResolvedValue(releases);
      return this;
    },

    withError(method: GitHubServiceMethods, error: Error) {
      return mockWithError(this, method, error);
    },

    reset() {
      return resetMock(this);
    },
  };

  return mock;
}

export type GitHubServiceMock = ReturnType<typeof createGitHubServiceMock>;
