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
  /** If provided, defers animation until modalOpen becomes false */
  modalOpen?: boolean;
}

/**
 * Radar icon with filled/outline states and sweep animation.
 * Filled = repo is tracked in at least one radar (thicker strokes)
 * Outline = repo is not tracked (thinner strokes)
 *
 * When transitioning from unfilled to filled, a sweep animation plays.
 * Animation only triggers after user has interacted with the page.
 * If modalOpen prop is used, animation defers until modal closes.
 */
export function RadarIcon({ filled, className = '', modalOpen }: RadarIconProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const prevFilledRef = useRef(filled);
  const [pendingAnimation, setPendingAnimation] = useState(false);
  // Track deferred filled state - stays false while modal is open
  const [deferredFilled, setDeferredFilled] = useState(filled);

  // Detect transitions and defer visual changes while modal is open
  useEffect(() => {
    const wasUnfilled = !prevFilledRef.current;
    const justBecameFilled = filled && wasUnfilled && userHasInteracted;
    const isModalOpenAndTracked = modalOpen !== undefined && modalOpen;

    if (justBecameFilled) {
      if (isModalOpenAndTracked) {
        // Defer animation until modal closes
        setPendingAnimation(true);
      } else {
        // Animate immediately
        setIsAnimating(true);
        setDeferredFilled(true);
      }
    } else if (!filled) {
      if (!isModalOpenAndTracked) {
        // Sync immediately (if modal open, keep showing purple until it closes)
        setDeferredFilled(false);
        setPendingAnimation(false);
      }
    }
    prevFilledRef.current = filled;
  }, [filled, modalOpen]);

  // When modal closes, sync visual state with actual state
  useEffect(() => {
    if (modalOpen === false) {
      if (pendingAnimation && filled) {
        // Deferred fill transition - animate now
        setPendingAnimation(false);
        setIsAnimating(true);
        setDeferredFilled(true);
      } else if (deferredFilled !== filled) {
        // Deferred unfill transition - sync without animation
        setDeferredFilled(filled);
        setPendingAnimation(false);
      }
    }
  }, [modalOpen, pendingAnimation, filled, deferredFilled]);

  // Use deferredFilled for visual state when modalOpen is tracked, otherwise use filled directly
  const displayFilled = modalOpen !== undefined ? deferredFilled : filled;

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

  if (displayFilled) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.0}
        className={`${className} text-indigo-600`}
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
      className={`${className} text-gray-400`}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
