interface RadarIconProps {
  filled: boolean;
  className?: string;
}

/**
 * Radar icon with filled/outline states.
 * Filled = repo is tracked in at least one radar
 * Outline = repo is not tracked
 *
 * Design: Concentric arcs (like radar waves) with a sweep line
 */
export function RadarIcon({ filled, className = '' }: RadarIconProps) {
  if (filled) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 4a6 6 0 110 12 6 6 0 010-12zm0 3a3 3 0 110 6 3 3 0 010-6z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
