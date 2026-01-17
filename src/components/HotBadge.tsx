import { isHotRepo } from '../utils/metrics';

export interface HotBadgeProps {
  stars: number;
  growthRate: number; // Decimal: 0.25 = 25%
  starsGained: number;
  className?: string;
}

export function HotBadge({ stars, growthRate, starsGained, className = '' }: HotBadgeProps) {
  if (!isHotRepo(stars, growthRate, starsGained)) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 ${className}`}
      role="status"
      aria-label="This repository is trending"
    >
      <span aria-hidden="true">🔥</span>
      <span className="ml-1">Hot</span>
    </span>
  );
}
