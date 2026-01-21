import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useInfiniteSearch } from '../hooks/useInfiniteSearch';
import RepositoryList, { type SortOption } from '../components/RepositoryList';

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
  const { providerToken } = useAuth();

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
    enabled: hasActiveSearch,
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <RepositoryList
        title="Explore"
        repositories={hasActiveSearch ? result.repositories : null}
        isLoading={result.isLoading}
        isFetchingMore={result.isFetchingNextPage}
        hasMore={result.hasNextPage}
        error={result.error}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={setActiveSearch}
        isSearching={result.isLoading && hasActiveSearch}
        hasActiveSearch={hasActiveSearch}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        onLoadMore={result.fetchNextPage}
        searchPlaceholder="Search all GitHub repositories..."
        sortOptions={SORT_OPTIONS}
        emptyStateMessage="No repositories found"
        emptyStateHint="Try a different search term"
        preSearchMessage="Discover repositories"
        preSearchHint="Search across all of GitHub to find interesting projects"
      />
    </div>
  );
};

export default ExplorePage;
