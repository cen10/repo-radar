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
    <span className={`group relative ${className}`}>
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 cursor-default focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1"
        role="status"
        aria-label="Trending: 25% or more growth with 50 or more new stars"
        tabIndex={0}
      >
        <span aria-hidden="true">🔥</span>
        <span className="ml-1">Hot</span>
      </span>
      {/* Tooltip - visible on hover or focus */}
      <span
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 w-max max-w-xs rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 z-50"
        role="tooltip"
        aria-hidden="true"
      >
        25%+ growth · 50+ new stars
        {/* Arrow */}
        <span className="absolute left-1/2 -translate-x-1/2 bottom-full border-4 border-transparent border-b-gray-900" />
      </span>
    </span>
  );
}
