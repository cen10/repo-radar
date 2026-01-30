import { ArrowTopRightOnSquareIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import type { Repository } from '../../types';
import { formatCompactNumber } from '../../utils/formatters';
import { getStats, getLinks } from './repoStatsConfig';

interface RepoStatsProps {
  repository: Repository;
}

export function RepoStats({ repository }: RepoStatsProps) {
  const stats = getStats(repository);
  const links = getLinks(repository);

  return (
    <div className="mb-8 bg-indigo-50 border border-indigo-100 rounded-lg p-4 space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-gray-900">
        {stats.map(({ key, icon: Icon, value, label }) => (
          <span key={key} className="inline-flex items-baseline gap-1.5">
            <Icon className="h-4 w-4 self-center" aria-hidden="true" />
            <span className="text-lg font-semibold">{formatCompactNumber(value)}</span>
            <span className="text-sm">{label}</span>
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {links.map(({ key, href, label }) => (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-gray-900 hover:text-indigo-600 hover:underline"
          >
            <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        ))}
      </div>
    </div>
  );
}
