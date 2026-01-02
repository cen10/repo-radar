import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import RepositoryList from '../components/RepositoryList';
import { useAuth } from '../hooks/useAuth';
import {
  fetchStarredRepositories,
  searchRepositories,
  starRepository,
  unstarRepository,
} from '../services/github';
import type { Repository } from '../types';
import {
  filterOutLocallyUnstarred,
  addToLocallyUnstarred,
  removeFromLocallyUnstarred,
} from '../utils/repository-filter';

const Dashboard = () => {
  const { user, session, loading: authLoading, signOut } = useAuth();
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

    // Auto sign-out if user has Supabase session but no GitHub token
    if (!authLoading && user && session && !session.provider_token) {
      void signOut().then(() => {
        void navigate('/login');
      });
    }
  }, [user, session, authLoading, navigate, signOut]);

  // Handle localStorage cleanup and cross-tab synchronization
  useEffect(() => {
    // Clean up expired entries from localStorage on startup
    const stored = localStorage.getItem('locallyUnstarredRepos');
    if (stored) {
      const entries = JSON.parse(stored);
      const now = Date.now();
      const validEntries = entries.filter(
        (entry: { timestamp: number }) => now - entry.timestamp < 60000 // 1 minute
      );

      if (validEntries.length !== entries.length) {
        localStorage.setItem('locallyUnstarredRepos', JSON.stringify(validEntries));
      }
    }

    // Listen for localStorage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'locallyUnstarredRepos') {
        // Refresh current repository list
        setRepositories((prev) => filterOutLocallyUnstarred(prev));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Load starred repositories on mount
  useEffect(() => {
    const loadStarredRepositories = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch real data from GitHub API
        // This will throw an error if session or provider_token is missing
        const repos = await fetchStarredRepositories(session, 1, 100);
        const filteredRepos = filterOutLocallyUnstarred(repos);
        setStarredRepositories(repos);
        setRepositories(filteredRepos); // Initially show starred repos with filtering applied

        // Load followed repos from localStorage
        const savedFollows = localStorage.getItem('followedRepos');
        if (savedFollows) {
          const followedIds = JSON.parse(savedFollows) as number[];
          setFollowedRepos(new Set(followedIds));
        }
      } catch (err) {
        // Check if it's a GitHub auth error and provide a more user-friendly message
        if (err instanceof Error && err.message.includes('No GitHub access token')) {
          setError(
            new Error(
              'Your GitHub session has expired. Please sign out and sign in again to reconnect your GitHub account.'
            )
          );
        } else {
          setError(err instanceof Error ? err : new Error('Failed to load repositories'));
        }
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
        // If query is empty, show starred repositories with filtering applied
        setSearchResults([]);
        setRepositories(filterOutLocallyUnstarred(starredRepositories));
        return;
      }

      // Set searching state immediately
      setIsSearching(true);

      // Filter starred repositories locally
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

      // Search GitHub for more results if we have a token
      if (session?.provider_token) {
        try {
          const results = await searchRepositories(session, query, 1, 30);

          // Combine local matches with search results, removing duplicates
          const combinedIds = new Set(localMatches.map((r) => r.id));
          const uniqueSearchResults = results.filter((r) => !combinedIds.has(r.id));
          const combined = [...localMatches, ...uniqueSearchResults];

          setSearchResults(results);
          setRepositories(filterOutLocallyUnstarred(combined));
        } catch (err) {
          console.error('Search failed:', err);
          // On error, just show local matches with filtering applied
          setRepositories(filterOutLocallyUnstarred(localMatches));
          if (localMatches.length === 0) {
            setError(err instanceof Error ? err : new Error('Search failed'));
          }
        } finally {
          setIsSearching(false);
        }
      } else {
        // No token, just show local matches with filtering applied
        setRepositories(filterOutLocallyUnstarred(localMatches));
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

  const handleStar = async (repoId: number) => {
    try {
      // Remove from locally unstarred list immediately
      removeFromLocallyUnstarred(repoId);

      // Find the repository to get owner and name
      const repo =
        repositories.find((r) => r.id === repoId) ||
        searchResults.find((r) => r.id === repoId) ||
        starredRepositories.find((r) => r.id === repoId);

      if (!repo) {
        throw new Error('Repository not found');
      }

      // Star the repository on GitHub
      await starRepository(session, repo.owner.login, repo.name);

      // Update local state to reflect the change immediately
      setFollowedRepos((prev) => {
        const newSet = new Set(prev);
        newSet.add(repoId);
        return newSet;
      });

      // Update the repository lists to mark it as starred
      const updateRepoList = (repos: Repository[]) =>
        repos.map((r) => (r.id === repoId ? { ...r, is_starred: true } : r));

      setRepositories(updateRepoList);
      setSearchResults(updateRepoList);
      setStarredRepositories(updateRepoList);
    } catch (err) {
      console.error('Failed to star repository:', err);
      alert(`Failed to star repository: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleUnstar = async (repoId: number) => {
    try {
      // Find the repository to get owner and name
      const repo =
        repositories.find((r) => r.id === repoId) ||
        searchResults.find((r) => r.id === repoId) ||
        starredRepositories.find((r) => r.id === repoId);

      if (!repo) {
        throw new Error('Repository not found');
      }

      // Show confirmation dialog
      const confirmMessage = `Are you sure you want to unstar "${repo.name}" on GitHub?\n\nNote: Due to GitHub API delays, this repository may briefly reappear if you refresh the page. The change typically syncs within 30-45 seconds.`;
      if (!window.confirm(confirmMessage)) {
        return;
      }

      // Unstar the repository on GitHub
      await unstarRepository(session, repo.owner.login, repo.name);

      // Add to locally unstarred list to hide until GitHub API syncs
      addToLocallyUnstarred(repoId);

      // Update local state to reflect the change immediately
      setFollowedRepos((prev) => {
        const newSet = new Set(prev);
        newSet.delete(repoId);
        return newSet;
      });

      // For search results, update the star status
      const updateSearchResults = (repos: Repository[]) =>
        repos.map((r) =>
          r.id === repoId ? { ...r, is_starred: false, starred_at: undefined } : r
        );

      // For starred repositories list, REMOVE the unstarred repo entirely
      const removeFromStarred = (repos: Repository[]) => repos.filter((r) => r.id !== repoId);

      // If we're not in a search (showing starred repos), remove the repo from view
      if (!searchQuery) {
        setRepositories(filterOutLocallyUnstarred(removeFromStarred(repositories)));
      } else {
        // In search mode, just update the star status and apply filtering
        setRepositories(filterOutLocallyUnstarred(updateSearchResults(repositories)));
      }

      setSearchResults(updateSearchResults(searchResults));
      setStarredRepositories(removeFromStarred(starredRepositories));
    } catch (err) {
      console.error('Failed to unstar repository:', err);
      alert(`Failed to unstar repository: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Keep the old handlers as aliases for compatibility
  const handleFollow = handleStar;
  const handleUnfollow = handleUnstar;

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
          itemsPerPage={30}
        />
      </div>
    </div>
  );
};

export default Dashboard;
