import { useState, useEffect } from 'react';
import { StarIcon } from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useAuthErrorHandler } from '../hooks/useAuthErrorHandler';
import { useBrowseStarred } from '../hooks/useBrowseStarred';
import { useInfiniteSearch } from '../hooks/useInfiniteSearch';
import { useOnboarding } from '../contexts/use-onboarding';
import { fetchStarredRepoCount, MAX_STARRED_REPOS } from '../services/github';
import { getValidGitHubToken, hasFallbackToken } from '../services/github-token';
import { RepositoryContent } from '../components/RepositoryContent';
import { NoStarredReposState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import type { SortOption } from '../components/SortDropdown';

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

  // Fetch total starred count (efficient HEAD request)
  const { data: totalStarredCount, error: countError } = useQuery({
    queryKey: ['starredRepoCount', providerToken],
    queryFn: () => fetchStarredRepoCount(getValidGitHubToken(providerToken)),
    enabled: !!providerToken || hasFallbackToken(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useAuthErrorHandler(countError, 'starredRepoCount');

  const result = isSearchMode ? searchResult : browseResult;

  const showSearchBar =
    isSearchMode ||
    browseResult.isLoading ||
    browseResult.repositories.length > 0 ||
    !!browseResult.error;

  const getSubtitle = () => {
    if (isSearchMode) {
      if (searchResult.isLoading) return undefined;
      const total = searchResult.totalCount;
      if (total === 0) return undefined;
      return total === 1 ? '1 result' : `${total.toLocaleString()} results`;
    }
    if (totalStarredCount === undefined) return undefined;
    if (totalStarredCount === 0) return undefined;
    return totalStarredCount === 1 ? '1 repository' : `${totalStarredCount} repositories`;
  };

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

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveSearch('');
  };

  const totalStarred = isSearchMode ? searchResult.totalStarred : undefined;

  const renderFooter = () => {
    const count = result.repositories.length;
    if (totalStarred && totalStarred > MAX_STARRED_REPOS) {
      return (
        <>
          <p>{count === 1 ? '1 repository' : `${count} repositories`}</p>
          <p className="text-sm mt-1">
            {`Searched ${MAX_STARRED_REPOS} of ${totalStarred} starred repos. `}
            <a
              href="https://github.com/stars"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-700"
            >
              View all on GitHub
            </a>
          </p>
        </>
      );
    }
    return <p>{count === 1 ? '1 repository' : `${count} repositories`}</p>;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        title="My Stars"
        titleIcon={<StarIcon className="h-7 w-7 text-indigo-600" aria-hidden="true" />}
        titleTourId="my-stars-heading"
        subtitle={getSubtitle()}
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

      <RepositoryContent
        repositories={result.repositories}
        isLoading={result.isLoading}
        error={result.error}
        hasActiveSearch={isSearchMode}
        onClearSearch={handleClearSearch}
        emptyState={<NoStarredReposState />}
        isFetchingMore={result.isFetchingNextPage}
        hasMore={result.hasNextPage}
        onLoadMore={result.fetchNextPage}
        sortBy={sortBy}
        footer={renderFooter()}
      />
    </div>
  );
};

export default StarsPage;
