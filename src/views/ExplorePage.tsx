import { useState } from 'react';
import { GlobeAltIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { useInfiniteSearch } from '../hooks/useInfiniteSearch';
import { RepositoryContent } from '../components/RepositoryContent';
import { PageHeader } from '../components/PageHeader';
import type { SortOption } from '../components/SortDropdown';

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

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveSearch('');
  };

  const getSubtitle = () => {
    if (!hasActiveSearch) return undefined;
    if (result.isLoading) return undefined;
    const total = result.totalCount;
    if (total === 0) return undefined;
    return total === 1 ? '1 repository' : `${total.toLocaleString()} repositories`;
  };

  const preSearchState = (
    <div className="text-center py-16">
      <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
      <p className="mt-4 text-lg font-medium text-gray-900">Discover repositories</p>
      <p className="text-sm text-gray-400 mt-2">
        Search across all of GitHub to find interesting projects
      </p>
    </div>
  );

  const renderFooter = () => {
    const count = result.repositories.length;
    return <p>{count === 1 ? '1 repository' : `${count} repositories`}</p>;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        title="Explore"
        titleIcon={<GlobeAltIcon className="h-7 w-7 text-indigo-600" aria-hidden="true" />}
        subtitle={getSubtitle()}
        showSearchBar={true}
        searchId="explore-search"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={setActiveSearch}
        searchPlaceholder="Search all GitHub repositories..."
        sortValue={sortBy}
        onSortChange={handleSortChange}
        sortOptions={SORT_OPTIONS}
        sortDisabled={hasActiveSearch && !result.isLoading && result.totalCount === 0}
      />

      <RepositoryContent
        repositories={result.repositories}
        isLoading={result.isLoading}
        error={result.error}
        hasActiveSearch={hasActiveSearch}
        onClearSearch={handleClearSearch}
        preSearchState={preSearchState}
        isFetchingMore={result.isFetchingNextPage}
        hasMore={result.hasNextPage}
        onLoadMore={result.fetchNextPage}
        sortBy={sortBy}
        footer={renderFooter()}
      />
    </div>
  );
};

export default ExplorePage;
