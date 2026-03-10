import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { getValidGitHubToken } from '../services/github-token';

const httpLink = createHttpLink({
  uri: 'https://api.github.com/graphql',
});

const authLink = setContext((_request, { headers }) => {
  try {
    const token = getValidGitHubToken(null);
    return {
      headers: {
        ...(headers as Record<string, string>),
        authorization: `Bearer ${token}`,
      },
    };
  } catch {
    return { headers: headers as Record<string, string> };
  }
});

export function createApolloClient() {
  return new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache({
      typePolicies: {
        Repository: {
          keyFields: ['id'],
        },
        User: {
          keyFields: ['login'],
        },
      },
    }),
  });
}
