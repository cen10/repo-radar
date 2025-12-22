import type { RepositoryWithMetrics } from '../types/index';
import { formatRelativeTime } from '../utils/relativeTime';

interface RepoCardProps {
  repository: RepositoryWithMetrics;
  onToggleFollow?: (repo: RepositoryWithMetrics) => void;
}

// Format star count for display (e.g., 1234 -> 1.2k)
function formatStarCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

// Get language color for badge
function getLanguageColor(language: string | null): string {
  if (!language) return 'bg-gray-100 text-gray-800';

  // Common language colors based on GitHub's language colors
  const colors: Record<string, string> = {
    JavaScript: 'bg-yellow-100 text-yellow-800',
    TypeScript: 'bg-blue-100 text-blue-800',
    Python: 'bg-green-100 text-green-800',
    Java: 'bg-orange-100 text-orange-800',
    'C++': 'bg-pink-100 text-pink-800',
    'C#': 'bg-purple-100 text-purple-800',
    Ruby: 'bg-red-100 text-red-800',
    Go: 'bg-cyan-100 text-cyan-800',
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

// Issue icon component
function IssueIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.3 1.25-1.3a1.5 1.5 0 10-1.56-1.5z"
        clipRule="evenodd"
      />
      <path d="M9 15a1 1 0 112 0 1 1 0 01-2 0z" />
    </svg>
  );
}

// Helper function to check if the target is a button element
const isButtonTarget = (target: EventTarget | null): boolean => {
  return (target as HTMLElement).tagName === 'BUTTON';
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
    updated_at,
    topics,
    metrics,
    is_following,
  } = repository;

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if user clicked the follow button
    if (isButtonTarget(e.target)) return;
    window.open(html_url, '_blank', 'noopener,noreferrer');
  };

  const handleFollowToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    onToggleFollow?.(repository);
  };

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          // Don't navigate if user pressed Space/Enter on the follow button
          if (isButtonTarget(e.target)) return;
          e.preventDefault();
          window.open(html_url, '_blank', 'noopener,noreferrer');
        }
      }}
      aria-label={`View repository ${full_name} on GitHub`}
    >
      {/* Header with owner avatar and follow button */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <img
            src={owner.avatar_url}
            alt={`${owner.login}'s avatar`}
            className="h-8 w-8 rounded-full"
          />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600">{name}</h3>
            <p className="text-sm text-gray-500">by {owner.login}</p>
          </div>
        </div>

        {/* Follow button */}
        {onToggleFollow && (
          <button
            onClick={handleFollowToggle}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              is_following
                ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            aria-label={is_following ? 'Unfollow repository' : 'Follow repository'}
          >
            {is_following ? 'Following' : 'Follow'}
          </button>
        )}
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
          {/* Stars */}
          <div className="flex items-center text-gray-600">
            <StarIcon className="w-4 h-4 mr-1 text-yellow-500" />
            <span className="text-sm font-medium">{formatStarCount(stargazers_count)}</span>
            {metrics?.stars_growth_rate && (
              <span
                className={`ml-1 text-xs ${
                  metrics.stars_growth_rate > 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {metrics.stars_growth_rate > 0 ? '+' : ''}
                {metrics.stars_growth_rate.toFixed(1)}%
              </span>
            )}
          </div>

          {/* Issues */}
          <div className="flex items-center text-gray-600">
            <IssueIcon className="w-4 h-4 mr-1" />
            <span className="text-sm">{open_issues_count}</span>
          </div>

          {/* Language */}
          {language && (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLanguageColor(language)}`}
            >
              {language}
            </span>
          )}
        </div>

        {/* Updated time */}
        <div className="text-xs text-gray-500">Updated {formatRelativeTime(updated_at)}</div>
      </div>

      {/* Trending indicator */}
      {metrics?.is_trending && (
        <div className="mt-3 flex items-center">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            🔥 Trending
          </span>
          {metrics.momentum_score && (
            <span className="ml-2 text-xs text-gray-500">
              Momentum: {metrics.momentum_score.toFixed(1)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
