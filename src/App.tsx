import { ErrorBoundary } from 'react-error-boundary';
import { AuthProvider } from './components/AuthProvider';
import { Header } from './components/Header';
import Login from './pages/Login';
import { AuthErrorFallback } from './components/AuthErrorFallback';
import { logger } from './utils/logger';
import { RepoCard } from './components/RepoCard';
import type { RepositoryWithMetrics } from './types';

// Mock data for testing RepoCard component
const mockRepos: RepositoryWithMetrics[] = [
  {
    id: 1,
    name: 'react',
    full_name: 'facebook/react',
    owner: {
      login: 'facebook',
      avatar_url: 'https://avatars.githubusercontent.com/u/69631?v=4',
    },
    description: 'The library for web and native user interfaces',
    html_url: 'https://github.com/facebook/react',
    stargazers_count: 234567,
    open_issues_count: 892,
    language: 'JavaScript',
    topics: ['javascript', 'react', 'frontend', 'ui', 'library'],
    updated_at: '2024-01-15T10:30:00Z',
    pushed_at: '2024-01-15T10:30:00Z',
    created_at: '2013-05-24T16:15:54Z',
    starred_at: '2024-01-01T12:00:00Z',
    metrics: {
      stars_growth_rate: 12.5,
      is_trending: true,
      momentum_score: 9.2,
    },
    is_following: true,
  },
  {
    id: 2,
    name: 'typescript',
    full_name: 'microsoft/typescript',
    owner: {
      login: 'microsoft',
      avatar_url: 'https://avatars.githubusercontent.com/u/6154722?v=4',
    },
    description: 'TypeScript is a superset of JavaScript that compiles to clean JavaScript output.',
    html_url: 'https://github.com/microsoft/typescript',
    stargazers_count: 98765,
    open_issues_count: 456,
    language: 'TypeScript',
    topics: ['typescript', 'javascript', 'language', 'compiler'],
    updated_at: '2024-01-14T08:45:00Z',
    pushed_at: '2024-01-14T08:45:00Z',
    created_at: '2014-06-17T15:28:39Z',
    starred_at: '2024-01-02T14:30:00Z',
    metrics: {
      stars_growth_rate: -2.1,
    },
    is_following: false,
  },
  {
    id: 3,
    name: 'awesome-selfhosted',
    full_name: 'awesome-selfhosted/awesome-selfhosted',
    owner: {
      login: 'awesome-selfhosted',
      avatar_url: 'https://avatars.githubusercontent.com/u/17752237?v=4',
    },
    description:
      'A list of Free Software network services and web applications which can be hosted on your own servers',
    html_url: 'https://github.com/awesome-selfhosted/awesome-selfhosted',
    stargazers_count: 156789,
    open_issues_count: 23,
    language: null,
    topics: ['awesome', 'selfhosted', 'self-hosted'],
    updated_at: '2024-01-10T12:15:00Z',
    pushed_at: '2024-01-10T12:15:00Z',
    created_at: '2015-02-04T12:32:15Z',
    starred_at: '2024-01-03T09:20:00Z',
  },
];

function App() {
  return (
    <ErrorBoundary
      FallbackComponent={AuthErrorFallback}
      onError={(error, errorInfo) => {
        logger.error('Auth Error Boundary caught an error:', { error, errorInfo });

        // In production, you might want to:
        // - Clear auth tokens if auth-related error
        // - Send to error reporting with 'auth' tag
        // - Track auth flow failures
      }}
    >
      <AuthProvider>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Repository Cards Preview</h1>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {mockRepos.map((repo) => (
              <RepoCard
                key={repo.id}
                repository={repo}
                onToggleFollow={(repo) => {
                  console.log('Toggle follow for:', repo.full_name);
                }}
              />
            ))}
          </div>
        </div>
        <Login />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
