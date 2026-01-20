import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useInfiniteSearch } from '../hooks/useInfiniteSearch';
import RepositoryListPage from '../components/RepositoryListPage';
import { type SortOption } from '../components/RepositoryList';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

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
  const { providerToken, authLoading, user } = useAuth();

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

  const handleSearchSubmit = (query: string) => {
    setActiveSearch(query);
  };

  // Custom pre-search UI for Explore page
  const renderPreSearch = () => (
    <>
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
            onChange={(e) => setSearchQuery(e.target.value)}
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
    </>
  );

  return (
    <RepositoryListPage
      title="Explore"
      searchPlaceholder="Search all GitHub repositories..."
      emptyStateMessage="No repositories found"
      emptyStateHint="Try a different search term"
      result={result}
      sortOptions={SORT_OPTIONS}
      sortBy={sortBy}
      onSortChange={handleSortChange}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onSearchSubmit={handleSearchSubmit}
      hasActiveSearch={hasActiveSearch}
      isSearching={result.isLoading}
      renderPreSearch={renderPreSearch}
    />
  );
};

export default ExplorePage;
