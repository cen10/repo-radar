import { Link, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { useRepository } from '../hooks/useRepository';
import { useReleases } from '../hooks/useReleases';
import { RepoHeader, RepoStats, RepoReleases } from '../components/repo-detail';
import { LoadingSpinner } from '../components/icons';

const RepoDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { providerToken } = useAuth();

  const {
    repository,
    isLoading,
    error,
    isNotFound,
    isInvalidId,
    refetch,
    isRefetching,
    dataUpdatedAt,
  } = useRepository({
    repoId: id,
    token: providerToken,
  });

  const { releases, isLoading: releasesLoading } = useReleases({
    token: providerToken,
    owner: repository?.owner.login ?? '',
    repo: repository?.name ?? '',
    enabled: !!repository,
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center min-h-[400px]" role="status">
          <LoadingSpinner className="h-12 w-12 text-indigo-600" />
          <span className="sr-only">Loading repository...</span>
        </div>
      </div>
    );
  }

  // Token missing (session refresh lost token and localStorage cleared)
  if (!providerToken) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-16">
          <h1 className="text-2xl font-semibold text-gray-900">Session expired</h1>
          <p className="mt-2 text-gray-500">
            Your GitHub session has expired. Please sign in again to continue.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium"
          >
            <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  // Invalid ID state (e.g., /repo/abc)
  if (isInvalidId) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-16">
          <h1 className="text-2xl font-semibold text-gray-900">Invalid repository ID</h1>
          <p className="mt-2 text-gray-500">
            The repository ID in the URL is not valid. Please check the link and try again.
          </p>
          <Link
            to="/stars"
            className="mt-6 inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium"
          >
            <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
            Back to My Stars
          </Link>
        </div>
      </div>
    );
  }

  // Not found state (valid ID but repo doesn't exist)
  if (isNotFound) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-16">
          <h1 className="text-2xl font-semibold text-gray-900">Repository not found</h1>
          <p className="mt-2 text-gray-500">
            This repository doesn't exist or may have been deleted or made private.
          </p>
          <Link
            to="/stars"
            className="mt-6 inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium"
          >
            <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
            Back to My Stars
          </Link>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12" role="alert">
          <p className="text-red-600 mb-4">Error loading repository</p>
          <p className="text-sm text-gray-600 mb-4">{error.message}</p>
          <button
            onClick={() => refetch()}
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Repository loaded successfully
  if (!repository) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <RepoHeader
        repository={repository}
        onRefresh={refetch}
        isRefreshing={isRefetching}
        dataFetchedAt={dataUpdatedAt}
      />
      <RepoStats repository={repository} />
      <RepoReleases
        releases={releases}
        isLoading={releasesLoading}
        releasesUrl={`${repository.html_url}/releases`}
      />
    </div>
  );
};

export default RepoDetailPage;
