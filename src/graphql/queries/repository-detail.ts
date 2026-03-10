import { graphql } from '../../gql';

export const REPOSITORY_DETAIL_QUERY = graphql(`
  query RepositoryDetail($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      id
      databaseId
      name
      nameWithOwner
      owner {
        login
        avatarUrl
      }
      description
      url
      stargazerCount
      forkCount
      watchers {
        totalCount
      }
      primaryLanguage {
        name
      }
      licenseInfo {
        key
        name
        url
      }
      repositoryTopics(first: 100) {
        nodes {
          topic {
            name
          }
        }
      }
      pushedAt
      updatedAt
      createdAt
      viewerHasStarred
      issues(states: OPEN) {
        totalCount
      }
      releases(first: 10, orderBy: { field: CREATED_AT, direction: DESC }) {
        nodes {
          databaseId
          tagName
          name
          description
          url
          publishedAt
          createdAt
          isPrerelease
          isDraft
          author {
            login
            avatarUrl
          }
        }
      }
    }
  }
`);
