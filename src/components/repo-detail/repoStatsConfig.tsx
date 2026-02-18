import type { ComponentType } from 'react';
import { StarIcon, EyeIcon } from '@heroicons/react/24/outline';
import { formatCompactNumber } from '../../utils/formatters';
import { ForkIcon } from '../icons';

interface StatItem {
  key: string;
  icon: ComponentType<{ className?: string }>;
  value: number;
  label: string;
}

interface LinkItem {
  key: string;
  href: string;
  label: string;
}

interface StatCounts {
  stargazers_count: number;
  forks_count: number;
  watchers_count?: number;
}

interface LinkParams {
  html_url: string;
  issueCount: number | null;
}

export function getStats(counts: StatCounts): StatItem[] {
  const stats: StatItem[] = [
    { key: 'stars', icon: StarIcon, value: counts.stargazers_count, label: 'stars' },
    { key: 'forks', icon: ForkIcon, value: counts.forks_count, label: 'forks' },
  ];

  if (counts.watchers_count !== undefined) {
    stats.push({ key: 'watchers', icon: EyeIcon, value: counts.watchers_count, label: 'watchers' });
  }

  return stats;
}

export function getLinks(params: LinkParams): LinkItem[] {
  const links: LinkItem[] = [];

  // Only show issue count if we have the accurate value (excludes PRs)
  if (params.issueCount !== null) {
    links.push({
      key: 'issues',
      href: `${params.html_url}/issues`,
      label: `${formatCompactNumber(params.issueCount)} open issues`,
    });
  }

  links.push({
    key: 'pulls',
    href: `${params.html_url}/pulls`,
    label: 'Pull requests',
  });

  return links;
}
