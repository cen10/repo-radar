import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePaginatedStarredRepositories } from '../hooks/usePaginatedStarredRepositories';
import { useInfiniteSearch } from '../hooks/useInfiniteSearch';
import RepositoryList, { type SortOption } from '../components/RepositoryList';

// Sort options for Stars page (browsing supports 'updated' and 'created')
type StarsSortOption = 'updated' | 'created';

const SORT_OPTIONS = [
  { value: 'updated' as const, label: 'Recently Updated' },
  { value: 'created' as const, label: 'Recently Starred' },
];

const StarsPage = () => {
  const { providerToken } = useAuth();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [sortBy, setSortBy] = useState<StarsSortOption>('updated');

  // Determine if we're in search mode
  const isSearchMode = activeSearch.trim().length > 0;

  // Hook for browsing starred repos (no search)
  const browseResult = usePaginatedStarredRepositories({
    token: providerToken,
    sortBy,
    enabled: !isSearchMode,
  });

  // Hook for searching within starred repos
  const searchResult = useInfiniteSearch({
    token: providerToken,
    query: activeSearch,
    mode: 'starred',
    sortBy,
    enabled: isSearchMode,
  });

  // Select the appropriate result based on mode
  const result = isSearchMode ? searchResult : browseResult;

  const handleSortChange = (newSort: SortOption) => {
    // Only allow valid sort options for stars page
    if (newSort === 'updated' || newSort === 'created') {
      setSortBy(newSort);
    }
  };

  // Compute empty state message based on whether user is searching
  const emptyMessage = 'No repositories found';
  const emptyHint = isSearchMode
    ? 'Try a different search term'
    : 'Star some repositories on GitHub to see them here';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <RepositoryList
        title="My Stars"
        repositories={result.repositories}
        isLoading={result.isLoading}
        isFetchingMore={result.isFetchingNextPage}
        hasMore={result.hasNextPage}
        error={result.error}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={setActiveSearch}
        isSearching={isSearchMode && result.isLoading}
        hasActiveSearch={isSearchMode}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        onLoadMore={result.fetchNextPage}
        searchPlaceholder="Search your starred repositories..."
        sortOptions={SORT_OPTIONS}
        emptyMessage={emptyMessage}
        emptyHint={emptyHint}
        totalStarred={isSearchMode ? searchResult.totalStarred : undefined}
      />
    </div>
  );
};

export default StarsPage;
