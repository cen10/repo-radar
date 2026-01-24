import { useState } from 'react';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import type { Repository } from '../types/index';
import { formatCompactNumber, formatGrowthRate } from '../utils/formatters';
import { isHotRepo } from '../utils/metrics';
import { HotBadge } from './HotBadge';
import { ManageRadarsModal } from './ManageRadarsModal';
import { RadarIcon } from './RadarIcon';
import { useRepoRadars } from '../hooks/useRepoRadars';

interface RepoCardProps {
  repository: Repository;
}

export function RepoCard({ repository }: RepoCardProps) {
  const {
    id,
    name,
    owner,
    description,
    html_url,
    stargazers_count,
    open_issues_count,
    language,
    topics,
    metrics,
    is_starred,
  } = repository;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const { radarIds } = useRepoRadars(id);
  const isInAnyRadar = radarIds.length > 0;

  const topicsLabel =
    topics?.length > 0
      ? `Labels: ${topics.slice(0, 3).join(', ')}${topics.length > 3 ? `, plus ${topics.length - 3} more` : ''}`
      : null;

  const starsGrowthRate = metrics?.stars_growth_rate;
  const starsGained = metrics?.stars_gained ?? 0;

  const isHot = isHotRepo(stargazers_count, starsGrowthRate ?? 0, starsGained);

  // Truncate description to match visual line-clamp-2 (~150 chars)
  const truncatedDescription =
    description && description.length > 150
      ? `${description.slice(0, 150).trim()}...`
      : description;

  return (
    <article className="relative bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow p-6">
      {/* Header with owner avatar, stretched link, badges, and star indicator */}
      <div className="flex items-start space-x-3 mb-3">
        <img src={owner.avatar_url} alt="" className="h-8 w-8 rounded-full" role="presentation" />
        <div className="flex-1">
          <a
            href={html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="no-underline hover:underline after:content-[''] after:absolute after:inset-0 after:z-1"
          >
            <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
            <span className="block text-sm text-gray-500 font-normal">by {owner.login}</span>
            <span className="sr-only">{`${isHot ? ', hot' : ''}${is_starred ? ', starred' : ''}${isInAnyRadar ? ', tracked' : ''}, opens in new tab`}</span>
          </a>
        </div>
        {/* Hot badge - z-[2] to sit above the stretched link overlay (z-[1]) */}
        {metrics && (
          <HotBadge
            stars={stargazers_count}
            growthRate={starsGrowthRate ?? 0}
            starsGained={starsGained}
            className="shrink-0 z-2 mt-0.5"
          />
        )}
        {/* Radar button - z-[2] to sit above the stretched link overlay (z-[1]) */}
        <button
          onClick={() => setIsModalOpen(true)}
          className={`relative z-2 p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            isInAnyRadar
              ? 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'
              : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
          }`}
          aria-label={isInAnyRadar ? 'Manage radars for this repo' : 'Add to radar'}
        >
          <RadarIcon filled={isInAnyRadar} className="h-5 w-5" />
        </button>
        {/* Star indicator (visual only, shown only for starred repos) */}
        {is_starred && (
          <StarIconSolid className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" aria-label="Starred" />
        )}
      </div>

      {/* Description */}
      {truncatedDescription && (
        <p className="text-gray-700 text-sm mb-4">
          {truncatedDescription}
          {description && description.length > 150 && (
            <span className="sr-only">(description truncated)</span>
          )}
        </p>
      )}

      {/* Topics */}
      {topics?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="sr-only">{topicsLabel}</span>
          {topics.slice(0, 3).map((topic) => (
            <span
              key={topic}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              aria-hidden="true"
            >
              {topic}
            </span>
          ))}
          {topics.length > 3 && (
            <span className="text-xs text-gray-500" aria-hidden="true">
              {`+${topics.length - 3} more`}
            </span>
          )}
        </div>
      )}

      {/* Metrics */}
      <ul className="space-y-1.5 text-sm text-gray-600 list-none p-0 m-0">
        <li>
          Stars: {formatCompactNumber(stargazers_count)}
          {starsGrowthRate !== undefined && starsGrowthRate !== 0 && (
            <span
              className={`ml-1 font-medium ${
                starsGrowthRate > 0 ? 'text-green-700' : 'text-red-700'
              }`}
            >
              ({formatGrowthRate(starsGrowthRate, 1)})
            </span>
          )}
        </li>
        <li>Open issues: {open_issues_count.toLocaleString()}</li>
        {language && <li>Primary language: {language}</li>}
      </ul>

      {/* Manage Radars Modal */}
      {isModalOpen && <ManageRadarsModal githubRepoId={id} onClose={() => setIsModalOpen(false)} />}
    </article>
  );
}
