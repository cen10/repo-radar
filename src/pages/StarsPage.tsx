import { useState } from 'react';
import { StarIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { useBrowseStarred } from '../hooks/useBrowseStarred';
import { useInfiniteSearch } from '../hooks/useInfiniteSearch';
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

  const handleSortChange = (newSort: SortOption) => {
    if (newSort === 'updated' || newSort === 'created') {
      setSortBy(newSort);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900 mb-6">
        <StarIcon className="h-7 w-7 text-indigo-600" aria-hidden="true" />
        My Stars
      </h1>

      {/* Search and Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <CollapsibleSearch
          id="stars-search"
          value={searchQuery}
          onChange={setSearchQuery}
          onSubmit={setActiveSearch}
          placeholder="Search your starred repositories..."
        />
        <SortDropdown value={sortBy} onChange={handleSortChange} options={SORT_OPTIONS} />
      </div>

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
  );
};

export default StarsPage;
