import type { Repository } from '../types/index';
import { StarIcon as StarIconOutline } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface RepoCardProps {
  repository: Repository;
  onToggleStar: (repo: Repository) => void;
}

// Format star count for display (e.g., 1234 -> 1.2k)
function formatStarCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

export function RepoCard({ repository, onToggleStar }: RepoCardProps) {
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
    is_starred: isStarred,
  } = repository;

  const handleStarToggle = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation(); // Stop event from reaching the stretched link that covers the card
    e.preventDefault();
    onToggleStar(repository);
  };

  const topicsLabel =
    topics?.length > 0
      ? `Labels: ${topics.slice(0, 3).join(', ')}${topics.length > 3 ? `, plus ${topics.length - 3} more` : ''}`
      : null;

  return (
    <article className="relative bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow p-6">
      {/* Header with owner avatar and stretched link */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <img src={owner.avatar_url} alt="" className="h-8 w-8 rounded-full" role="presentation" />
          <h3 className="text-lg font-semibold text-gray-900">
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
        </div>
        {/* Star button */}
        <button
          type="button"
          onClick={handleStarToggle}
          className={`relative z-10 px-3 py-1 rounded-full text-sm font-medium transition-colors inline-flex items-center gap-1 cursor-pointer ${
            isStarred
              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          aria-label={`${isStarred ? 'Unstar' : 'Star'} ${name} repository`}
        >
          {isStarred ? (
            <StarIconSolid className="h-4 w-4" aria-hidden="true" />
          ) : (
            <StarIconOutline className="h-4 w-4" aria-hidden="true" />
          )}
          {isStarred ? 'Starred' : 'Star'}
        </button>
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
          Stars: {formatStarCount(stargazers_count)}
          {metrics?.stars_growth_rate ? (
            <span className={metrics.stars_growth_rate > 0 ? 'text-green-600' : 'text-red-600'}>
              {' '}
              ({metrics.stars_growth_rate > 0 && '+'}
              {metrics.stars_growth_rate.toFixed(1)}% this month)
            </span>
          ) : null}
        </p>

        {/* Row 2: Open issues */}
        <p>Open issues: {open_issues_count.toLocaleString()}</p>

        {/* Row 3: Primary language */}
        {language && <p>Primary language: {language}</p>}
      </div>
    </article>
  );
}
