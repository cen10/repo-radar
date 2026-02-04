/**
 * GitHub API mock data factories for E2E tests.
 * Types are derived from the OpenAPI schema to ensure API compatibility.
 *
 * To update types when GitHub's API changes:
 *   npm run schema:update
 */
import type { components } from '../../src/types/github-api.generated';

// Type aliases for convenience
type GitHubRepository = components['schemas']['repository'];
type GitHubSimpleUser = components['schemas']['simple-user'];
type GitHubNullableLicense = components['schemas']['nullable-license-simple'];

/**
 * Response format when using Accept: application/vnd.github.star+json
 * This wraps the repository with the starred_at timestamp.
 */
export interface GitHubStarredRepoResponse {
  starred_at: string;
  repo: GitHubRepository;
}

// Counter for generating unique IDs
let idCounter = 1000;

/**
 * Reset the ID counter (useful between tests).
 */
export function resetIdCounter(): void {
  idCounter = 1000;
}

/**
 * Get a unique ID for mock data.
 */
function getUniqueId(): number {
  return idCounter++;
}

/**
 * Create a mock GitHub user (simple-user schema).
 */
export function createMockGitHubUser(overrides: Partial<GitHubSimpleUser> = {}): GitHubSimpleUser {
  const id = overrides.id ?? getUniqueId();
  const login = overrides.login ?? `user-${id}`;

  return {
    login,
    id,
    node_id: `MDQ6VXNlcjE${id}`,
    avatar_url: `https://avatars.githubusercontent.com/u/${id}?v=4`,
    gravatar_id: '',
    url: `https://api.github.com/users/${login}`,
    html_url: `https://github.com/${login}`,
    followers_url: `https://api.github.com/users/${login}/followers`,
    following_url: `https://api.github.com/users/${login}/following{/other_user}`,
    gists_url: `https://api.github.com/users/${login}/gists{/gist_id}`,
    starred_url: `https://api.github.com/users/${login}/starred{/owner}{/repo}`,
    subscriptions_url: `https://api.github.com/users/${login}/subscriptions`,
    organizations_url: `https://api.github.com/users/${login}/orgs`,
    repos_url: `https://api.github.com/users/${login}/repos`,
    events_url: `https://api.github.com/users/${login}/events{/privacy}`,
    received_events_url: `https://api.github.com/users/${login}/received_events`,
    type: 'User',
    site_admin: false,
    ...overrides,
  };
}

/**
 * Create a mock license (nullable-license-simple schema).
 */
export function createMockLicense(
  overrides: Partial<NonNullable<GitHubNullableLicense>> = {}
): GitHubNullableLicense {
  return {
    key: 'mit',
    name: 'MIT License',
    spdx_id: 'MIT',
    url: 'https://api.github.com/licenses/mit',
    node_id: 'MDc6TGljZW5zZW1pdA==',
    ...overrides,
  };
}

/**
 * Options for creating a mock repository.
 */
export interface CreateMockRepositoryOptions {
  /** Repository ID (auto-generated if not provided) */
  id?: number;
  /** Repository name */
  name?: string;
  /** Repository owner (auto-generated if not provided) */
  owner?: Partial<GitHubSimpleUser>;
  /** Repository description */
  description?: string | null;
  /** Number of stars */
  stargazers_count?: number;
  /** Number of forks */
  forks_count?: number;
  /** Number of watchers */
  watchers_count?: number;
  /** Number of open issues */
  open_issues_count?: number;
  /** Primary language */
  language?: string | null;
  /** License (set to null for no license) */
  license?: GitHubNullableLicense;
  /** Repository topics */
  topics?: string[];
  /** Whether repository is private */
  private?: boolean;
  /** Whether repository is archived */
  archived?: boolean;
  /** Last pushed date */
  pushed_at?: string | null;
  /** Created date */
  created_at?: string | null;
  /** Updated date */
  updated_at?: string | null;
}

/**
 * Create a mock GitHub repository matching the OpenAPI schema.
 */
export function createMockGitHubRepository(
  options: CreateMockRepositoryOptions = {}
): GitHubRepository {
  const id = options.id ?? getUniqueId();
  const name = options.name ?? `repo-${id}`;
  const owner = createMockGitHubUser(options.owner);
  const fullName = `${owner.login}/${name}`;

  const now = new Date().toISOString();
  const createdAt = options.created_at ?? now;
  const updatedAt = options.updated_at ?? now;
  const pushedAt = options.pushed_at ?? now;

  return {
    id,
    node_id: `MDEwOlJlcG9zaXRvcnkx${id}`,
    name,
    full_name: fullName,
    private: options.private ?? false,
    owner,
    html_url: `https://github.com/${fullName}`,
    description: options.description ?? `Description for ${name}`,
    fork: false,
    url: `https://api.github.com/repos/${fullName}`,
    forks_url: `https://api.github.com/repos/${fullName}/forks`,
    keys_url: `https://api.github.com/repos/${fullName}/keys{/key_id}`,
    collaborators_url: `https://api.github.com/repos/${fullName}/collaborators{/collaborator}`,
    teams_url: `https://api.github.com/repos/${fullName}/teams`,
    hooks_url: `https://api.github.com/repos/${fullName}/hooks`,
    issue_events_url: `https://api.github.com/repos/${fullName}/issues/events{/number}`,
    events_url: `https://api.github.com/repos/${fullName}/events`,
    assignees_url: `https://api.github.com/repos/${fullName}/assignees{/user}`,
    branches_url: `https://api.github.com/repos/${fullName}/branches{/branch}`,
    tags_url: `https://api.github.com/repos/${fullName}/tags`,
    blobs_url: `https://api.github.com/repos/${fullName}/git/blobs{/sha}`,
    git_tags_url: `https://api.github.com/repos/${fullName}/git/tags{/sha}`,
    git_refs_url: `https://api.github.com/repos/${fullName}/git/refs{/sha}`,
    trees_url: `https://api.github.com/repos/${fullName}/git/trees{/sha}`,
    statuses_url: `https://api.github.com/repos/${fullName}/statuses/{sha}`,
    languages_url: `https://api.github.com/repos/${fullName}/languages`,
    stargazers_url: `https://api.github.com/repos/${fullName}/stargazers`,
    contributors_url: `https://api.github.com/repos/${fullName}/contributors`,
    subscribers_url: `https://api.github.com/repos/${fullName}/subscribers`,
    subscription_url: `https://api.github.com/repos/${fullName}/subscription`,
    commits_url: `https://api.github.com/repos/${fullName}/commits{/sha}`,
    git_commits_url: `https://api.github.com/repos/${fullName}/git/commits{/sha}`,
    comments_url: `https://api.github.com/repos/${fullName}/comments{/number}`,
    issue_comment_url: `https://api.github.com/repos/${fullName}/issues/comments{/number}`,
    contents_url: `https://api.github.com/repos/${fullName}/contents/{+path}`,
    compare_url: `https://api.github.com/repos/${fullName}/compare/{base}...{head}`,
    merges_url: `https://api.github.com/repos/${fullName}/merges`,
    archive_url: `https://api.github.com/repos/${fullName}/{archive_format}{/ref}`,
    downloads_url: `https://api.github.com/repos/${fullName}/downloads`,
    issues_url: `https://api.github.com/repos/${fullName}/issues{/number}`,
    pulls_url: `https://api.github.com/repos/${fullName}/pulls{/number}`,
    milestones_url: `https://api.github.com/repos/${fullName}/milestones{/number}`,
    notifications_url: `https://api.github.com/repos/${fullName}/notifications{?since,all,participating}`,
    labels_url: `https://api.github.com/repos/${fullName}/labels{/name}`,
    releases_url: `https://api.github.com/repos/${fullName}/releases{/id}`,
    deployments_url: `https://api.github.com/repos/${fullName}/deployments`,
    created_at: createdAt,
    updated_at: updatedAt,
    pushed_at: pushedAt,
    git_url: `git://github.com/${fullName}.git`,
    ssh_url: `git@github.com:${fullName}.git`,
    clone_url: `https://github.com/${fullName}.git`,
    svn_url: `https://github.com/${fullName}`,
    homepage: null,
    size: 1024,
    stargazers_count: options.stargazers_count ?? 100,
    watchers_count: options.watchers_count ?? options.stargazers_count ?? 100,
    language: options.language ?? 'TypeScript',
    has_issues: true,
    has_projects: true,
    has_downloads: true,
    has_wiki: true,
    has_pages: false,
    has_discussions: false,
    forks_count: options.forks_count ?? 10,
    mirror_url: null,
    archived: options.archived ?? false,
    disabled: false,
    open_issues_count: options.open_issues_count ?? 5,
    license: options.license === undefined ? createMockLicense() : options.license,
    allow_forking: true,
    is_template: false,
    web_commit_signoff_required: false,
    topics: options.topics ?? [],
    visibility: options.private ? 'private' : 'public',
    forks: options.forks_count ?? 10,
    open_issues: options.open_issues_count ?? 5,
    watchers: options.watchers_count ?? options.stargazers_count ?? 100,
    default_branch: 'main',
    allow_squash_merge: true,
    allow_merge_commit: true,
    allow_rebase_merge: true,
    allow_auto_merge: false,
    delete_branch_on_merge: false,
    allow_update_branch: false,
    use_squash_pr_title_as_default: false,
  };
}

/**
 * Options for creating a starred repository response.
 */
export interface CreateMockStarredRepoOptions extends CreateMockRepositoryOptions {
  /** When the user starred the repository (ISO 8601 format) */
  starred_at?: string;
}

/**
 * Create a mock starred repository response (star+json format).
 */
export function createMockStarredRepo(
  options: CreateMockStarredRepoOptions = {}
): GitHubStarredRepoResponse {
  const { starred_at, ...repoOptions } = options;

  return {
    starred_at: starred_at ?? new Date().toISOString(),
    repo: createMockGitHubRepository(repoOptions),
  };
}

/**
 * Create a list of mock starred repositories.
 */
export function createMockStarredReposList(
  count: number,
  baseOptions: Partial<CreateMockStarredRepoOptions> = {}
): GitHubStarredRepoResponse[] {
  const repos: GitHubStarredRepoResponse[] = [];

  // Generate repos with decreasing starred_at times (most recent first)
  const baseDate = new Date();

  for (let i = 0; i < count; i++) {
    const starredDate = new Date(baseDate);
    starredDate.setDate(starredDate.getDate() - i);

    repos.push(
      createMockStarredRepo({
        name: `repo-${i + 1}`,
        starred_at: starredDate.toISOString(),
        ...baseOptions,
      })
    );
  }

  return repos;
}

/**
 * Create mock rate limit response.
 */
export function createMockRateLimitResponse() {
  const now = Math.floor(Date.now() / 1000);
  const resetTime = now + 3600; // Reset in 1 hour

  return {
    resources: {
      core: {
        limit: 5000,
        remaining: 4999,
        reset: resetTime,
        used: 1,
      },
      search: {
        limit: 30,
        remaining: 30,
        reset: resetTime,
        used: 0,
      },
      graphql: {
        limit: 5000,
        remaining: 5000,
        reset: resetTime,
        used: 0,
      },
    },
    rate: {
      limit: 5000,
      remaining: 4999,
      reset: resetTime,
      used: 1,
    },
  };
}
