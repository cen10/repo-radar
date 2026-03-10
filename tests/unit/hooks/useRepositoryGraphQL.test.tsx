import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useRepositoryGraphQL } from '@/hooks/useRepositoryGraphQL';
import * as github from '@/services/github';
import { createTestQueryClient } from '../../helpers/query-client';
import { createMockRepository } from '../../mocks/factories';
import { REPOSITORY_DETAIL_QUERY } from '@/graphql/queries/repository-detail';
import type { RepositoryDetailQuery } from '@/gql/graphql';

vi.mock('@/services/github', () => ({
  fetchRepositoryById: vi.fn(),
}));

vi.mock('@/hooks/useAuthErrorHandler', () => ({
  useAuthErrorHandler: vi.fn(),
}));

vi.mock('@/services/github-token', () => ({
  getValidGitHubToken: (token: string | null) => {
    if (!token) throw new Error('Test setup error: no token provided to mock');
    return token;
  },
  hasFallbackToken: () => false,
}));

const TEST_TOKEN = 'test-token';

function createGraphQLRepoResponse(
  overrides: Partial<NonNullable<RepositoryDetailQuery['repository']>> = {}
): RepositoryDetailQuery {
  return {
    repository: {
      __typename: 'Repository',
      id: 'R_test123',
      databaseId: 12345,
      name: 'react',
      nameWithOwner: 'facebook/react',
      owner: {
        __typename: 'Organization',
        login: 'facebook',
        avatarUrl: 'https://example.com/fb.png',
      },
      description: 'A JavaScript library for building user interfaces',
      url: 'https://github.com/facebook/react',
      stargazerCount: 200000,
      forkCount: 40000,
      watchers: { __typename: 'UserConnection', totalCount: 6500 },
      primaryLanguage: { __typename: 'Language', name: 'JavaScript' },
      licenseInfo: {
        __typename: 'License',
        key: 'mit',
        name: 'MIT License',
        url: 'https://api.github.com/licenses/mit',
      },
      repositoryTopics: {
        __typename: 'RepositoryTopicConnection',
        nodes: [
          { __typename: 'RepositoryTopic', topic: { __typename: 'Topic', name: 'react' } },
          { __typename: 'RepositoryTopic', topic: { __typename: 'Topic', name: 'javascript' } },
        ],
      },
      pushedAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
      createdAt: '2013-05-24T16:15:54Z',
      viewerHasStarred: true,
      issues: { __typename: 'IssueConnection', totalCount: 800 },
      releases: {
        __typename: 'ReleaseConnection',
        nodes: [
          {
            __typename: 'Release',
            databaseId: 1001,
            tagName: 'v18.2.0',
            name: 'React 18.2.0',
            description: 'Bug fixes and improvements',
            url: 'https://github.com/facebook/react/releases/tag/v18.2.0',
            publishedAt: '2024-01-10T12:00:00Z',
            createdAt: '2024-01-10T11:00:00Z',
            isPrerelease: false,
            isDraft: false,
            author: {
              __typename: 'User',
              login: 'gaearon',
              avatarUrl: 'https://example.com/dan.png',
            },
          },
        ],
      },
      ...overrides,
    },
  };
}

function createMock(
  variables: { owner: string; name: string },
  result: RepositoryDetailQuery
): MockedResponse {
  return {
    request: { query: REPOSITORY_DETAIL_QUERY, variables },
    result: { data: result },
  };
}

function createWrapper(mocks: MockedResponse[]) {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MockedProvider mocks={mocks} addTypename={false}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MockedProvider>
  );
  return { wrapper, queryClient };
}

describe('useRepositoryGraphQL', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches repository with releases via GraphQL', async () => {
    const restRepo = createMockRepository({
      id: 12345,
      name: 'react',
      owner: { login: 'facebook', avatar_url: 'https://example.com/fb.png' },
    });
    vi.mocked(github.fetchRepositoryById).mockResolvedValue(restRepo);

    const gqlResponse = createGraphQLRepoResponse();
    const mock = createMock({ owner: 'facebook', name: 'react' }, gqlResponse);
    const { wrapper } = createWrapper([mock]);

    const { result } = renderHook(
      () => useRepositoryGraphQL({ repoId: '12345', token: TEST_TOKEN }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.repository).not.toBeNull();
    expect(result.current.repository?.name).toBe('react');
    expect(result.current.repository?.full_name).toBe('facebook/react');
    expect(result.current.repository?.is_starred).toBe(true);
    expect(result.current.repository?.watchers_count).toBe(6500);
    expect(result.current.repository?.open_issues_count).toBe(800);
    expect(result.current.error).toBeNull();
    expect(result.current.isNotFound).toBe(false);
  });

  it('returns releases from GraphQL response', async () => {
    const restRepo = createMockRepository({
      id: 12345,
      name: 'react',
      owner: { login: 'facebook', avatar_url: 'https://example.com/fb.png' },
    });
    vi.mocked(github.fetchRepositoryById).mockResolvedValue(restRepo);

    const gqlResponse = createGraphQLRepoResponse();
    const mock = createMock({ owner: 'facebook', name: 'react' }, gqlResponse);
    const { wrapper } = createWrapper([mock]);

    const { result } = renderHook(
      () => useRepositoryGraphQL({ repoId: '12345', token: TEST_TOKEN }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.releases).toHaveLength(1);
    });

    expect(result.current.releases[0].tag_name).toBe('v18.2.0');
    expect(result.current.releases[0].name).toBe('React 18.2.0');
    expect(result.current.releases[0].body).toBe('Bug fixes and improvements');
    expect(result.current.releases[0].prerelease).toBe(false);
    expect(result.current.releases[0].author?.login).toBe('gaearon');
  });

  it('returns issue count from GraphQL response', async () => {
    const restRepo = createMockRepository({
      id: 12345,
      name: 'react',
      owner: { login: 'facebook', avatar_url: 'https://example.com/fb.png' },
    });
    vi.mocked(github.fetchRepositoryById).mockResolvedValue(restRepo);

    const gqlResponse = createGraphQLRepoResponse();
    const mock = createMock({ owner: 'facebook', name: 'react' }, gqlResponse);
    const { wrapper } = createWrapper([mock]);

    const { result } = renderHook(
      () => useRepositoryGraphQL({ repoId: '12345', token: TEST_TOKEN }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.issueCount).toBe(800);
    });
  });

  it('returns isNotFound when REST resolution returns null', async () => {
    vi.mocked(github.fetchRepositoryById).mockResolvedValue(null);

    const { wrapper } = createWrapper([]);

    const { result } = renderHook(
      () => useRepositoryGraphQL({ repoId: '99999', token: TEST_TOKEN }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.repository).toBeNull();
    expect(result.current.isNotFound).toBe(true);
    expect(result.current.releases).toEqual([]);
    expect(result.current.issueCount).toBeNull();
  });

  it('returns isInvalidId for non-numeric ID', () => {
    const { wrapper } = createWrapper([]);

    const { result } = renderHook(
      () => useRepositoryGraphQL({ repoId: 'invalid', token: TEST_TOKEN }),
      { wrapper }
    );

    expect(result.current.isInvalidId).toBe(true);
    expect(result.current.isNotFound).toBe(false);
    expect(github.fetchRepositoryById).not.toHaveBeenCalled();
  });

  it.each(['0', '-1', '1.5', 'Infinity'])(
    'treats %s as invalid (not a positive integer)',
    (repoId) => {
      const { wrapper } = createWrapper([]);

      const { result } = renderHook(() => useRepositoryGraphQL({ repoId, token: TEST_TOKEN }), {
        wrapper,
      });

      expect(result.current.isInvalidId).toBe(true);
      expect(github.fetchRepositoryById).not.toHaveBeenCalled();
    }
  );

  it('does not fetch when token is null', () => {
    const { wrapper } = createWrapper([]);

    renderHook(() => useRepositoryGraphQL({ repoId: '12345', token: null }), { wrapper });

    expect(github.fetchRepositoryById).not.toHaveBeenCalled();
  });

  it('does not fetch when enabled is false', () => {
    const { wrapper } = createWrapper([]);

    renderHook(() => useRepositoryGraphQL({ repoId: '12345', token: TEST_TOKEN, enabled: false }), {
      wrapper,
    });

    expect(github.fetchRepositoryById).not.toHaveBeenCalled();
  });

  it('handles REST fetch error', async () => {
    const error = new Error('GitHub API error');
    vi.mocked(github.fetchRepositoryById).mockRejectedValue(error);

    const { wrapper } = createWrapper([]);

    const { result } = renderHook(
      () => useRepositoryGraphQL({ repoId: '12345', token: TEST_TOKEN }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(error);
    expect(result.current.repository).toBeNull();
  });

  it('maps viewerHasStarred=false correctly', async () => {
    const restRepo = createMockRepository({
      id: 12345,
      name: 'react',
      owner: { login: 'facebook', avatar_url: 'https://example.com/fb.png' },
    });
    vi.mocked(github.fetchRepositoryById).mockResolvedValue(restRepo);

    const gqlResponse = createGraphQLRepoResponse({ viewerHasStarred: false });
    const mock = createMock({ owner: 'facebook', name: 'react' }, gqlResponse);
    const { wrapper } = createWrapper([mock]);

    const { result } = renderHook(
      () => useRepositoryGraphQL({ repoId: '12345', token: TEST_TOKEN }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.repository?.is_starred).toBe(false);
    });
  });

  it('handles repository with no releases', async () => {
    const restRepo = createMockRepository({
      id: 12345,
      name: 'react',
      owner: { login: 'facebook', avatar_url: 'https://example.com/fb.png' },
    });
    vi.mocked(github.fetchRepositoryById).mockResolvedValue(restRepo);

    const gqlResponse = createGraphQLRepoResponse({
      releases: { __typename: 'ReleaseConnection', nodes: [] },
    });
    const mock = createMock({ owner: 'facebook', name: 'react' }, gqlResponse);
    const { wrapper } = createWrapper([mock]);

    const { result } = renderHook(
      () => useRepositoryGraphQL({ repoId: '12345', token: TEST_TOKEN }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.releases).toEqual([]);
  });

  it('handles repository with no license', async () => {
    const restRepo = createMockRepository({
      id: 12345,
      name: 'react',
      owner: { login: 'facebook', avatar_url: 'https://example.com/fb.png' },
    });
    vi.mocked(github.fetchRepositoryById).mockResolvedValue(restRepo);

    const gqlResponse = createGraphQLRepoResponse({ licenseInfo: null });
    const mock = createMock({ owner: 'facebook', name: 'react' }, gqlResponse);
    const { wrapper } = createWrapper([mock]);

    const { result } = renderHook(
      () => useRepositoryGraphQL({ repoId: '12345', token: TEST_TOKEN }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.repository?.license).toBeNull();
    });
  });

  it('handles repository with no primary language', async () => {
    const restRepo = createMockRepository({
      id: 12345,
      name: 'react',
      owner: { login: 'facebook', avatar_url: 'https://example.com/fb.png' },
    });
    vi.mocked(github.fetchRepositoryById).mockResolvedValue(restRepo);

    const gqlResponse = createGraphQLRepoResponse({ primaryLanguage: null });
    const mock = createMock({ owner: 'facebook', name: 'react' }, gqlResponse);
    const { wrapper } = createWrapper([mock]);

    const { result } = renderHook(
      () => useRepositoryGraphQL({ repoId: '12345', token: TEST_TOKEN }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.repository?.language).toBeNull();
    });
  });
});
