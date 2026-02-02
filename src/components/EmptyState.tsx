import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { StarIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { StaticRadarIcon } from './icons';
import { Button } from './Button';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, actions, className = '' }: EmptyStateProps) {
  return (
    <div className={`text-center py-16 ${className}`}>
      <div className="mx-auto h-12 w-12 text-gray-400">{icon}</div>
      <p className="text-lg font-medium text-gray-900 mt-4">{title}</p>
      {description && <p className="text-sm text-gray-500 mt-2">{description}</p>}
      {actions && <div className="mt-6 flex gap-4 justify-center">{actions}</div>}
    </div>
  );
}

export function EmptyRadarState() {
  return (
    <EmptyState
      icon={<StaticRadarIcon className="h-12 w-12" />}
      title="No repos on this radar yet"
      description="Add repos from My Stars or Explore to start tracking their metrics."
      actions={
        <>
          <Link
            to="/stars"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Go to My Stars
          </Link>
          <Link
            to="/explore"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Explore Repos
          </Link>
        </>
      }
    />
  );
}

export function NoStarredReposState() {
  return (
    <EmptyState
      icon={<StarIcon className="h-12 w-12" aria-hidden="true" />}
      title="No starred repos yet"
      description="Star repos on GitHub, and they'll appear here for easy access."
      actions={
        <Link
          to="/explore"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          Explore Repos
        </Link>
      }
    />
  );
}

interface NoSearchResultsStateProps {
  onClearSearch: () => void;
}

export function NoSearchResultsState({ onClearSearch }: NoSearchResultsStateProps) {
  return (
    <EmptyState
      icon={<MagnifyingGlassIcon className="h-12 w-12" aria-hidden="true" />}
      title="No repos found"
      description="Try adjusting your search or filters."
      actions={
        <Button variant="link" onClick={onClearSearch}>
          Clear search
        </Button>
      }
    />
  );
}

interface NoStarredReposToSearchStateProps {
  onClearSearch: () => void;
}

export function NoStarredReposToSearchState({ onClearSearch }: NoStarredReposToSearchStateProps) {
  return (
    <EmptyState
      icon={<StarIcon className="h-12 w-12" aria-hidden="true" />}
      title="You have no starred repos to search"
      description="Star repos on GitHub first, then you can search within your collection here."
      actions={
        <>
          <Button variant="link" onClick={onClearSearch}>
            Clear search
          </Button>
          <Link
            to="/explore"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Explore Repos
          </Link>
        </>
      }
    />
  );
}
