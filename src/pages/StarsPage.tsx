import { useState, useEffect } from 'react';
import { StarIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { useBrowseStarred } from '../hooks/useBrowseStarred';
import { useInfiniteSearch } from '../hooks/useInfiniteSearch';
import { useOnboarding } from '../contexts/onboarding-context';
import RepositoryList, { type SortOption } from '../components/RepositoryList';
import { NoStarredReposState } from '../components/EmptyState';
import { CollapsibleSearch } from '../components/CollapsibleSearch';
import { SortDropdown } from '../components/SortDropdown';

type StarsSortOption = 'updated' | 'created';

const SORT_OPTIONS = [
  { value: 'updated' as const, label: 'Recently Updated' },
  { value: 'created' as const, label: 'Recently Starred' },
];

const StarsPage = () => {
  const { providerToken } = useAuth();
  const { hasCompletedTour, isTourActive, startTour } = useOnboarding();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [sortBy, setSortBy] = useState<StarsSortOption>('updated');

  const isSearchMode = activeSearch.trim().length > 0;

  const browseResult = useBrowseStarred({
    token: providerToken,
    sortBy,
    enabled: !isSearchMode,
  });

  const searchResult = useInfiniteSearch({
    token: providerToken,
    query: activeSearch,
    mode: 'starred',
    sortBy,
    enabled: isSearchMode,
  });

  const result = isSearchMode ? searchResult : browseResult;

  // Hide search/sort when user has no starred repos (determined after browse loads).
  // Include !isSearchMode to prevent UI from disappearing if user searches during initial load.
  const showSearchAndSort =
    isSearchMode ||
    browseResult.isLoading ||
    browseResult.repositories.length > 0 ||
    browseResult.error;

  const handleSortChange = (newSort: SortOption) => {
    if (newSort === 'updated' || newSort === 'created') {
      setSortBy(newSort);
    }
  };

  // Auto-start tour for new users once data has loaded
  useEffect(() => {
    if (!browseResult.isLoading && !hasCompletedTour && !isTourActive) {
      const timer = setTimeout(startTour, 800);
      return () => clearTimeout(timer);
    }
  }, [browseResult.isLoading, hasCompletedTour, isTourActive, startTour]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with Search and Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
          <StarIcon className="h-7 w-7 text-indigo-600" aria-hidden="true" />
          My Stars
        </h1>

        {showSearchAndSort && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div data-tour="search">
              <CollapsibleSearch
                id="stars-search"
                value={searchQuery}
                onChange={setSearchQuery}
                onSubmit={setActiveSearch}
                placeholder="Search your starred repositories..."
              />
            </div>
            <div data-tour="sort">
              <SortDropdown value={sortBy} onChange={handleSortChange} options={SORT_OPTIONS} />
            </div>
          </div>
        )}
      </div>

      <div>
        <RepositoryList
          title="My Stars"
          titleIcon={<StarIcon className="h-7 w-7 text-indigo-600" aria-hidden="true" />}
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
          emptyState={<NoStarredReposState />}
          totalStarred={isSearchMode ? searchResult.totalStarred : undefined}
          hideSearch
          hideTitle
        />
      </div>
    </div>
  );
};

export default StarsPage;
