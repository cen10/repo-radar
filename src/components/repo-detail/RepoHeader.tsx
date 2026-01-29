import { useState } from 'react';
import { ArrowPathIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import type { Repository } from '../../types';
import { formatRelativeTime } from '../../utils/formatters';
import { RadarIconButton } from '../RadarIconButton';

const MIN_REFRESH_DISPLAY_MS = 300;

interface RepoHeaderProps {
  repository: Repository;
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  dataFetchedAt: number | undefined;
}

export function RepoHeader({
  repository,
  onRefresh,
  isRefreshing,
  dataFetchedAt,
}: RepoHeaderProps) {
  const { id, full_name, owner, description, html_url, language, license, topics, is_starred } =
    repository;
  const [isRefreshingLocal, setIsRefreshingLocal] = useState(false);

  const showRefreshing = isRefreshing || isRefreshingLocal;

  const handleRefresh = async () => {
    setIsRefreshingLocal(true);
    const minDelayPromise = new Promise((resolve) => setTimeout(resolve, MIN_REFRESH_DISPLAY_MS));
    await Promise.all([onRefresh(), minDelayPromise]);
    setIsRefreshingLocal(false);
  };

  return (
    <div className="mb-8">
      {/* Top row: Avatar, name, and actions */}
      <div className="flex items-start gap-4 mb-4">
        <img
          src={owner.avatar_url}
          alt=""
          className="h-16 w-16 rounded-lg shrink-0"
          role="presentation"
        />

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 wrap-break-word">{full_name}</h1>
          <a
            href={`https://github.com/${owner.login}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 hover:text-indigo-600"
          >
            by {owner.login}
          </a>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <RadarIconButton githubRepoId={id} iconClassName="h-6 w-6" />
          {is_starred && <StarIcon className="h-6 w-6 text-yellow-500" aria-label="Starred" />}

          <a
            href={html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            View on GitHub
            <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>

      {/* Description */}
      {description && <p className="text-gray-700 mb-4">{description}</p>}

      {/* Meta row: Language, License */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {language && (
          <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: getLanguageColor(language) }}
              aria-hidden="true"
            />
            {language}
          </span>
        )}

        {license && (
          <span className="text-sm text-gray-600">
            {license.url ? (
              <a
                href={license.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-indigo-600"
              >
                {license.name}
              </a>
            ) : (
              license.name
            )}
          </span>
        )}
      </div>

      {/* Topics */}
      {topics && topics.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {topics.slice(0, 5).map((topic) => (
            <span
              key={topic}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {topic}
            </span>
          ))}
          {topics.length > 5 && (
            <span className="text-xs text-gray-500">{`+${topics.length - 5} more`}</span>
          )}
        </div>
      )}

      {/* Data freshness row */}
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <span>
          Data from{' '}
          {dataFetchedAt ? formatRelativeTime(new Date(dataFetchedAt).toISOString()) : 'just now'}
        </span>
        <button
          onClick={handleRefresh}
          disabled={showRefreshing}
          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Refresh data"
        >
          <ArrowPathIcon
            className={`h-4 w-4 ${showRefreshing ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          Refresh
        </button>
      </div>
    </div>
  );
}

// Simple language color mapping (common languages)
function getLanguageColor(language: string): string {
  const colors: Record<string, string> = {
    TypeScript: '#3178c6',
    JavaScript: '#f1e05a',
    Python: '#3572A5',
    Java: '#b07219',
    Go: '#00ADD8',
    Rust: '#dea584',
    Ruby: '#701516',
    PHP: '#4F5D95',
    'C++': '#f34b7d',
    C: '#555555',
    'C#': '#178600',
    Swift: '#F05138',
    Kotlin: '#A97BFF',
    Dart: '#00B4AB',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Shell: '#89e051',
    Vue: '#41b883',
  };
  return colors[language] || '#6e7681';
}
