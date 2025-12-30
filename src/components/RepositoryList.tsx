import React, { useState, useMemo } from 'react';
import type { Repository } from '../types';
import { RepoCard } from './RepoCard';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export type SortOption = 'stars' | 'activity' | 'name' | 'issues';
export type FilterOption = 'all' | 'trending' | 'active';

interface RepositoryListProps {
  repositories: Repository[];
  isLoading?: boolean;
  error?: Error | null;
  onFollow?: (repoId: number) => void;
  onUnfollow?: (repoId: number) => void;
  followedRepos?: Set<number>;
  itemsPerPage?: number;
}

const RepositoryList: React.FC<RepositoryListProps> = ({
  repositories,
  isLoading = false,
  error = null,
  onFollow,
  onUnfollow,
  followedRepos = new Set(),
  itemsPerPage = 12,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>('activity');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // TODO: When this component moves to its own page and integrates with GitHub API search,
  // add debouncing (300-500ms) to prevent excessive API calls. Current implementation
  // filters local data only, so debouncing would hurt UX. Consider implementing
  // two search modes: 'local' (instant) and 'github' (debounced API search).

  // Filter repositories
  const filteredRepos = useMemo(() => {
    let filtered = [...repositories];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (repo) =>
          repo.name.toLowerCase().includes(query) ||
          repo.full_name.toLowerCase().includes(query) ||
          repo.description?.toLowerCase().includes(query) ||
          repo.language?.toLowerCase().includes(query) ||
          repo.topics.some((topic) => topic.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    switch (filterBy) {
      case 'trending':
        // Repos with significant star growth (placeholder logic)
        filtered = filtered.filter((repo) => repo.stargazers_count > 100);
        break;
      case 'active':
        // Recently pushed to
        filtered = filtered.filter((repo) => {
          if (!repo.pushed_at) return false;
          return new Date(repo.pushed_at) > oneWeekAgo;
        });
        break;
      default:
        // 'all' - no additional filtering
        break;
    }

    return filtered;
  }, [repositories, searchQuery, filterBy]);

  // Sort repositories
  const sortedRepos = useMemo(() => {
    const sorted = [...filteredRepos];

    switch (sortBy) {
      case 'stars':
        sorted.sort((a, b) => b.stargazers_count - a.stargazers_count);
        break;
      case 'activity':
        sorted.sort((a, b) => {
          const aDate = new Date(a.pushed_at || a.updated_at);
          const bDate = new Date(b.pushed_at || b.updated_at);
          return bDate.getTime() - aDate.getTime();
        });
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'issues':
        sorted.sort((a, b) => b.open_issues_count - a.open_issues_count);
        break;
    }

    return sorted;
  }, [filteredRepos, sortBy]);

  // Pagination
  const totalPages = Math.ceil(sortedRepos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRepos = sortedRepos.slice(startIndex, endIndex);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"
          role="status"
          aria-label="Loading"
        >
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Error loading repositories</p>
        <p className="text-sm text-gray-600">{error.message}</p>
      </div>
    );
  }

  // Empty state - no repositories at all
  if (repositories.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No repositories found</p>
        <p className="text-sm text-gray-400 mt-2">
          Star some repositories on GitHub to see them here
        </p>
      </div>
    );
  }

  // Controls - rendered once above conditional branches
  const controls = (
    <div className="bg-white shadow rounded-lg p-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <label htmlFor="repo-search" className="sr-only">
            Search repositories
          </label>
          <input
            id="repo-search"
            type="text"
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-500"
          />
        </div>

        {/* Filter */}
        <select
          value={filterBy}
          onChange={(e) => {
            setFilterBy(e.target.value as FilterOption);
            setCurrentPage(1);
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
          aria-label="Filter repositories"
        >
          <option value="all">All Repositories</option>
          <option value="trending">Trending</option>
          <option value="active">Recently Active</option>
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as SortOption);
            setCurrentPage(1);
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
          aria-label="Sort repositories"
        >
          <option value="activity">Recent Activity</option>
          <option value="stars">Stars</option>
          <option value="name">Name</option>
          <option value="issues">Open Issues</option>
        </select>
      </div>

      {/* Results count - only show when there are results */}
      {sortedRepos.length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          Showing {startIndex + 1}-{Math.min(endIndex, sortedRepos.length)} of {sortedRepos.length}{' '}
          repositories
        </div>
      )}
    </div>
  );

  // No results after filtering
  if (sortedRepos.length === 0) {
    return (
      <div className="space-y-6">
        {controls}
        <div className="text-center py-12">
          <p className="text-gray-500">No repositories match your filters</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterBy('all');
              setCurrentPage(1);
            }}
            className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Clear filters
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {controls}

      {/* Repository Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentRepos.map((repo) => {
          const repoWithFollowState = {
            ...repo,
            is_following: followedRepos.has(repo.id),
          };
          return (
            <RepoCard
              key={repo.id}
              repository={repoWithFollowState}
              onToggleFollow={
                onFollow && onUnfollow
                  ? () => {
                      if (followedRepos.has(repo.id)) {
                        onUnfollow(repo.id);
                      } else {
                        onFollow(repo.id);
                      }
                    }
                  : undefined
              }
            />
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 sm:px-6 rounded-lg shadow">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Page <span className="font-medium">{currentPage}</span> of{' '}
                <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav
                className="isolate inline-flex -space-x-px rounded-md shadow-sm"
                aria-label="Pagination"
              >
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                </button>

                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                        currentPage === pageNum
                          ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepositoryList;
