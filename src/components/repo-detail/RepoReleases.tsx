import { useState } from 'react';
import { TagIcon, ArrowTopRightOnSquareIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import type { Release } from '../../types';
import { formatRelativeTime, formatShortDate } from '../../utils/formatters';

interface RepoReleasesProps {
  releases: Release[];
  isLoading: boolean;
  releasesUrl: string;
}

export function RepoReleases({ releases, isLoading, releasesUrl }: RepoReleasesProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const heading = (
    <h2 className="text-lg font-semibold mb-4">
      <a
        href={releasesUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-900 hover:text-indigo-600 hover:underline inline-flex items-center gap-1"
      >
        Latest Releases
        <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
      </a>
    </h2>
  );

  if (isLoading) {
    return (
      <div className="mb-8">
        {heading}
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-500">Loading releases...</p>
        </div>
      </div>
    );
  }

  if (releases.length === 0) {
    return (
      <div className="mb-8">
        {heading}
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <TagIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" aria-hidden="true" />
          <p className="text-gray-500">No releases yet</p>
        </div>
      </div>
    );
  }

  const displayedReleases = releases.slice(0, 3);

  const toggleExpanded = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="mb-8">
      {heading}
      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
        {displayedReleases.map((release) => {
          const isExpanded = expandedId === release.id;
          const hasBody = release.body && release.body.trim().length > 0;

          return (
            <div key={release.id}>
              <button
                onClick={() => toggleExpanded(release.id)}
                className="w-full p-4 text-left hover:bg-gray-50 transition-colors cursor-pointer"
                aria-expanded={isExpanded}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <TagIcon className="h-4 w-4 text-gray-400 shrink-0" aria-hidden="true" />
                      <span className="font-medium text-gray-900 truncate">
                        {release.name || release.tag_name}
                      </span>
                      {release.prerelease && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pre-release
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {release.published_at
                        ? `Published ${formatRelativeTime(release.published_at)}`
                        : `Created ${formatShortDate(release.created_at)}`}
                      {release.author && ` by ${release.author.login}`}
                    </p>
                  </div>
                  <ChevronDownIcon
                    className={`h-5 w-5 text-gray-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 pt-0">
                  {hasBody ? (
                    <div className="bg-indigo-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                      {release.body}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No release notes</p>
                  )}
                  <a
                    href={release.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-3 text-sm text-indigo-600 hover:text-indigo-700 hover:underline"
                  >
                    View on GitHub
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
