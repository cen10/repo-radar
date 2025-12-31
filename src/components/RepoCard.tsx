import type { Repository } from '../types/index';
import { formatRelativeTime } from '../utils/relativeTime';

interface RepoCardProps {
  repository: Repository;
  onToggleFollow?: (repo: Repository) => void;
}

// Format star count for display (e.g., 1234 -> 1.2k)
function formatStarCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

function formatStarCountLong(count: number): string {
  if (count >= 1000) {
    const thousands = count / 1000;
    return `${thousands.toFixed(1)} thousand`;
  }
  return count.toString();
}

function getLanguageColor(language: string | null): string {
  if (!language) return 'bg-gray-100 text-gray-800';

  // WCAG AA compliant language colors (4.5:1 contrast minimum)
  const colors: Record<string, string> = {
    JavaScript: 'bg-amber-100 text-amber-800',
    TypeScript: 'bg-blue-100 text-blue-800',
    Python: 'bg-green-100 text-green-800',
    Java: 'bg-orange-100 text-orange-800',
    'C++': 'bg-pink-100 text-pink-800',
    'C#': 'bg-purple-100 text-purple-800',
    Ruby: 'bg-red-100 text-red-800',
    Go: 'bg-cyan-200 text-cyan-800',
    Rust: 'bg-amber-100 text-amber-800',
    Swift: 'bg-orange-100 text-orange-800',
    Kotlin: 'bg-violet-100 text-violet-800',
    PHP: 'bg-indigo-100 text-indigo-800',
  };

  return colors[language] || 'bg-gray-100 text-gray-800';
}

// Star icon component
function StarIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 2l2.928 5.938 6.572.954-4.75 4.634 1.122 6.544L10 16.71l-5.872 3.36 1.122-6.544-4.75-4.634 6.572-.954L10 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// Issue icon component (GitHub-style open issue icon)
function IssueIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
      <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
    </svg>
  );
}
function Tooltip({ content, children }: { content: string; children: React.ReactNode }) {
  return (
    <span className="group/tooltip relative">
      {children}
      {/* Invisible bridge to maintain hover between element and tooltip */}
      <span className="invisible group-hover/tooltip:visible [.group\/tooltip:has(:focus-visible)_&]:visible absolute bottom-full left-1/2 transform -translate-x-1/2 w-full h-2 z-20" />
      <span
        className="invisible group-hover/tooltip:visible [.group\/tooltip:has(:focus-visible)_&]:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap z-20 shadow-lg"
        role="tooltip"
        aria-hidden="true"
      >
        {content}
        <span className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  );
}

export function RepoCard({ repository, onToggleFollow }: RepoCardProps) {
  const {
    name,
    owner,
    description,
    html_url,
    stargazers_count,
    open_issues_count,
    language,
    pushed_at,
    topics,
    metrics,
    is_following,
  } = repository;

  const handleFollowToggle = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onToggleFollow?.(repository);
  };

  // Build natural language strings for screen readers
  const starsLabel = metrics?.stars_growth_rate
    ? `${formatStarCountLong(stargazers_count)} stars with ${metrics.stars_growth_rate > 0 ? '+' : ''}${metrics.stars_growth_rate.toFixed(1)}% growth`
    : `${formatStarCountLong(stargazers_count)} stars`;

  const issuesLabel = `${open_issues_count} open issues`;

  const languageLabel = language ? `Primary language: ${language}` : null;

  const topicsLabel =
    topics && topics.length > 0
      ? `Labels: ${topics.slice(0, 3).join(', ')}${topics.length > 3 ? `, plus ${topics.length - 3} more` : ''}`
      : null;

  // Tooltip labels (simpler than screen reader labels)
  const starsTooltip = 'Star count and growth rate over 7 days';
  const issuesTooltip = 'Open issues';
  const languageTooltip = 'Primary language';

  return (
    <article className="relative bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow p-6">
      {/* Header with owner avatar and stretched link */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <img src={owner.avatar_url} alt="" className="h-8 w-8 rounded-full" />
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
      </div>

      {/* Description */}
      {description && <p className="text-gray-700 text-sm mb-4 line-clamp-2">{description}</p>}

      {/* Topics */}
      {topics && topics.length > 0 && (
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

      {/* Metrics row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center flex-wrap gap-x-4 gap-y-2 py-0.5">
          {/* Stars with optional growth */}
          <Tooltip content={starsTooltip}>
            <span
              tabIndex={0}
              role="group"
              aria-label={starsLabel}
              className="relative z-[2] flex items-center space-x-2 rounded px-1 -mx-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <span className="flex items-center text-gray-600" aria-hidden="true">
                <StarIcon className="w-4 h-4 mr-1 text-yellow-500" />
                <span className="text-sm font-medium">{formatStarCount(stargazers_count)}</span>
              </span>
              {metrics?.stars_growth_rate && (
                <span
                  className={`text-sm ${
                    metrics.stars_growth_rate > 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                  aria-hidden="true"
                >
                  {metrics.stars_growth_rate > 0 ? '+' : ''}
                  {metrics.stars_growth_rate.toFixed(1)}%
                </span>
              )}
            </span>
          </Tooltip>

          {/* Open issues */}
          <Tooltip content={issuesTooltip}>
            <span
              tabIndex={0}
              role="group"
              aria-label={issuesLabel}
              className="relative z-[2] flex items-center text-gray-600 rounded px-1 -mx-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <span aria-hidden="true" className="flex items-center">
                <IssueIcon className="w-4 h-4 mr-1" />
                <span className="text-sm">{open_issues_count}</span>
              </span>
            </span>
          </Tooltip>

          {/* Language */}
          {language && (
            <Tooltip content={languageTooltip}>
              <span
                tabIndex={0}
                role="group"
                aria-label={languageLabel!}
                className={`relative z-[2] inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${getLanguageColor(language)}`}
              >
                <span aria-hidden="true">{language}</span>
              </span>
            </Tooltip>
          )}
        </div>

        {/* Last commit - below metrics on mobile, right aligned on desktop */}
        <span className="text-xs text-gray-500">
          {pushed_at ? `Last commit ${formatRelativeTime(pushed_at)}` : 'No commits yet'}
        </span>
      </div>

      {/* Follow button - positioned above stretched link */}
      {onToggleFollow && (
        <button
          type="button"
          onClick={handleFollowToggle}
          className={`absolute top-6 right-6 px-3 py-1 rounded-full text-sm font-medium transition-colors z-10 ${
            is_following
              ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          aria-label={`${is_following ? 'Unfollow' : 'Follow'} ${name} repository`}
        >
          {is_following ? 'Following' : 'Follow'}
        </button>
      )}
    </article>
  );
}
