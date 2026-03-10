import type { Repository, Release } from '../types';
import type { RepositoryDetailQuery } from '../gql/graphql';

// Extract the repository type from the generated query type
type GqlRepositoryDetail = NonNullable<RepositoryDetailQuery['repository']>;

// Extract the release node type from the generated query type
type GqlReleaseNode = NonNullable<NonNullable<GqlRepositoryDetail['releases']['nodes']>[number]>;

/**
 * Maps a GraphQL repository detail response to the domain Repository type.
 *
 * Note: metrics use the same placeholder calculations as the REST mapper
 * in services/github.ts. These will be replaced when historical data is available.
 */
export function mapGraphQLRepositoryToRepository(repo: GqlRepositoryDetail): Repository {
  return {
    id: repo.databaseId!,
    name: repo.name,
    full_name: repo.nameWithOwner,
    owner: {
      login: repo.owner.login,
      avatar_url: repo.owner.avatarUrl,
    },
    description: repo.description ?? null,
    html_url: repo.url,
    stargazers_count: repo.stargazerCount,
    forks_count: repo.forkCount,
    watchers_count: repo.watchers.totalCount,
    open_issues_count: repo.issues.totalCount,
    language: repo.primaryLanguage?.name ?? null,
    license: repo.licenseInfo
      ? {
          key: repo.licenseInfo.key,
          name: repo.licenseInfo.name,
          url: repo.licenseInfo.url ?? null,
        }
      : null,
    topics:
      repo.repositoryTopics.nodes
        ?.filter((n): n is NonNullable<typeof n> => n !== null)
        .map((n) => n.topic.name) ?? [],
    updated_at: repo.updatedAt,
    pushed_at: repo.pushedAt ?? null,
    created_at: repo.createdAt,
    is_starred: repo.viewerHasStarred,
    metrics: {
      stars_growth_rate: calculateGrowthRate(repo),
      stars_gained: calculateStarsGained(repo),
      issues_growth_rate: 0,
      is_trending: isTrending(repo),
    },
  };
}

/**
 * Maps GraphQL release nodes to domain Release[] type.
 * Filters out null nodes from the connection.
 */
export function mapGraphQLReleasesToReleases(
  nodes: GqlRepositoryDetail['releases']['nodes']
): Release[] {
  if (!nodes) return [];

  return nodes
    .filter((n): n is GqlReleaseNode => n !== null)
    .map((release) => ({
      id: release.databaseId!,
      tag_name: release.tagName,
      name: release.name ?? null,
      body: release.description ?? null,
      html_url: release.url,
      published_at: release.publishedAt ?? null,
      created_at: release.createdAt,
      prerelease: release.isPrerelease,
      draft: release.isDraft,
      author: release.author
        ? {
            login: release.author.login,
            avatar_url: release.author.avatarUrl,
          }
        : null,
    }));
}

// Placeholder metrics (same logic as REST mapper in services/github.ts)

interface MetricsInput {
  databaseId?: number | null;
  stargazerCount: number;
  pushedAt?: string | null;
  updatedAt: string;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

function calculateGrowthRate(repo: MetricsInput): number {
  const id = repo.databaseId ?? 0;
  const dateStr = repo.pushedAt || repo.updatedAt;
  if (!dateStr) return 0;
  const recentlyUpdated = new Date(dateStr) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (!recentlyUpdated) return 0;

  const isHotCandidate = repo.stargazerCount >= 100 && id % 3 === 0;
  if (isHotCandidate) {
    return parseFloat((0.25 + seededRandom(id) * 0.25).toFixed(3));
  }
  const baseRatePercent = Math.max(1, 20 - Math.log10(repo.stargazerCount + 1) * 3);
  const ratePercent = baseRatePercent * (0.5 + seededRandom(id));
  return parseFloat((ratePercent / 100).toFixed(3));
}

function calculateStarsGained(repo: MetricsInput): number {
  const id = repo.databaseId ?? 0;
  const dateStr = repo.pushedAt || repo.updatedAt;
  if (!dateStr) return 0;
  const recentlyUpdated = new Date(dateStr) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (!recentlyUpdated) return 0;

  const isHotCandidate = repo.stargazerCount >= 100 && id % 3 === 0;
  if (isHotCandidate) {
    return 50 + Math.floor(seededRandom(id + 1) * 100);
  }
  const baseGain = Math.floor(repo.stargazerCount * 0.005 * seededRandom(id + 2));
  return Math.max(0, baseGain + Math.floor(seededRandom(id + 3) * 20));
}

function isTrending(repo: MetricsInput): boolean {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const lastActivity = repo.pushedAt || repo.updatedAt;
  if (!lastActivity) return false;
  return new Date(lastActivity) > oneWeekAgo && repo.stargazerCount > 1000;
}
