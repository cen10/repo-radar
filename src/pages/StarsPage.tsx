import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePaginatedStarredRepositories } from '../hooks/usePaginatedStarredRepositories';
import { useInfiniteSearch } from '../hooks/useInfiniteSearch';
import RepositoryList, { type SortOption } from '../components/RepositoryList';
import { LoadingSpinner } from '../components/icons';

// Sort options for Stars page (browsing supports 'updated' and 'created')
type StarsSortOption = 'updated' | 'created';

const SORT_OPTIONS = [
  { value: 'updated' as const, label: 'Recently Updated' },
  { value: 'created' as const, label: 'Recently Starred' },
];

const StarsPage = () => {
  const { user, providerToken, loading: authLoading } = useAuth();
  const navigate = useNavigate();

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
    // Only allow valid sort options for stars page
    if (newSort === 'updated' || newSort === 'created') {
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
        isSearching={isSearchMode && result.isLoading}
        hasActiveSearch={isSearchMode}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        onLoadMore={result.fetchNextPage}
        title="My Stars"
        searchPlaceholder="Search your starred repositories..."
        sortOptions={SORT_OPTIONS}
        emptyStateMessage="No repositories found"
        emptyStateHint="Star some repositories on GitHub to see them here"
      />
    </div>
  );
};

export default StarsPage;
