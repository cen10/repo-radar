import type { ComponentType } from 'react';
import { StarIcon, EyeIcon } from '@heroicons/react/24/outline';
import type { Repository } from '../../types';
import { formatCompactNumber } from '../../utils/formatters';
import { ForkIcon } from '../icons';

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
