import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePaginatedStarredRepositories } from '../hooks/usePaginatedStarredRepositories';
import { useInfiniteSearch } from '../hooks/useInfiniteSearch';
import RepositoryListPage from '../components/RepositoryListPage';
import { type SortOption } from '../components/RepositoryList';

// Sort options for Stars page (browsing supports 'updated' and 'created')
type StarsSortOption = 'updated' | 'created';

const SORT_OPTIONS = [
  { value: 'updated' as const, label: 'Recently Updated' },
  { value: 'created' as const, label: 'Recently Starred' },
];

const StarsPage = () => {
  const { providerToken, loading: authLoading, user } = useAuth();

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
    enabled: !authLoading && !!user && !isSearchMode,
  });

  // Hook for searching within starred repos
  const searchResult = useInfiniteSearch({
    token: providerToken,
    query: activeSearch,
    mode: 'starred',
    sortBy,
    enabled: !authLoading && !!user && isSearchMode,
  });

  // Select the appropriate result based on mode
  const result = isSearchMode ? searchResult : browseResult;

  const handleSortChange = (newSort: SortOption) => {
    // Only allow valid sort options for stars page
    if (newSort === 'updated' || newSort === 'created') {
      setSortBy(newSort);
    }
  };

  return (
    <RepositoryListPage
      title="My Stars"
      searchPlaceholder="Search your starred repositories..."
      emptyStateMessage="No repositories found"
      emptyStateHint="Star some repositories on GitHub to see them here"
      result={result}
      sortOptions={SORT_OPTIONS}
      sortBy={sortBy}
      onSortChange={handleSortChange}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onSearchSubmit={setActiveSearch}
      hasActiveSearch={isSearchMode}
      isSearching={isSearchMode && result.isLoading}
      totalStarred={isSearchMode ? searchResult.totalStarred : undefined}
      fetchedStarredCount={isSearchMode ? searchResult.fetchedStarredCount : undefined}
    />
  );
};

export default StarsPage;
