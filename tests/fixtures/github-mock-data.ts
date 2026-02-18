/**
 * GitHub API mock data factories for E2E tests.
 * Types are derived from the OpenAPI schema to ensure API compatibility.
 *
 * To update types when GitHub's API changes:
 *   npm run schema:update
 */
import type { components } from '@/types/github-api.generated';
import { getTourRepos } from '@/demo/tour-data';

type GitHubRepository = components['schemas']['repository'];
type GitHubSimpleUser = components['schemas']['simple-user'];

/**
 * Response format when using Accept: application/vnd.github.star+json
 * Wraps the repository with a starred_at timestamp.
 */
export interface GitHubStarredRepoResponse {
  starred_at: string;
  repo: GitHubRepository;
}

export const MOCK_LICENSE = {
  key: 'mit',
  name: 'MIT License',
  spdx_id: 'MIT',
  url: 'https://api.github.com/licenses/mit',
  node_id: 'MDc6TGljZW5zZW1pdA==',
};

function createMockOwner(login: string, id: number): GitHubSimpleUser {
  const ownerApi = `https://api.github.com/users/${login}`;
  const ownerWeb = `https://github.com/${login}`;

  return {
    login,
    id,
    node_id: `MDQ6VXNlciR7${id}}`,
    avatar_url: `https://avatars.githubusercontent.com/u/${id}?v=4`,
    gravatar_id: '',
    url: ownerApi,
    html_url: ownerWeb,
    followers_url: `${ownerApi}/followers`,
    following_url: `${ownerApi}/following{/other_user}`,
    gists_url: `${ownerApi}/gists{/gist_id}`,
    starred_url: `${ownerApi}/starred{/owner}{/repo}`,
    subscriptions_url: `${ownerApi}/subscriptions`,
    organizations_url: `${ownerApi}/orgs`,
    repos_url: `${ownerApi}/repos`,
    events_url: `${ownerApi}/events{/privacy}`,
    received_events_url: `${ownerApi}/received_events`,
    type: 'User',
    site_admin: false,
  };
}

function createMockRepository(id: number, name: string, ownerLogin: string): GitHubRepository {
  const now = new Date().toISOString();
  const repoApi = `https://api.github.com/repos/${ownerLogin}/${name}`;
  const repoWeb = `https://github.com/${ownerLogin}/${name}`;
  const owner = createMockOwner(ownerLogin, 10000 + id);

  return {
    id,
    node_id: `MDEwOlJlcG9zaXRvcnkk${id}`,
    name,
    full_name: `${ownerLogin}/${name}`,
    private: false,
    owner,
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
    git_url: `git://github.com/${ownerLogin}/${name}.git`,
    ssh_url: `git@github.com:${ownerLogin}/${name}.git`,
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
 * Creates a list of mock starred repositories using tour repo data.
 * Returns repos in starred order (most recent first).
 *
 * Uses tour repo data from src/demo/tour-data.ts as the source of truth,
 * ensuring E2E tests have repos with correct IDs for tour navigation.
 */
export function createMockStarredReposList(): GitHubStarredRepoResponse[] {
  const tourRepos = getTourRepos();
  const baseDate = new Date();

  return tourRepos.map((repo, i) => {
    const starredDate = new Date(baseDate);
    starredDate.setDate(starredDate.getDate() - i);

    return {
      starred_at: repo.starred_at ?? starredDate.toISOString(),
      repo: createMockRepository(repo.id, repo.name, repo.owner.login),
    };
  });
}
