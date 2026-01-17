import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import type { Repository } from '../types/index';
import { formatCompactNumber, formatGrowthRate } from '../utils/formatters';
import { HotBadge } from './HotBadge';

interface RepoCardProps {
  repository: Repository;
}

export function RepoCard({ repository }: RepoCardProps) {
  const {
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

  const topicsLabel =
    topics?.length > 0
      ? `Labels: ${topics.slice(0, 3).join(', ')}${topics.length > 3 ? `, plus ${topics.length - 3} more` : ''}`
      : null;

  return (
    <article className="relative bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow p-6">
      {/* Header with owner avatar, stretched link, badges, and star indicator */}
      <div className="flex items-center space-x-3 mb-3">
        <img src={owner.avatar_url} alt="" className="h-8 w-8 rounded-full" role="presentation" />
        <h3 className="flex-1 text-lg font-semibold text-gray-900">
          <a
            href={html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="no-underline hover:underline after:content-[''] after:absolute after:inset-0 after:z-[1]"
            aria-label={`${name} by ${owner.login}`}
          >
            <span aria-hidden="true">{name}</span>
          </a>
          <span className="block text-sm text-gray-500 font-normal" aria-hidden="true">
            by {owner.login}
          </span>
        </h3>
        {/* Hot badge - z-[2] to sit above the stretched link overlay (z-[1]) */}
        {metrics && (
          <HotBadge
            stars={stargazers_count}
            growthRate={metrics.stars_growth_rate ?? 0}
            starsGained={metrics.stars_gained ?? 0}
            className="shrink-0 self-start z-[2]"
          />
        )}
        {/* Star indicator (visual only, shown only for starred repos) */}
        {is_starred && (
          <StarIconSolid
            className="h-5 w-5 text-yellow-500 shrink-0 self-start"
            aria-label="Starred"
          />
        )}
      </div>

      {/* Description */}
      {description && <p className="text-gray-700 text-sm mb-4 line-clamp-2">{description}</p>}

      {/* Topics */}
      {topics?.length > 0 && (
        <div
          className="flex flex-wrap gap-2 mb-4"
          role="group"
          aria-label={topicsLabel ?? undefined}
        >
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

      {/* Metrics - Three rows */}
      <div className="space-y-1.5 text-sm text-gray-600">
        {/* Row 1: Stars with growth */}
        <p>
          Stars: {formatCompactNumber(stargazers_count)}
          {metrics?.stars_growth_rate !== undefined && metrics.stars_growth_rate !== 0 && (
            <span
              className={`ml-1 font-medium ${
                metrics.stars_growth_rate > 0 ? 'text-green-700' : 'text-red-700'
              }`}
            >
              ({formatGrowthRate(metrics.stars_growth_rate, 1)})
            </span>
          )}
        </p>

        {/* Row 2: Open issues */}
        <p>Open issues: {open_issues_count.toLocaleString()}</p>

        {/* Row 3: Primary language */}
        {language && <p>Primary language: {language}</p>}
      </div>
    </article>
  );
}
