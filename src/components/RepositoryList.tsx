import React, { useState, useMemo } from 'react';
import type { Repository } from '../types';
import { RepoCard } from './RepoCard';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

export type SortOption =
  | 'stars-desc'
  | 'stars-asc'
  | 'activity-desc'
  | 'activity-asc'
  | 'name-asc'
  | 'name-desc'
  | 'issues-desc'
  | 'issues-asc';
export type FilterOption = 'all' | 'starred';

interface RepositoryListProps {
  repositories: Repository[];
  isLoading?: boolean;
  error?: Error | null;
  onStar: (repo: Repository) => void;
  onUnstar: (repo: Repository) => void;
  itemsPerPage?: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (query: string) => void;
  isSearching?: boolean;
  filterBy: FilterOption;
  onFilterChange: (filter: FilterOption) => void;
  // Props for prepaginated data that Dashboard provides when the Github search api is used
  currentPage?: number;
  totalPages?: number;
  hasMoreResults?: boolean;
  onPrepaginatedPageChange: (page: number) => void;
  apiSearchResultTotal?: number;
  // When true, caller provides pre-paginated data. When false, RepositoryList paginates internally.
  dataIsPrepaginated: boolean;
}

const RepositoryList: React.FC<RepositoryListProps> = ({
  repositories,
  isLoading = false,
  error = null,
  onStar,
  onUnstar,
  itemsPerPage = 12,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  isSearching = false,
  dataIsPrepaginated,
  filterBy,
  onFilterChange,
  // Search pagination props
  currentPage: propCurrentPage = 1,
  totalPages: propTotalPages = 0,
  hasMoreResults = false,
  onPrepaginatedPageChange,
  // Additional pagination info for enhanced display
  apiSearchResultTotal,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>('stars-desc');

  // TODO: Replace native select elements with Headless UI Listbox components for better
  // control over styling and positioning of dropdown arrows. Native selects have
  // browser-controlled arrow positioning that can appear too close to the edge.

  const getActivityDate = (repo: Repository): number =>
    new Date(repo.pushed_at || repo.updated_at).getTime();

  const sortedRepos = useMemo(() => {
    const sorted = [...repositories];

    switch (sortBy) {
      case 'stars-desc':
        sorted.sort((a, b) => b.stargazers_count - a.stargazers_count);
        break;
      case 'stars-asc':
        sorted.sort((a, b) => a.stargazers_count - b.stargazers_count);
        break;
      case 'activity-desc':
        sorted.sort((a, b) => getActivityDate(b) - getActivityDate(a));
        break;
      case 'activity-asc':
        sorted.sort((a, b) => getActivityDate(a) - getActivityDate(b));
        break;
      case 'name-asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'issues-desc':
        sorted.sort((a, b) => b.open_issues_count - a.open_issues_count);
        break;
      case 'issues-asc':
        sorted.sort((a, b) => a.open_issues_count - b.open_issues_count);
        break;
    }

    return sorted;
  }, [repositories, sortBy]);

  // Pagination logic differs based on whether caller provides pre-paginated data
  let totalPages: number;
  let currentRepos: Repository[];
  let activePage: number;

  if (dataIsPrepaginated) {
    // Dashboard provides pre-paginated data
    if (propTotalPages > 0) {
      totalPages = propTotalPages;
    } else if (apiSearchResultTotal !== undefined && itemsPerPage) {
      // Calculate from API data if available
      totalPages = Math.ceil(apiSearchResultTotal / itemsPerPage);
    } else {
      // Fallback to legacy logic
      totalPages = hasMoreResults ? propCurrentPage + 1 : propCurrentPage;
    }
    currentRepos = sortedRepos; // All results from current search page
    activePage = propCurrentPage;
  } else {
    // Full array provided; RepositoryList slices per page
    totalPages = Math.ceil(sortedRepos.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    currentRepos = sortedRepos.slice(startIndex, endIndex);
    activePage = currentPage;
  }

  // Loading state (only show spinner for initial load, not search)
  if (isLoading && !isSearching) {
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
    const isGitHubAuthError = error.message.includes('session has expired');

    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Error loading repositories</p>
        <p className="text-sm text-gray-600 mb-4">{error.message}</p>
        {isGitHubAuthError && (
          <a
            href="/"
            className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Sign Out and Reconnect
          </a>
        )}
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
        <form
          className="flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const query = formData.get('search') as string;
            onSearchSubmit(query);
            setCurrentPage(1);
          }}
        >
          <div className="flex">
            <label htmlFor="repo-search" className="sr-only">
              Search repositories
            </label>
            <input
              id="repo-search"
              name="search"
              type="text"
              placeholder='Search repositories... (use "quotes" for exact name match)'
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white border border-indigo-600 rounded-r-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
            >
              <MagnifyingGlassIcon className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Search</span>
            </button>
          </div>
        </form>

        {/* Filter */}
        <select
          value={filterBy}
          onChange={(e) => {
            onFilterChange(e.target.value as FilterOption);
            setCurrentPage(1);
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 cursor-pointer"
          aria-label="Filter repositories"
        >
          <option value="all">All Repositories</option>
          <option value="starred">Starred Only</option>
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as SortOption);
            setCurrentPage(1);
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 cursor-pointer"
          aria-label="Sort repositories"
        >
          <option value="stars-desc">Stars (DESC)</option>
          <option value="stars-asc">Stars (ASC)</option>
          <option value="activity-desc">Recent Activity (DESC)</option>
          <option value="activity-asc">Recent Activity (ASC)</option>
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
          <option value="issues-desc">Open Issues (Most)</option>
          <option value="issues-asc">Open Issues (Least)</option>
        </select>
      </div>

      {/* Hidden aria-live region for screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {sortedRepos.length === 0 && (searchQuery || filterBy !== 'all') ? (
          <>No repositories match your filters</>
        ) : null}
      </div>
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
              onSearchChange('');
              onFilterChange('all');
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
        {isSearching && (
          <div className="col-span-full text-center py-4">
            <span className="text-gray-500">Searching GitHub...</span>
          </div>
        )}
        {!isSearching &&
          currentRepos.map((repo) => (
            <RepoCard
              key={repo.id}
              repository={repo}
              onToggleStar={() => {
                if (repo.is_starred) {
                  onUnstar(repo);
                } else {
                  onStar(repo);
                }
              }}
            />
          ))}
      </div>

      {/* Pagination - Hide when 0 results or 1-10 results in single page */}
      {totalPages > 1 && sortedRepos.length > 0 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 sm:px-6 rounded-lg shadow">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => {
                if (dataIsPrepaginated) {
                  onPrepaginatedPageChange(Math.max(1, activePage - 1));
                } else {
                  setCurrentPage((prev) => Math.max(1, prev - 1));
                }
              }}
              disabled={activePage === 1}
              className="relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => {
                if (dataIsPrepaginated) {
                  const nextPage = activePage + 1;
                  if (hasMoreResults || nextPage <= totalPages) {
                    onPrepaginatedPageChange(nextPage);
                  }
                } else {
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                }
              }}
              disabled={
                dataIsPrepaginated
                  ? !hasMoreResults && activePage >= totalPages
                  : activePage === totalPages
              }
              className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-center">
            <div>
              <nav
                className="isolate inline-flex -space-x-px rounded-md shadow-sm"
                aria-label="Pagination"
              >
                <button
                  onClick={() => {
                    if (dataIsPrepaginated) {
                      onPrepaginatedPageChange(Math.max(1, activePage - 1));
                    } else {
                      setCurrentPage((prev) => Math.max(1, prev - 1));
                    }
                  }}
                  disabled={activePage === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                </button>

                {/* Page numbers with ellipsis */}
                {totalPages > 1 &&
                  (() => {
                    const pages = [];
                    const maxVisiblePages = 7;

                    if (totalPages <= maxVisiblePages) {
                      // Show all pages if we have 7 or fewer
                      for (let i = 1; i <= totalPages; i++) {
                        pages.push(i);
                      }
                    } else {
                      // Always show first page
                      pages.push(1);

                      // Logic for middle pages and ellipsis
                      if (activePage <= 4) {
                        // Near the beginning: 1, 2, 3, 4, 5, ..., last
                        for (let i = 2; i <= 5; i++) {
                          pages.push(i);
                        }
                        pages.push('ellipsis');
                        pages.push(totalPages);
                      } else if (activePage >= totalPages - 3) {
                        // Near the end: 1, ..., last-4, last-3, last-2, last-1, last
                        pages.push('ellipsis');
                        for (let i = totalPages - 4; i <= totalPages; i++) {
                          pages.push(i);
                        }
                      } else {
                        // In the middle: 1, ..., current-1, current, current+1, ..., last
                        pages.push('ellipsis');
                        for (let i = activePage - 1; i <= activePage + 1; i++) {
                          pages.push(i);
                        }
                        pages.push('ellipsis');
                        pages.push(totalPages);
                      }
                    }

                    return pages.map((page, index) => {
                      if (page === 'ellipsis') {
                        return (
                          <span
                            key={`ellipsis-${index}`}
                            className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700"
                          >
                            ...
                          </span>
                        );
                      }

                      const pageNum = page as number;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => {
                            if (dataIsPrepaginated) {
                              onPrepaginatedPageChange(pageNum);
                            } else {
                              setCurrentPage(pageNum);
                            }
                          }}
                          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                            activePage === pageNum
                              ? 'z-10 bg-indigo-600 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                              : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    });
                  })()}

                <button
                  onClick={() => {
                    if (dataIsPrepaginated) {
                      const nextPage = activePage + 1;
                      if (hasMoreResults || nextPage <= totalPages) {
                        onPrepaginatedPageChange(nextPage);
                      }
                    } else {
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                    }
                  }}
                  disabled={
                    dataIsPrepaginated
                      ? !hasMoreResults && activePage >= totalPages
                      : activePage === totalPages
                  }
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
