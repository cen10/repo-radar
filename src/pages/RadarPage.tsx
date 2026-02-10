import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import {
  ArrowLeftIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { useRadar } from '../hooks/useRadar';
import { useRadarRepositories } from '../hooks/useRadarRepositories';
import { DeleteRadarModal } from '../components/DeleteRadarModal';
import { RenameRadarModal } from '../components/RenameRadarModal';
import { RepoCard } from '../components/RepoCard';
import { CollapsibleSearch } from '../components/CollapsibleSearch';
import { SortDropdown } from '../components/SortDropdown';
import { LoadingSpinner, StaticRadarIcon } from '../components/icons';
import { EmptyRadarState, NoSearchResultsState } from '../components/EmptyState';
import type { Repository } from '../types';

type RadarSortOption = 'updated' | 'stars';

const SORT_OPTIONS = [
  { value: 'updated' as const, label: 'Recently Updated' },
  { value: 'stars' as const, label: 'Most Stars' },
];

const RadarPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { providerToken } = useAuth();

  // Data fetching
  const {
    radar,
    isLoading: radarLoading,
    error: radarError,
    isNotFound,
  } = useRadar({ radarId: id });

  const {
    repositories,
    isLoading: reposLoading,
    error: reposError,
  } = useRadarRepositories({
    radarId: id,
    token: providerToken,
    enabled: !!radar,
  });

  // Search & sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [sortBy, setSortBy] = useState<RadarSortOption>('updated');

  // Modal state
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Client-side search filtering
  const filteredRepos = useMemo(() => {
    const query = activeSearch.trim().toLowerCase();
    if (!query) return repositories;
    return repositories.filter(
      (repo) =>
        repo.name.toLowerCase().includes(query) ||
        repo.description?.toLowerCase().includes(query) ||
        repo.language?.toLowerCase().includes(query) ||
        repo.topics.some((t) => t.toLowerCase().includes(query))
    );
  }, [repositories, activeSearch]);

  // Client-side sorting
  const sortedRepos = useMemo(() => {
    return [...filteredRepos].sort((a, b) =>
      sortBy === 'stars'
        ? b.stargazers_count - a.stargazers_count
        : new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }, [filteredRepos, sortBy]);

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveSearch('');
  };

  const handleRenameClick = () => {
    setIsRenameModalOpen(true);
  };

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  const handleDeleted = () => {
    void navigate('/stars');
  };

  const isLoading = radarLoading || reposLoading;
  const error = radarError || reposError;
  const hasActiveSearch = activeSearch.trim().length > 0;

  // Loading state
  if (isLoading && !radar) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center min-h-[400px]" role="status">
          <LoadingSpinner className="h-12 w-12 text-indigo-600" />
          <span className="sr-only">Loading radar...</span>
        </div>
      </div>
    );
  }

  // Not found state
  if (isNotFound) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-16">
          <h1 className="text-2xl font-semibold text-gray-900">Radar not found</h1>
          <p className="mt-2 text-gray-500">
            This radar doesn't exist or you don't have access to it.
          </p>
          <Link
            to="/stars"
            className="mt-6 inline-block text-indigo-600 hover:text-indigo-700 font-medium"
          >
            <ArrowLeftIcon className="inline h-4 w-4" aria-hidden="true" /> Back to My Stars
          </Link>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12" role="alert">
          <p className="text-red-600 mb-4">Error loading radar</p>
          <p className="text-sm text-gray-600 mb-4">{error.message}</p>
          <Link to="/stars" className="text-indigo-600 hover:text-indigo-700 font-medium">
            <ArrowLeftIcon className="inline h-4 w-4" aria-hidden="true" /> Back to My Stars
          </Link>
        </div>
      </div>
    );
  }

  // Radar loaded successfully
  const repoCount = repositories.length;
  const repoText = repoCount === 1 ? '1 repository' : `${repoCount} repositories`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with radar name and kebab menu */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
            <StaticRadarIcon className="h-7 w-7 text-indigo-600" />
            {radar?.name}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{repoText}</p>
        </div>

        <Menu as="div" className="relative" data-tour="radar-menu">
          <MenuButton className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <span className="sr-only">Open radar menu</span>
            <EllipsisVerticalIcon className="h-5 w-5" aria-hidden="true" />
          </MenuButton>

          <MenuItems
            transition
            className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none transition duration-100 ease-out data-closed:scale-95 data-closed:opacity-0"
          >
            <MenuItem>
              <button
                onClick={handleRenameClick}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100"
              >
                <PencilIcon className="h-4 w-4" aria-hidden="true" />
                Rename
              </button>
            </MenuItem>
            <MenuItem>
              <button
                onClick={handleDeleteClick}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 data-focus:bg-gray-100"
              >
                <TrashIcon className="h-4 w-4" aria-hidden="true" />
                Delete
              </button>
            </MenuItem>
          </MenuItems>
        </Menu>
      </div>

      {/* Search and Sort */}
      {repoCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <CollapsibleSearch
            id="radar-search"
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={setActiveSearch}
            placeholder="Search repositories in this radar..."
          />
          <SortDropdown value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
        </div>
      )}

      {/* Loading repos indicator */}
      {reposLoading && (
        <div className="flex justify-center items-center py-8" role="status">
          <LoadingSpinner className="h-8 w-8 text-indigo-600" />
          <span className="ml-3 text-gray-500">Loading repositories...</span>
        </div>
      )}

      {/* Empty radar state */}
      {!reposLoading && repoCount === 0 && <EmptyRadarState />}

      {/* No search results */}
      {!reposLoading && repoCount > 0 && sortedRepos.length === 0 && hasActiveSearch && (
        <NoSearchResultsState onClearSearch={handleClearSearch} />
      )}

      {/* Repository Grid */}
      {!reposLoading && sortedRepos.length > 0 && (
        <>
          <div
            data-tour="radar-repos"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {sortedRepos.map((repo: Repository, index: number) => (
              <RepoCard key={repo.id} repository={repo} isTourTarget={index === 0} />
            ))}
          </div>

          {/* Results count */}
          <div className="text-center py-4 text-gray-500">
            {hasActiveSearch ? (
              <p>
                {sortedRepos.length === 1
                  ? '1 repository found'
                  : `${sortedRepos.length} repositories found`}
              </p>
            ) : (
              <p>{repoText}</p>
            )}
          </div>
        </>
      )}

      {/* Rename Modal */}
      {isRenameModalOpen && radar && (
        <RenameRadarModal radar={radar} onClose={() => setIsRenameModalOpen(false)} />
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && radar && (
        <DeleteRadarModal
          radar={radar}
          repoCount={repoCount}
          onClose={() => setIsDeleteModalOpen(false)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
};

export default RadarPage;
