import type { RepositoryWithMetrics } from '../types/index';
import { formatRelativeTime } from '../utils/relativeTime';

interface RepoCardProps {
  repository: RepositoryWithMetrics;
  onToggleFollow?: (repo: RepositoryWithMetrics) => void;
}

function formatStarCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

function getLanguageColor(language: string | null): string {
  if (!language) return 'bg-gray-100 text-gray-800';

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
    <div className="group relative">
      {children}
      <div className="invisible group-hover:visible group-focus-within:visible absolute bottom-full left-1/2 transform -translate-x-1/2 w-full h-2 z-10" />
      <div
        className="invisible group-hover:visible group-focus-within:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap z-10 shadow-lg"
        aria-hidden="true"
      >
        {content}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
}

const handleMetricKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.stopPropagation();
    e.preventDefault();
  }
};

export function RepoCard({ repository, onToggleFollow }: RepoCardProps) {
  const {
    name,
    full_name,
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

  return (
    <div className="relative bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow">
      {/* Link covers the card content for navigation */}
      <a
        href={html_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-6 no-underline"
      >
        {/* Header with owner avatar */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <img src={owner.avatar_url} alt="" className="h-8 w-8 rounded-full" />
            <div>
              <h3
                className="text-lg font-semibold text-gray-900"
                aria-describedby={`owner-${full_name.replace('/', '-')}`}
              >
                {name}
              </h3>
              <p
                id={`owner-${full_name.replace('/', '-')}`}
                className="text-sm text-gray-500"
                aria-hidden="true"
              >
                by {owner.login}
              </p>
            </div>
          </div>
        </div>

        {/* Description */}
        {description && <p className="text-gray-700 text-sm mb-4 line-clamp-2">{description}</p>}

        {/* Topics */}
        {topics && topics.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {topics.slice(0, 3).map((topic) => (
              <span
                key={topic}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {topic}
              </span>
            ))}
            {topics.length > 3 && (
              <span className="text-xs text-gray-500">+{topics.length - 3} more</span>
            )}
          </div>
        )}

        {/* Metrics row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div
              className="flex items-center text-gray-600"
              aria-label={`${formatStarCount(stargazers_count)} stars`}
            >
              <StarIcon className="w-4 h-4 mr-1 text-yellow-500" />
              <span className="text-sm font-medium">{formatStarCount(stargazers_count)}</span>
            </div>

            {metrics?.stars_growth_rate && (
              <Tooltip
                content={
                  metrics.stars_growth_rate > 0
                    ? `+${metrics.stars_growth_rate.toFixed(1)}% growth over 7 days`
                    : `${metrics.stars_growth_rate.toFixed(1)}% growth over 7 days`
                }
              >
                <span
                  className={`text-xs cursor-help ${
                    metrics.stars_growth_rate > 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                  tabIndex={0}
                  aria-label={`${metrics.stars_growth_rate > 0 ? '+' : ''}${metrics.stars_growth_rate.toFixed(1)}% star growth over 7 days`}
                  onKeyDown={handleMetricKeyDown}
                >
                  {metrics.stars_growth_rate > 0 ? '+' : ''}
                  {metrics.stars_growth_rate.toFixed(1)}%
                </span>
              </Tooltip>
            )}

            <Tooltip content="Open issue count">
              <div
                className="flex items-center text-gray-600 cursor-help"
                tabIndex={0}
                aria-label={`${open_issues_count} open issues`}
                onKeyDown={handleMetricKeyDown}
              >
                <IssueIcon className="w-4 h-4 mr-1" />
                <span className="text-sm">{open_issues_count}</span>
              </div>
            </Tooltip>

            {language && (
              <Tooltip content="Primary language">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-help ${getLanguageColor(language)}`}
                  aria-label={`Primary language: ${language}`}
                  tabIndex={0}
                  onKeyDown={handleMetricKeyDown}
                >
                  {language}
                </span>
              </Tooltip>
            )}
          </div>

          <div className="text-xs text-gray-500">
            {pushed_at ? `Last commit ${formatRelativeTime(pushed_at)}` : 'No commits yet'}
          </div>
        </div>

        {/* Trending indicator */}
        {metrics?.is_trending && (
          <div className="mt-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              🔥 Trending
            </span>
          </div>
        )}
      </a>

      {/* Follow button - OUTSIDE the link, positioned top-right, sibling to <a> */}
      {onToggleFollow && (
        <button
          type="button"
          onClick={handleFollowToggle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleFollowToggle(e);
            }
          }}
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
    </div>
  );
}
