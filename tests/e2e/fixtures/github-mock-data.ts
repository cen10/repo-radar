/**
 * GitHub API mock data factories for E2E tests.
 * Types are derived from the OpenAPI schema to ensure API compatibility.
 *
 * To update types when GitHub's API changes:
 *   npm run schema:update
 */
import type { components } from '@/types/github-api.generated';

type GitHubRepository = components['schemas']['repository'];
type GitHubSimpleUser = components['schemas']['simple-user'];
type GitHubNullableLicense = components['schemas']['nullable-license-simple'];

/**
 * Response format when using Accept: application/vnd.github.star+json
 * Wraps the repository with a starred_at timestamp.
 */
export interface GitHubStarredRepoResponse {
  starred_at: string;
  repo: GitHubRepository;
}

// Base URLs for mock data - suffixes show what matters
const USER_API = 'https://api.github.com/users/mock-user';
const USER_WEB = 'https://github.com/mock-user';

const MOCK_USER: GitHubSimpleUser = {
  login: 'mock-user',
  id: 12345,
  node_id: 'MDQ6VXNlcjEyMzQ1',
  avatar_url: 'https://avatars.githubusercontent.com/u/12345?v=4',
  gravatar_id: '',
  url: USER_API,
  html_url: USER_WEB,
  followers_url: `${USER_API}/followers`,
  following_url: `${USER_API}/following{/other_user}`,
  gists_url: `${USER_API}/gists{/gist_id}`,
  starred_url: `${USER_API}/starred{/owner}{/repo}`,
  subscriptions_url: `${USER_API}/subscriptions`,
  organizations_url: `${USER_API}/orgs`,
  repos_url: `${USER_API}/repos`,
  events_url: `${USER_API}/events{/privacy}`,
  received_events_url: `${USER_API}/received_events`,
  type: 'User',
  site_admin: false,
};

export const MOCK_LICENSE: GitHubNullableLicense = {
  key: 'mit',
  name: 'MIT License',
  spdx_id: 'MIT',
  url: 'https://api.github.com/licenses/mit',
  node_id: 'MDc6TGljZW5zZW1pdA==',
};

function createMockRepository(id: number, name: string): GitHubRepository {
  const now = new Date().toISOString();
  const repoApi = `https://api.github.com/repos/mock-user/${name}`;
  const repoWeb = `https://github.com/mock-user/${name}`;

  return {
    id,
    node_id: 'MDEwOlJlcG9zaXRvcnkxMjM0NQ==',
    name,
    full_name: `mock-user/${name}`,
    private: false,
    owner: MOCK_USER,
    html_url: repoWeb,
    description: `Description for ${name}`,
    fork: false,
    url: repoApi,
    forks_url: `${repoApi}/forks`,
    keys_url: `${repoApi}/keys{/key_id}`,
    collaborators_url: `${repoApi}/collaborators{/collaborator}`,
    teams_url: `${repoApi}/teams`,
    hooks_url: `${repoApi}/hooks`,
    issue_events_url: `${repoApi}/issues/events{/number}`,
    events_url: `${repoApi}/events`,
    assignees_url: `${repoApi}/assignees{/user}`,
    branches_url: `${repoApi}/branches{/branch}`,
    tags_url: `${repoApi}/tags`,
    blobs_url: `${repoApi}/git/blobs{/sha}`,
    git_tags_url: `${repoApi}/git/tags{/sha}`,
    git_refs_url: `${repoApi}/git/refs{/sha}`,
    trees_url: `${repoApi}/git/trees{/sha}`,
    statuses_url: `${repoApi}/statuses/{sha}`,
    languages_url: `${repoApi}/languages`,
    stargazers_url: `${repoApi}/stargazers`,
    contributors_url: `${repoApi}/contributors`,
    subscribers_url: `${repoApi}/subscribers`,
    subscription_url: `${repoApi}/subscription`,
    commits_url: `${repoApi}/commits{/sha}`,
    git_commits_url: `${repoApi}/git/commits{/sha}`,
    comments_url: `${repoApi}/comments{/number}`,
    issue_comment_url: `${repoApi}/issues/comments{/number}`,
    contents_url: `${repoApi}/contents/{+path}`,
    compare_url: `${repoApi}/compare/{base}...{head}`,
    merges_url: `${repoApi}/merges`,
    archive_url: `${repoApi}/{archive_format}{/ref}`,
    downloads_url: `${repoApi}/downloads`,
    issues_url: `${repoApi}/issues{/number}`,
    pulls_url: `${repoApi}/pulls{/number}`,
    milestones_url: `${repoApi}/milestones{/number}`,
    notifications_url: `${repoApi}/notifications{?since,all,participating}`,
    labels_url: `${repoApi}/labels{/name}`,
    releases_url: `${repoApi}/releases{/id}`,
    deployments_url: `${repoApi}/deployments`,
    created_at: now,
    updated_at: now,
    pushed_at: now,
    git_url: `git://github.com/mock-user/${name}.git`,
    ssh_url: `git@github.com:mock-user/${name}.git`,
    clone_url: `${repoWeb}.git`,
    svn_url: repoWeb,
    homepage: null,
    size: 1024,
    stargazers_count: 100,
    watchers_count: 100,
    language: 'TypeScript',
    has_issues: true,
    has_projects: true,
    has_downloads: true,
    has_wiki: true,
    has_pages: false,
    has_discussions: false,
    forks_count: 10,
    mirror_url: null,
    archived: false,
    disabled: false,
    open_issues_count: 5,
    license: MOCK_LICENSE,
    allow_forking: true,
    is_template: false,
    web_commit_signoff_required: false,
    topics: [],
    visibility: 'public',
    forks: 10,
    open_issues: 5,
    watchers: 100,
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
 * Creates a list of mock starred repositories.
 * Repos are ordered with most recently starred first (decreasing starred_at dates).
 * IDs are deterministic: 1000 + index (e.g., 1000, 1001, 1002...).
 */
export function createMockStarredReposList(count: number): GitHubStarredRepoResponse[] {
  const baseDate = new Date();

  return Array.from({ length: count }, (_, i) => {
    const starredDate = new Date(baseDate);
    starredDate.setDate(starredDate.getDate() - i);

    return {
      starred_at: starredDate.toISOString(),
      repo: createMockRepository(1000 + i, `repo-${i + 1}`),
    };
  });
}
