/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query RepositoryDetail($owner: String!, $name: String!) {\n    repository(owner: $owner, name: $name) {\n      id\n      databaseId\n      name\n      nameWithOwner\n      owner {\n        login\n        avatarUrl\n      }\n      description\n      url\n      stargazerCount\n      forkCount\n      watchers {\n        totalCount\n      }\n      primaryLanguage {\n        name\n      }\n      licenseInfo {\n        key\n        name\n        url\n      }\n      repositoryTopics(first: 100) {\n        nodes {\n          topic {\n            name\n          }\n        }\n      }\n      pushedAt\n      updatedAt\n      createdAt\n      viewerHasStarred\n      issues(states: OPEN) {\n        totalCount\n      }\n      releases(first: 10, orderBy: { field: CREATED_AT, direction: DESC }) {\n        nodes {\n          databaseId\n          tagName\n          name\n          description\n          url\n          publishedAt\n          createdAt\n          isPrerelease\n          isDraft\n          author {\n            login\n            avatarUrl\n          }\n        }\n      }\n    }\n  }\n": typeof types.RepositoryDetailDocument,
};
const documents: Documents = {
    "\n  query RepositoryDetail($owner: String!, $name: String!) {\n    repository(owner: $owner, name: $name) {\n      id\n      databaseId\n      name\n      nameWithOwner\n      owner {\n        login\n        avatarUrl\n      }\n      description\n      url\n      stargazerCount\n      forkCount\n      watchers {\n        totalCount\n      }\n      primaryLanguage {\n        name\n      }\n      licenseInfo {\n        key\n        name\n        url\n      }\n      repositoryTopics(first: 100) {\n        nodes {\n          topic {\n            name\n          }\n        }\n      }\n      pushedAt\n      updatedAt\n      createdAt\n      viewerHasStarred\n      issues(states: OPEN) {\n        totalCount\n      }\n      releases(first: 10, orderBy: { field: CREATED_AT, direction: DESC }) {\n        nodes {\n          databaseId\n          tagName\n          name\n          description\n          url\n          publishedAt\n          createdAt\n          isPrerelease\n          isDraft\n          author {\n            login\n            avatarUrl\n          }\n        }\n      }\n    }\n  }\n": types.RepositoryDetailDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query RepositoryDetail($owner: String!, $name: String!) {\n    repository(owner: $owner, name: $name) {\n      id\n      databaseId\n      name\n      nameWithOwner\n      owner {\n        login\n        avatarUrl\n      }\n      description\n      url\n      stargazerCount\n      forkCount\n      watchers {\n        totalCount\n      }\n      primaryLanguage {\n        name\n      }\n      licenseInfo {\n        key\n        name\n        url\n      }\n      repositoryTopics(first: 100) {\n        nodes {\n          topic {\n            name\n          }\n        }\n      }\n      pushedAt\n      updatedAt\n      createdAt\n      viewerHasStarred\n      issues(states: OPEN) {\n        totalCount\n      }\n      releases(first: 10, orderBy: { field: CREATED_AT, direction: DESC }) {\n        nodes {\n          databaseId\n          tagName\n          name\n          description\n          url\n          publishedAt\n          createdAt\n          isPrerelease\n          isDraft\n          author {\n            login\n            avatarUrl\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query RepositoryDetail($owner: String!, $name: String!) {\n    repository(owner: $owner, name: $name) {\n      id\n      databaseId\n      name\n      nameWithOwner\n      owner {\n        login\n        avatarUrl\n      }\n      description\n      url\n      stargazerCount\n      forkCount\n      watchers {\n        totalCount\n      }\n      primaryLanguage {\n        name\n      }\n      licenseInfo {\n        key\n        name\n        url\n      }\n      repositoryTopics(first: 100) {\n        nodes {\n          topic {\n            name\n          }\n        }\n      }\n      pushedAt\n      updatedAt\n      createdAt\n      viewerHasStarred\n      issues(states: OPEN) {\n        totalCount\n      }\n      releases(first: 10, orderBy: { field: CREATED_AT, direction: DESC }) {\n        nodes {\n          databaseId\n          tagName\n          name\n          description\n          url\n          publishedAt\n          createdAt\n          isPrerelease\n          isDraft\n          author {\n            login\n            avatarUrl\n          }\n        }\n      }\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;