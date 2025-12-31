import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import RepositoryList from '../components/RepositoryList';
import { useAuth } from '../hooks/useAuth';
import { fetchStarredRepositories, searchRepositories } from '../services/github';
import type { Repository } from '../types';

const Dashboard = () => {
  const { user, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [starredRepositories, setStarredRepositories] = useState<Repository[]>([]);
  const [searchResults, setSearchResults] = useState<Repository[]>([]);
  const [followedRepos, setFollowedRepos] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (!authLoading && !user) {
      void navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Load starred repositories on mount
  useEffect(() => {
    const loadStarredRepositories = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check if we have a valid session with GitHub token
        if (!session?.provider_token) {
          // Fall back to mock data if no GitHub token
          console.warn('No GitHub token available, using mock data');
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
          ];
          setStarredRepositories(mockRepos);
          setRepositories(mockRepos);
          setFollowedRepos(new Set([1]));
          return;
        }

        // Fetch real data from GitHub API
        const repos = await fetchStarredRepositories(session, 1, 100);
        setStarredRepositories(repos);
        setRepositories(repos); // Initially show starred repos

        // Load followed repos from localStorage
        const savedFollows = localStorage.getItem('followedRepos');
        if (savedFollows) {
          const followedIds = JSON.parse(savedFollows) as number[];
          setFollowedRepos(new Set(followedIds));
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load repositories'));
      } finally {
        setIsLoading(false);
      }
    };

    if (user && !authLoading) {
      void loadStarredRepositories();
    }
  }, [user, session, authLoading]);

  // Search GitHub repositories with debouncing
  const performSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        // If query is empty, show starred repositories
        setSearchResults([]);
        setRepositories(starredRepositories);
        return;
      }

      // First, filter starred repositories locally
      const localQuery = query.toLowerCase();
      const localMatches = starredRepositories.filter((repo) => {
        const searchIn = [
          repo.name,
          repo.full_name,
          repo.description || '',
          repo.language || '',
          ...(repo.topics || []),
        ]
          .join(' ')
          .toLowerCase();
        return searchIn.includes(localQuery);
      });

      // Set initial results (local matches or empty)
      setRepositories(localMatches);

      // Then search GitHub for more results
      if (session?.provider_token) {
        try {
          setIsSearching(true);
          console.log('Searching GitHub for:', query);
          const results = await searchRepositories(session, query, 1, 30);
          console.log('Search results:', results.length, 'repositories found');

          // Combine local matches with search results, removing duplicates
          const combinedIds = new Set(localMatches.map((r) => r.id));
          const uniqueSearchResults = results.filter((r) => !combinedIds.has(r.id));
          const combined = [...localMatches, ...uniqueSearchResults];

          setSearchResults(results);
          setRepositories(combined);
        } catch (err) {
          console.error('Search failed:', err);
          // Still show local matches even if search fails
          if (localMatches.length === 0) {
            setError(err instanceof Error ? err : new Error('Search failed'));
          }
        } finally {
          setIsSearching(false);
        }
      } else {
        // No token, just show local matches (already set above)
        console.warn('No GitHub token available for search');
        setIsSearching(false);
      }
    },
    [session, starredRepositories]
  );

  // Handle search input with debouncing
  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);

      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Set new timeout for debounced search
      searchTimeoutRef.current = setTimeout(() => {
        void performSearch(query);
      }, 300); // 300ms debounce
    },
    [performSearch]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleFollow = async (repoId: number) => {
    try {
      // Update local state
      setFollowedRepos((prev) => {
        const newSet = new Set(prev);
        newSet.add(repoId);
        // Save to localStorage (in production, this would be a backend call)
        localStorage.setItem('followedRepos', JSON.stringify(Array.from(newSet)));
        return newSet;
      });
    } catch (err) {
      console.error('Failed to follow repository:', err);
    }
  };

  const handleUnfollow = async (repoId: number) => {
    try {
      // Update local state
      setFollowedRepos((prev) => {
        const newSet = new Set(prev);
        newSet.delete(repoId);
        // Save to localStorage (in production, this would be a backend call)
        localStorage.setItem('followedRepos', JSON.stringify(Array.from(newSet)));
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
          <h2 className="text-3xl font-bold text-gray-900">Repository Dashboard</h2>
          <p className="mt-2 text-gray-600">
            {searchQuery
              ? `Searching for "${searchQuery}"${isSearching ? '...' : ''}`
              : 'Track and manage your starred GitHub repositories'}
          </p>
          {searchQuery && searchResults.length > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              Showing {repositories.length} repositories
              {repositories.length !== starredRepositories.length &&
                ` (${
                  starredRepositories.filter((r) => repositories.some((repo) => repo.id === r.id))
                    .length
                } from your stars)`}
            </p>
          )}
        </div>

        <RepositoryList
          repositories={repositories}
          isLoading={isLoading}
          error={error}
          onFollow={handleFollow}
          onUnfollow={handleUnfollow}
          followedRepos={followedRepos}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          isSearching={isSearching}
          itemsPerPage={9}
        />
      </div>
    </div>
  );
};

export default Dashboard;
