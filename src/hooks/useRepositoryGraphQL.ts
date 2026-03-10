import { useEffect } from 'react';
import { useQuery as useApolloQuery } from '@apollo/client/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchRepositoryById } from '../services/github';
import { getValidGitHubToken, hasFallbackToken } from '../services/github-token';
import { useAuthErrorHandler } from './useAuthErrorHandler';
import { REPOSITORY_DETAIL_QUERY } from '../graphql/queries/repository-detail';
import {
  mapGraphQLRepositoryToRepository,
  mapGraphQLReleasesToReleases,
} from '../utils/graphql-mappers';
import type { Repository, Release, AllStarredData } from '../types';

interface UseRepositoryGraphQLOptions {
  repoId: string | undefined;
  token: string | null;
  enabled?: boolean;
}

interface UseRepositoryGraphQLReturn {
  repository: Repository | null;
  isLoading: boolean;
  error: Error | null;
  isNotFound: boolean;
  isInvalidId: boolean;
  refetch: () => Promise<void>;
  isRefetching: boolean;
  dataUpdatedAt: number | undefined;
  releases: Release[];
  releasesLoading: boolean;
  issueCount: number | null;
}

/**
 * Hook for fetching repository detail, releases, and issue count via GraphQL.
 *
 * Uses a two-phase approach:
 * 1. REST call to resolve numeric ID → owner/name (GraphQL has no repository-by-ID query)
 * 2. Single GraphQL query for all data (repo details, releases, starred status, issue count)
 *
 * This replaces three separate hooks: useRepository, useReleases, and useIssueCount.
 */
export function useRepositoryGraphQL({
  repoId,
  token,
  enabled = true,
}: UseRepositoryGraphQLOptions): UseRepositoryGraphQLReturn {
  const numericId = repoId ? Number(repoId) : NaN;
  const isValidId = Number.isInteger(numericId) && numericId > 0;

  const queryClient = useQueryClient();

  // Phase 1: Resolve numeric ID to owner/name via REST
  const {
    data: restRepo,
    isLoading: restLoading,
    error: restError,
  } = useQuery<Repository | null, Error>({
    queryKey: ['repository-identity', repoId],
    queryFn: () => {
      const validToken = getValidGitHubToken(token);
      return fetchRepositoryById(validToken, numericId);
    },
    enabled: enabled && (!!token || hasFallbackToken()) && isValidId,
  });

  // Phase 2: GraphQL query once we know owner/name
  const owner = restRepo?.owner.login ?? '';
  const name = restRepo?.name ?? '';

  const {
    data: gqlData,
    loading: gqlLoading,
    error: gqlError,
    refetch: gqlRefetch,
    networkStatus,
  } = useApolloQuery(REPOSITORY_DETAIL_QUERY, {
    variables: { owner, name },
    skip: !restRepo || !enabled,
    notifyOnNetworkStatusChange: true,
  });

  // Combine errors for auth error handler
  const combinedError = restError || (gqlError ? new Error(gqlError.message) : null);
  useAuthErrorHandler(combinedError, 'useRepositoryGraphQL');

  // Map GraphQL response to domain types
  const gqlRepo = gqlData?.repository;
  const repository = gqlRepo ? mapGraphQLRepositoryToRepository(gqlRepo) : null;
  const releases = gqlRepo ? mapGraphQLReleasesToReleases(gqlRepo.releases.nodes) : [];
  const issueCount = gqlRepo ? gqlRepo.issues.totalCount : null;

  // Cache enrichment: add to allStarredRepositories cache if discovered starred
  useEffect(() => {
    if (!repository || !repository.is_starred) return;

    const cacheKey = ['allStarredRepositories', token];
    const cachedData = queryClient.getQueryData<AllStarredData>(cacheKey);

    if (cachedData && !cachedData.repositories.some((r) => r.id === repository.id)) {
      queryClient.setQueryData<AllStarredData>(cacheKey, {
        ...cachedData,
        repositories: [...cachedData.repositories, repository],
        totalFetched: cachedData.totalFetched + 1,
      });
    }
  }, [repository, token, queryClient]);

  const isLoading = restLoading || (!!restRepo && gqlLoading && !gqlData);
  // networkStatus 4 = refetch
  const isRefetching = networkStatus === 4;

  return {
    repository,
    isLoading,
    error: combinedError,
    isNotFound: !isLoading && !combinedError && restRepo === null && isValidId,
    isInvalidId: !isValidId,
    refetch: async () => {
      await gqlRefetch();
    },
    isRefetching,
    dataUpdatedAt: gqlData ? Date.now() : undefined,
    releases,
    releasesLoading: !!restRepo && gqlLoading,
    issueCount,
  };
}
