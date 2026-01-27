import { useEffect, useRef, useState } from 'react';

// Global flag: only enable animation after user has clicked on the page
let userHasInteracted = false;
if (typeof window !== 'undefined') {
  const markInteracted = () => {
    userHasInteracted = true;
    window.removeEventListener('click', markInteracted);
  };
  window.addEventListener('click', markInteracted);
}

interface RadarIconProps {
  filled: boolean;
  className?: string;
}

/**
 * Radar icon with filled/outline states and sweep animation.
 * Filled = repo is tracked in at least one radar (thicker strokes)
 * Outline = repo is not tracked (thinner strokes)
 *
 * When transitioning from unfilled to filled, a sweep animation plays.
 * Animation only triggers after user has interacted with the page.
 */
export function RadarIcon({ filled, className = '' }: RadarIconProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const prevFilledRef = useRef(filled);

  // Detect transition from unfilled to filled (only after user interaction)
  useEffect(() => {
    if (filled && !prevFilledRef.current && userHasInteracted) {
      setIsAnimating(true);
    }
    prevFilledRef.current = filled;
  }, [filled]);

  const handleAnimationEnd = () => {
    setIsAnimating(false);
  };

  // During animation, show sweep effect
  if (isAnimating) {
    return (
      <div className={`relative ${className}`}>
        {/* Base unfilled icon (gray) */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="absolute inset-0 w-full h-full text-gray-400"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        </svg>
        {/* Filled icon revealed by sweep */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.0}
          className="absolute inset-0 w-full h-full text-indigo-600 animate-radar-sweep"
          aria-hidden="true"
          onAnimationEnd={handleAnimationEnd}
        >
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        </svg>
        {/* Animated radar wedge - grows, rotates, then shrinks */}
        {/* Sized to 75% to match radar outer ring (r=9 in 24x24 viewBox) */}
        <div
          className="absolute rounded-full animate-radar-wedge"
          aria-hidden="true"
          style={{
            width: '75%',
            height: '75%',
            top: '12.5%',
            left: '12.5%',
            background: `conic-gradient(
              from 0deg at 50% 50%,
              transparent var(--wedge-start),
              rgba(79, 70, 229, 0.5) var(--wedge-start),
              rgba(79, 70, 229, 0.1) var(--wedge-end),
              transparent var(--wedge-end)
            )`,
          }}
        />
      </div>
    );
  }

  if (filled) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.0}
        className={className}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
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
