import { useState, useRef } from 'react';
import { ArrowPathIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import type { Repository } from '../../types';
import { formatRelativeTime } from '../../utils/formatters';
import { isHotRepo } from '../../utils/metrics';
import { RadarIconButton } from '../RadarIconButton';
import { HotBadge } from '../HotBadge';
import { StarredBadge } from '../StarredBadge';

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
  const {
    id,
    full_name,
    owner,
    description,
    html_url,
    language,
    license,
    topics,
    is_starred,
    stargazers_count,
    metrics,
  } = repository;

  const starsGrowthRate = metrics?.stars_growth_rate ?? 0;
  const starsGained = metrics?.stars_gained ?? 0;
  const isHot = isHotRepo(stargazers_count, starsGrowthRate, starsGained);
  const [isRefreshingLocal, setIsRefreshingLocal] = useState(false);
  const [showAllTopics, setShowAllTopics] = useState(false);
  const isRefreshingRef = useRef(false);

  const showRefreshing = isRefreshing || isRefreshingLocal;

  // Ensure spinner shows for at least MIN_REFRESH_DISPLAY_MS so users
  // notice the refresh happened, even if the API call is very fast.
  // Errors are handled by TanStack Query at the page level, so we catch
  // and ignore here to prevent unhandled promise rejections.
  const handleRefresh = async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setIsRefreshingLocal(true);
    try {
      const minDelayPromise = new Promise((resolve) => setTimeout(resolve, MIN_REFRESH_DISPLAY_MS));
      await Promise.all([onRefresh(), minDelayPromise]);
    } catch {
      // Error handling is done by TanStack Query's error state
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshingLocal(false);
    }
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
          <h1 className="text-2xl font-bold wrap-break-word">
            <a
              href={html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-900 hover:text-indigo-600"
            >
              {full_name}
            </a>
          </h1>
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
        <div className="shrink-0">
          <RadarIconButton githubRepoId={id} iconClassName="h-9 w-9" />
        </div>
      </div>

      {/* Description */}
      {description && <p className="text-gray-700 mb-4">{description}</p>}

      {/* Status badges */}
      {(is_starred || isHot) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {is_starred && <StarredBadge />}
          {metrics && (
            <HotBadge
              stars={stargazers_count}
              growthRate={starsGrowthRate}
              starsGained={starsGained}
            />
          )}
        </div>
      )}

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
          <a
            href={`${html_url}?tab=${license.key.toUpperCase()}-1-ov-file#readme`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-indigo-600"
          >
            {license.name}
            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )}
      </div>

      {/* Topics */}
      {topics && topics.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {(showAllTopics ? topics : topics.slice(0, 10)).map((topic) => (
            <span
              key={topic}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {topic}
            </span>
          ))}
          {topics.length > 10 && !showAllTopics && (
            <button
              onClick={() => setShowAllTopics(true)}
              className="text-xs text-gray-500 hover:text-indigo-600 hover:underline cursor-pointer"
            >
              {`+${topics.length - 10} more`}
            </button>
          )}
          {showAllTopics && (
            <button
              onClick={() => setShowAllTopics(false)}
              className="text-xs text-gray-500 hover:text-indigo-600 hover:underline cursor-pointer"
            >
              Show less
            </button>
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

// Language colors from GitHub's linguist repo (github/linguist/blob/master/lib/linguist/languages.yml)
// Verified 2026-01-29
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
    CSS: '#663399',
    Shell: '#89e051',
    Vue: '#41b883',
  };
  return colors[language] || '#6e7681';
}
