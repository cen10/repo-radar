import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RepositoryList from '../components/RepositoryList';
import { useAuth } from '../hooks/useAuth';
import type { Repository } from '../types';

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [followedRepos, setFollowedRepos] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      void navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const loadRepositories = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // TODO: Replace with actual GitHub API call
        // For now, using mock data
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
            metrics: {
              stars_growth_rate: 12.5,
              issues_growth_rate: -3.2,
              is_trending: true,
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
            description:
              'TypeScript is a superset of JavaScript that compiles to clean JavaScript output.',
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
              stars_growth_rate: 8.1,
              issues_growth_rate: 2.4,
              is_trending: false,
            },
            is_following: false,
          },
          {
            id: 3,
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
            metrics: {
              stars_growth_rate: -1.2,
              issues_growth_rate: 15.7,
              is_trending: false,
            },
            is_following: false,
          },
        ];

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        setRepositories(mockRepos);
        // TODO: Load followed repos from backend
        setFollowedRepos(new Set([1])); // Mock: user follows React
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load repositories'));
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      void loadRepositories();
    }
  }, [user]);

  const handleFollow = async (repoId: number) => {
    try {
      // TODO: Implement API call to save follow state
      setFollowedRepos((prev) => {
        const newSet = new Set(prev);
        newSet.add(repoId);
        return newSet;
      });
    } catch (err) {
      console.error('Failed to follow repository:', err);
    }
  };

  const handleUnfollow = async (repoId: number) => {
    try {
      // TODO: Implement API call to remove follow state
      setFollowedRepos((prev) => {
        const newSet = new Set(prev);
        newSet.delete(repoId);
        return newSet;
      });
    } catch (err) {
      console.error('Failed to unfollow repository:', err);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login via useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Repository Dashboard</h1>
          <p className="mt-2 text-gray-600">Track and manage your starred GitHub repositories</p>
        </div>

        <RepositoryList
          repositories={repositories}
          isLoading={isLoading}
          error={error}
          onFollow={handleFollow}
          onUnfollow={handleUnfollow}
          followedRepos={followedRepos}
          itemsPerPage={9}
        />
      </div>
    </div>
  );
};

export default Dashboard;
