import { useState, useEffect } from 'react';
import { StarIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { useBrowseStarred } from '../hooks/useBrowseStarred';
import { useInfiniteSearch } from '../hooks/useInfiniteSearch';
import { useOnboarding } from '../contexts/use-onboarding';
import RepositoryList, { type SortOption } from '../components/RepositoryList';
import { NoStarredReposState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';

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

  const showSearchBar =
    isSearchMode || browseResult.isLoading || browseResult.repositories.length > 0;

  const repoCount = browseResult.repositories.length;
  const repoText =
    repoCount === 0 ? undefined : repoCount === 1 ? '1 repository' : `${repoCount} repositories`;

  const handleSortChange = (newSort: SortOption) => {
    if (newSort === 'updated' || newSort === 'created') {
      setSortBy(newSort);
    }
  };

  // Auto-start tour for new desktop users once data has loaded
  // Tour is desktop-only (matches lg: breakpoint)
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;

  useEffect(() => {
    if (!browseResult.isLoading && !hasCompletedTour && !isTourActive && isDesktop) {
      startTour();
    }
  }, [browseResult.isLoading, hasCompletedTour, isTourActive, startTour, isDesktop]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        title="My Stars"
        titleIcon={<StarIcon className="h-7 w-7 text-indigo-600" aria-hidden="true" />}
        titleTourId="my-stars-heading"
        subtitle={repoText}
        showSearchBar={showSearchBar}
        searchId="stars-search"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={setActiveSearch}
        searchPlaceholder="Search your starred repositories..."
        sortValue={sortBy}
        onSortChange={handleSortChange}
        sortOptions={SORT_OPTIONS}
      />

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
