import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Repository } from '../types/index';
import { formatCompactNumber, formatGrowthRate } from '../utils/formatters';
import { isHotRepo } from '../utils/metrics';
import { HotBadge } from './HotBadge';
import { StarredBadge } from './StarredBadge';
import { RadarIconButton } from './RadarIconButton';
import { useOnboarding } from '../contexts/use-onboarding';

interface RepoCardProps {
  repository: Repository;
}

export function RepoCard({ repository }: RepoCardProps) {
  const {
    id,
    name,
    owner,
    description,
    stargazers_count,
    open_issues_count,
    language,
    topics,
    metrics,
    is_starred,
    isTourTarget,
  } = repository;

  const { currentStepId } = useOnboarding();
  const showCardPulse = isTourTarget && currentStepId === 'click-repo';

  const [isNameTruncated, setIsNameTruncated] = useState(false);
  const nameRef = useRef<HTMLHeadingElement>(null);

  // Detect if name is truncated (using ResizeObserver for reliable measurement)
  useEffect(() => {
    const el = nameRef.current;
    if (!el) return;

    const checkTruncation = () => {
      setIsNameTruncated(el.scrollWidth > el.clientWidth);
    };

    checkTruncation();
    const observer = new ResizeObserver(checkTruncation);
    observer.observe(el);

    return () => observer.disconnect();
  }, [name]);

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
    <article
      className={`relative bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow p-6 ${showCardPulse ? 'animate-pulse-border' : ''}`}
      {...(isTourTarget ? { 'data-tour': 'repo-card' } : {})}
    >
      {/* Header with owner avatar, stretched link, badges, and star indicator */}
      <div className="flex items-start space-x-3 mb-3">
        <img src={owner.avatar_url} alt="" className="h-8 w-8 rounded-full" role="presentation" />
        <div className="flex-1 min-w-0">
          <Link
            to={`/repo/${id}`}
            className="group/link no-underline hover:underline after:content-[''] after:absolute after:inset-0 after:z-1"
          >
            <span className="group/name relative block z-2">
              <h3 ref={nameRef} className="text-lg font-semibold text-gray-900 truncate">
                {name}
              </h3>
              {isNameTruncated && (
                <span
                  className="pointer-events-none absolute left-0 top-full mt-1 w-max max-w-xs rounded bg-gray-900 px-2 py-1 text-xs font-normal text-white opacity-0 transition-opacity group-hover/name:opacity-100 group-focus/link:opacity-100 z-tooltip"
                  role="tooltip"
                  aria-hidden="true"
                >
                  {name}
                  <span className="absolute left-4 bottom-full border-4 border-transparent border-b-gray-900" />
                </span>
              )}
            </span>{' '}
            <span className="block text-sm text-gray-500 font-normal">by {owner.login}</span>
            <span className="sr-only">{`${isHot ? ', hot' : ''}${is_starred ? ', starred' : ''}`}</span>
          </Link>
        </div>
        {/* Radar button - z-2 to sit above the stretched link overlay (z-1) */}
        <RadarIconButton
          githubRepoId={id}
          className="relative z-2 -mt-2"
          {...(isTourTarget ? { 'data-tour': 'radar-icon' } : {})}
        />
      </div>

      {/* Status badges */}
      {(isHot || is_starred) && (
        <div className="flex flex-wrap gap-2 mb-3">
          {is_starred && <StarredBadge className="z-2" />}
          {metrics && (
            <HotBadge
              stars={stargazers_count}
              growthRate={starsGrowthRate ?? 0}
              starsGained={starsGained}
              className="z-2"
            />
          )}
        </div>
      )}

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
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-800"
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
    </article>
  );
}
