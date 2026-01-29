import {
  ArrowTopRightOnSquareIcon,
  StarIcon,
  EyeIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import type { Repository } from '../../types';
import { formatCompactNumber } from '../../utils/formatters';

function ForkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"
      />
    </svg>
  );
}

interface RepoStatsProps {
  repository: Repository;
}

export function RepoStats({ repository }: RepoStatsProps) {
  const { stargazers_count, forks_count, watchers_count, open_issues_count, html_url } = repository;

  return (
    <div className="mb-8 bg-indigo-50 border border-indigo-100 rounded-lg p-4 space-y-3">
      {/* Inline stats with icons */}
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-gray-900">
        <span className="inline-flex items-baseline gap-1.5">
          <StarIcon className="h-4 w-4 self-center" aria-hidden="true" />
          <span className="text-lg font-semibold">{formatCompactNumber(stargazers_count)}</span>
          <span className="text-sm">stars</span>
        </span>
        <span className="inline-flex items-baseline gap-1.5">
          <ForkIcon className="h-4 w-4 self-center" />
          <span className="text-lg font-semibold">{formatCompactNumber(forks_count)}</span>
          <span className="text-sm">forks</span>
        </span>
        <span className="inline-flex items-baseline gap-1.5">
          <EyeIcon className="h-4 w-4 self-center" aria-hidden="true" />
          <span className="text-lg font-semibold">{formatCompactNumber(watchers_count)}</span>
          <span className="text-sm">watchers</span>
        </span>
      </div>

      {/* Links to issues and PRs */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <a
          href={`${html_url}/issues`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-gray-900 hover:text-indigo-600 hover:underline"
        >
          <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {formatCompactNumber(open_issues_count)} open issues
          <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
        <a
          href={`${html_url}/pulls`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-gray-900 hover:text-indigo-600 hover:underline"
        >
          <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Pull requests
          <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
