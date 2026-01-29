import type { ComponentType } from 'react';
import { StarIcon, EyeIcon } from '@heroicons/react/24/outline';
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

export interface StatItem {
  key: string;
  icon: ComponentType<{ className?: string }>;
  value: number;
  label: string;
}

export interface LinkItem {
  key: string;
  href: string;
  label: string;
}

export function getStats(repository: Repository): StatItem[] {
  return [
    { key: 'stars', icon: StarIcon, value: repository.stargazers_count, label: 'stars' },
    { key: 'forks', icon: ForkIcon, value: repository.forks_count, label: 'forks' },
    { key: 'watchers', icon: EyeIcon, value: repository.watchers_count, label: 'watchers' },
  ];
}

export function getLinks(repository: Repository): LinkItem[] {
  return [
    {
      key: 'issues',
      href: `${repository.html_url}/issues`,
      label: `${formatCompactNumber(repository.open_issues_count)} open issues`,
    },
    {
      key: 'pulls',
      href: `${repository.html_url}/pulls`,
      label: 'Pull requests',
    },
  ];
}
