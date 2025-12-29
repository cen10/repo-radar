import { useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AuthProvider } from './components/AuthProvider';
import { Header } from './components/Header';
import Login from './pages/Login';
import { AuthErrorFallback } from './components/AuthErrorFallback';
import { logger } from './utils/logger';
import RepositoryList from './components/RepositoryList';
import type { Repository } from './types';

// Mock data for testing RepositoryList component
const mockRepos: Repository[] = [
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
  {
    id: 4,
    name: 'vscode',
    full_name: 'microsoft/vscode',
    owner: {
      login: 'microsoft',
      avatar_url: 'https://avatars.githubusercontent.com/u/6154722?v=4',
    },
    description: 'Visual Studio Code',
    html_url: 'https://github.com/microsoft/vscode',
    stargazers_count: 178932,
    open_issues_count: 5234,
    language: 'TypeScript',
    topics: ['editor', 'electron', 'vscode', 'ide'],
    updated_at: '2024-01-16T15:20:00Z',
    pushed_at: '2024-01-16T15:20:00Z',
    created_at: '2015-09-03T20:23:00Z',
  },
  {
    id: 5,
    name: 'next.js',
    full_name: 'vercel/next.js',
    owner: {
      login: 'vercel',
      avatar_url: 'https://avatars.githubusercontent.com/u/14985020?v=4',
    },
    description: 'The React Framework',
    html_url: 'https://github.com/vercel/next.js',
    stargazers_count: 119234,
    open_issues_count: 1234,
    language: 'JavaScript',
    topics: ['react', 'nextjs', 'framework', 'ssr', 'ssg'],
    updated_at: '2024-01-16T10:00:00Z',
    pushed_at: '2024-01-16T10:00:00Z',
    created_at: '2016-10-05T23:32:51Z',
  },
  {
    id: 6,
    name: 'vue',
    full_name: 'vuejs/vue',
    owner: {
      login: 'vuejs',
      avatar_url: 'https://avatars.githubusercontent.com/u/6128107?v=4',
    },
    description: 'This is the repo for Vue 2. For Vue 3, go to https://github.com/vuejs/core',
    html_url: 'https://github.com/vuejs/vue',
    stargazers_count: 206789,
    open_issues_count: 234,
    language: 'JavaScript',
    topics: ['javascript', 'vue', 'frontend', 'framework'],
    updated_at: '2023-12-20T08:00:00Z',
    pushed_at: '2023-12-20T08:00:00Z',
    created_at: '2013-07-29T03:24:51Z',
  },
  {
    id: 7,
    name: 'rust',
    full_name: 'rust-lang/rust',
    owner: {
      login: 'rust-lang',
      avatar_url: 'https://avatars.githubusercontent.com/u/5430905?v=4',
    },
    description: 'Empowering everyone to build reliable and efficient software.',
    html_url: 'https://github.com/rust-lang/rust',
    stargazers_count: 89234,
    open_issues_count: 8976,
    language: 'Rust',
    topics: ['rust', 'compiler', 'language', 'programming-language'],
    updated_at: '2024-01-16T20:00:00Z',
    pushed_at: '2024-01-16T20:00:00Z',
    created_at: '2010-06-16T20:39:03Z',
  },
  {
    id: 8,
    name: 'go',
    full_name: 'golang/go',
    owner: {
      login: 'golang',
      avatar_url: 'https://avatars.githubusercontent.com/u/4314092?v=4',
    },
    description: 'The Go programming language',
    html_url: 'https://github.com/golang/go',
    stargazers_count: 118234,
    open_issues_count: 7234,
    language: 'Go',
    topics: ['go', 'golang', 'language', 'programming-language'],
    updated_at: '2024-01-15T18:00:00Z',
    pushed_at: '2024-01-15T18:00:00Z',
    created_at: '2014-08-19T04:33:40Z',
  },
  {
    id: 9,
    name: 'kubernetes',
    full_name: 'kubernetes/kubernetes',
    owner: {
      login: 'kubernetes',
      avatar_url: 'https://avatars.githubusercontent.com/u/13629408?v=4',
    },
    description: 'Production-Grade Container Scheduling and Management',
    html_url: 'https://github.com/kubernetes/kubernetes',
    stargazers_count: 105432,
    open_issues_count: 2345,
    language: 'Go',
    topics: ['kubernetes', 'k8s', 'containers', 'orchestration'],
    updated_at: '2024-01-16T12:00:00Z',
    pushed_at: '2024-01-16T12:00:00Z',
    created_at: '2014-06-06T22:56:04Z',
  },
  {
    id: 10,
    name: 'tensorflow',
    full_name: 'tensorflow/tensorflow',
    owner: {
      login: 'tensorflow',
      avatar_url: 'https://avatars.githubusercontent.com/u/15658638?v=4',
    },
    description: 'An Open Source Machine Learning Framework for Everyone',
    html_url: 'https://github.com/tensorflow/tensorflow',
    stargazers_count: 181234,
    open_issues_count: 1876,
    language: 'C++',
    topics: ['machine-learning', 'deep-learning', 'neural-network', 'ml'],
    updated_at: '2024-01-14T16:00:00Z',
    pushed_at: '2024-01-14T16:00:00Z',
    created_at: '2015-11-07T01:19:20Z',
  },
  {
    id: 11,
    name: 'pytorch',
    full_name: 'pytorch/pytorch',
    owner: {
      login: 'pytorch',
      avatar_url: 'https://avatars.githubusercontent.com/u/21003710?v=4',
    },
    description: 'Tensors and Dynamic neural networks in Python with strong GPU acceleration',
    html_url: 'https://github.com/pytorch/pytorch',
    stargazers_count: 76543,
    open_issues_count: 12456,
    language: 'Python',
    topics: ['deep-learning', 'machine-learning', 'neural-network', 'python'],
    updated_at: '2024-01-16T14:00:00Z',
    pushed_at: '2024-01-16T14:00:00Z',
    created_at: '2016-08-13T05:26:41Z',
  },
  {
    id: 12,
    name: 'docker',
    full_name: 'moby/moby',
    owner: {
      login: 'moby',
      avatar_url: 'https://avatars.githubusercontent.com/u/27259197?v=4',
    },
    description: 'Moby Project - a collaborative project for the container ecosystem',
    html_url: 'https://github.com/moby/moby',
    stargazers_count: 67234,
    open_issues_count: 4234,
    language: 'Go',
    topics: ['docker', 'containers', 'moby', 'container-runtime'],
    updated_at: '2024-01-13T10:00:00Z',
    pushed_at: '2024-01-13T10:00:00Z',
    created_at: '2013-01-18T18:10:57Z',
  },
  {
    id: 13,
    name: 'nodejs',
    full_name: 'nodejs/node',
    owner: {
      login: 'nodejs',
      avatar_url: 'https://avatars.githubusercontent.com/u/9950313?v=4',
    },
    description: 'Node.js JavaScript runtime',
    html_url: 'https://github.com/nodejs/node',
    stargazers_count: 102345,
    open_issues_count: 876,
    language: 'JavaScript',
    topics: ['node', 'nodejs', 'javascript', 'runtime'],
    updated_at: '2024-01-16T08:00:00Z',
    pushed_at: '2024-01-16T08:00:00Z',
    created_at: '2014-11-26T20:57:11Z',
  },
  {
    id: 14,
    name: 'deno',
    full_name: 'denoland/deno',
    owner: {
      login: 'denoland',
      avatar_url: 'https://avatars.githubusercontent.com/u/42048915?v=4',
    },
    description: 'A modern runtime for JavaScript and TypeScript',
    html_url: 'https://github.com/denoland/deno',
    stargazers_count: 92345,
    open_issues_count: 654,
    language: 'Rust',
    topics: ['deno', 'typescript', 'javascript', 'runtime'],
    updated_at: '2024-01-15T22:00:00Z',
    pushed_at: '2024-01-15T22:00:00Z',
    created_at: '2018-05-15T01:34:26Z',
  },
  {
    id: 15,
    name: 'svelte',
    full_name: 'sveltejs/svelte',
    owner: {
      login: 'sveltejs',
      avatar_url: 'https://avatars.githubusercontent.com/u/23617963?v=4',
    },
    description: 'Cybernetically enhanced web apps',
    html_url: 'https://github.com/sveltejs/svelte',
    stargazers_count: 75432,
    open_issues_count: 234,
    language: 'JavaScript',
    topics: ['svelte', 'compiler', 'framework', 'javascript'],
    updated_at: '2024-01-16T11:00:00Z',
    pushed_at: '2024-01-16T11:00:00Z',
    created_at: '2016-11-20T19:18:57Z',
  },
];

function App() {
  const [followedRepos, setFollowedRepos] = useState<Set<number>>(
    new Set([1, 4, 9]) // Some repos are initially followed for demo
  );

  const handleFollow = (repoId: number) => {
    setFollowedRepos((prev) => {
      const newSet = new Set(prev);
      newSet.add(repoId);
      console.log(`Following repo ${repoId}`);
      return newSet;
    });
  };

  const handleUnfollow = (repoId: number) => {
    setFollowedRepos((prev) => {
      const newSet = new Set(prev);
      newSet.delete(repoId);
      console.log(`Unfollowing repo ${repoId}`);
      return newSet;
    });
  };

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
          <h1 className="text-3xl font-bold text-gray-900 mb-8">GitHub Repository Dashboard</h1>
          <RepositoryList
            repositories={mockRepos}
            followedRepos={followedRepos}
            onFollow={handleFollow}
            onUnfollow={handleUnfollow}
            itemsPerPage={6}
          />
        </div>
        <Login />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
