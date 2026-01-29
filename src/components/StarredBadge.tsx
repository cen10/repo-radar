import { StarIcon } from '@heroicons/react/24/solid';

export interface StarredBadgeProps {
  className?: string;
}

export function StarredBadge({ className = '' }: StarredBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 ${className}`}
      role="status"
      aria-label="Starred repository"
    >
      <StarIcon className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="ml-1" aria-hidden="true">
        Starred
      </span>
    </span>
  );
}
