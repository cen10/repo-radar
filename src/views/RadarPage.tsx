import { useState, useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { useRadar } from '../hooks/useRadar';
import { useRadarRepositories } from '../hooks/useRadarRepositories';
import { useOnboarding } from '../contexts/use-onboarding';
import { useDemoMode } from '../demo/use-demo-mode';
import { TOUR_RADAR_ID } from '../demo/tour-data';
import { RepositoryContent } from '../components/RepositoryContent';
import { PageHeader } from '../components/PageHeader';
import { LoadingSpinner, StaticRadarIcon } from '../components/icons';
import { EmptyRadarState } from '../components/EmptyState';
import type { SortOption } from '../components/SortDropdown';

type RadarSortOption = 'updated' | 'stars';

const SORT_OPTIONS = [
  { value: 'updated' as const, label: 'Recently Updated' },
  { value: 'stars' as const, label: 'Most Stars' },
];

const RadarPage = () => {
  const { id } = useParams<{ id: string }>();
  const { providerToken } = useAuth();
  const { isTourActive } = useOnboarding();
  const { isDemoMode } = useDemoMode();

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

  // Redirect away from tour demo radar when tour is not active (for logged-in users only).
  // In demo mode, the tour radar persists in the sidebar so it should remain accessible.
  if (id === TOUR_RADAR_ID && !isTourActive && !isDemoMode) {
    return <Navigate to="/stars" replace />;
  }

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveSearch('');
  };

  const handleSortChange = (newSort: SortOption) => {
    if (newSort === 'updated' || newSort === 'stars') {
      setSortBy(newSort);
    }
  };

  const hasActiveSearch = activeSearch.trim().length > 0;

  // Loading radar state (before radar metadata is loaded)
  if (radarLoading && !radar) {
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

  // Radar error state (radar fetch failed)
  if (radarError) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12" role="alert">
          <p className="text-red-600 mb-4">Error loading radar</p>
          <p className="text-sm text-gray-600 mb-4">{radarError.message}</p>
          <Link to="/stars" className="text-indigo-600 hover:text-indigo-700 font-medium">
            <ArrowLeftIcon className="inline h-4 w-4" aria-hidden="true" /> Back to My Stars
          </Link>
        </div>
      </div>
    );
  }

  // Radar loaded successfully
  const repoCount = repositories.length;
  const getSubtitle = () => {
    if (reposLoading) return undefined;
    if (repoCount === 0) return undefined;
    return repoCount === 1 ? '1 repository' : `${repoCount} repositories`;
  };

  // Mark first repo for onboarding tour
  const reposWithTourTarget = sortedRepos.map((repo, index) => ({
    ...repo,
    isTourTarget: index === 0,
  }));

  const renderFooter = () => {
    if (hasActiveSearch) {
      const count = sortedRepos.length;
      return <p>{count === 1 ? '1 repository found' : `${count} repositories found`}</p>;
    }
    return <p>{repoCount === 1 ? '1 repository' : `${repoCount} repositories`}</p>;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        title={radar?.name ?? ''}
        titleIcon={<StaticRadarIcon className="h-7 w-7 text-indigo-600" />}
        titleTourId="radar-name"
        subtitle={getSubtitle()}
        showSearchBar={repoCount > 0}
        searchId="radar-search"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={setActiveSearch}
        searchPlaceholder="Search repositories in this radar..."
        sortValue={sortBy}
        onSortChange={handleSortChange}
        sortOptions={SORT_OPTIONS}
      />

      <RepositoryContent
        repositories={reposWithTourTarget}
        isLoading={reposLoading}
        error={reposError}
        hasActiveSearch={hasActiveSearch}
        onClearSearch={handleClearSearch}
        emptyState={<EmptyRadarState />}
        sortBy={sortBy}
        footer={renderFooter()}
      />
    </div>
  );
};

export default RadarPage;
