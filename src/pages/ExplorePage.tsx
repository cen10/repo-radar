import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useInfiniteSearch } from '../hooks/useInfiniteSearch';
import RepositoryList, { type SortOption } from '../components/RepositoryList';
import { LoadingSpinner } from '../components/icons';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { isGitHubAuthError } from '../utils/error';
import { logger } from '../utils/logger';

// Sort options for Explore page (GitHub search API sort options)
type ExploreSortOption = 'best-match' | 'updated' | 'stars' | 'forks' | 'help-wanted';

const SORT_OPTIONS = [
  { value: 'best-match' as const, label: 'Best Match' },
  { value: 'updated' as const, label: 'Recently Updated' },
  { value: 'stars' as const, label: 'Most Stars' },
  { value: 'forks' as const, label: 'Most Forks' },
  { value: 'help-wanted' as const, label: 'Help Wanted' },
];

const ExplorePage = () => {
  const { user, providerToken, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [sortBy, setSortBy] = useState<ExploreSortOption>('best-match');

  // Whether user has submitted a search
  const hasActiveSearch = activeSearch.trim().length > 0;

  // Hook for searching all GitHub repos
  const result = useInfiniteSearch({
    token: providerToken,
    query: activeSearch,
    mode: 'all',
    sortBy,
    enabled: !authLoading && !!user && hasActiveSearch,
  });

  // Auto-signout on GitHub auth error (invalid/expired token)
  useEffect(() => {
    if (isGitHubAuthError(result.error)) {
      logger.info('GitHub token invalid, signing out user');
      sessionStorage.setItem('session_expired', 'true');
      void signOut();
    }
  }, [result.error, signOut]);

  useEffect(() => {
    if (!authLoading && !user) {
      void navigate('/');
    }
  }, [user, authLoading, navigate]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleSearchSubmit = (query: string) => {
    setActiveSearch(query);
  };

  const handleSortChange = (newSort: SortOption) => {
    // Only allow valid sort options for explore page
    if (
      newSort === 'best-match' ||
      newSort === 'updated' ||
      newSort === 'stars' ||
      newSort === 'forks' ||
      newSort === 'help-wanted'
    ) {
      setSortBy(newSort);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status">
        <LoadingSpinner className="h-12 w-12 text-indigo-600" />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  if (!user) return null;

  // Show initial state prompting user to search (before any search is made)
  if (!hasActiveSearch) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Explore</h1>

        {/* Search */}
        <form
          className="mb-6"
          onSubmit={(e) => {
            e.preventDefault();
            handleSearchSubmit(searchQuery);
          }}
        >
          <div className="flex">
            <label htmlFor="explore-search" className="sr-only">
              Search all GitHub repositories
            </label>
            <input
              id="explore-search"
              name="search"
              type="text"
              placeholder="Search all GitHub repositories..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-500"
              autoFocus
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white border border-indigo-600 rounded-r-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
            >
              <MagnifyingGlassIcon className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Search</span>
            </button>
          </div>
        </form>

        {/* Empty state */}
        <div className="text-center py-16">
          <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-medium text-gray-900">Discover repositories</h2>
          <p className="mt-2 text-sm text-gray-500">
            Search across all of GitHub to find interesting projects.
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Try searching for topics like "react", "machine learning", or "rust cli"
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <RepositoryList
        repositories={result.repositories}
        isLoading={result.isLoading}
        isFetchingMore={result.isFetchingNextPage}
        hasMore={result.hasNextPage}
        error={result.error}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onSearchSubmit={handleSearchSubmit}
        isSearching={result.isLoading}
        hasActiveSearch={hasActiveSearch}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        onLoadMore={result.fetchNextPage}
        title="Explore"
        searchPlaceholder="Search all GitHub repositories..."
        sortOptions={SORT_OPTIONS}
        emptyStateMessage="No repositories found"
        emptyStateHint="Try a different search term"
      />
    </div>
  );
};

export default ExplorePage;
