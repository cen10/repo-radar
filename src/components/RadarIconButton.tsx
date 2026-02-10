import { useState, useRef, useEffect } from 'react';
import { useRepoRadars } from '../hooks/useRepoRadars';
import { useIsMobile } from '../hooks/useMediaQuery';
import { DynamicRadarIcon } from './DynamicRadarIcon';
import { ManageRadarsModal } from './ManageRadarsModal';
import { AddToRadarSheet } from './AddToRadarSheet';
import { Button } from './Button';

// Global flag: only enable animation after user has clicked on the page.
// Prevents animation from triggering when the page loads with repos already in radars.
let userHasInteracted = false;
if (typeof window !== 'undefined') {
  const markInteracted = () => {
    userHasInteracted = true;
    window.removeEventListener('click', markInteracted);
  };
  window.addEventListener('click', markInteracted);
}

interface RadarIconButtonProps {
  githubRepoId: number;
  className?: string;
  iconClassName?: string;
  'data-tour'?: string;
}

/**
 * A self-contained radar icon button with animation and modal.
 *
 * Encapsulates:
 * - The radar icon with filled/outline states
 * - Animation on add-to-radar (radar sweep)
 * - The ManageRadarsModal for adding/removing from radars
 * - The useRepoRadars hook for tracking radar membership
 *
 * Use this when you want the standard radar icon behavior.
 * Use DynamicRadarIcon directly if you need custom animation control.
 */
export function RadarIconButton({
  githubRepoId,
  className,
  iconClassName = 'h-7 w-7',
  'data-tour': dataTour,
}: RadarIconButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { radarIds, isLoading } = useRepoRadars(githubRepoId);
  const isMobile = useIsMobile();
  const isInAnyRadar = radarIds.length > 0;

  // Keep a ref to current value for use in callbacks
  const isInAnyRadarRef = useRef(isInAnyRadar);
  isInAnyRadarRef.current = isInAnyRadar;

  // Radar icon animation state
  // null = waiting for initial data load
  const [displayedActive, setDisplayedActive] = useState<boolean | null>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const wasModalOpenRef = useRef(false);

  // Initialize displayedActive once when data loads
  useEffect(() => {
    if (displayedActive === null && !isLoading) {
      setDisplayedActive(isInAnyRadar);
    }
  }, [displayedActive, isInAnyRadar, isLoading]);

  // Handle modal close: animate if added, sync if removed
  useEffect(() => {
    // Detect modal close transition (must check before updating ref)
    const modalJustClosed = wasModalOpenRef.current && !isModalOpen;
    wasModalOpenRef.current = isModalOpen;

    if (!modalJustClosed || displayedActive === null) return;

    const wasAdded = isInAnyRadar && !displayedActive;
    const wasRemoved = !isInAnyRadar && displayedActive;

    if (wasAdded && userHasInteracted) {
      setShouldAnimate(true);
    } else if (wasRemoved) {
      setDisplayedActive(false);
    }
  }, [isModalOpen, isInAnyRadar, displayedActive]);

  const handleAnimationEnd = () => {
    setShouldAnimate(false);
    setDisplayedActive(isInAnyRadarRef.current);
  };

  return (
    <>
      <Button
        variant="ghost-primary"
        size="sm"
        onClick={() => setIsModalOpen(true)}
        className={className}
        aria-label={isInAnyRadar ? 'Manage radars for this repo' : 'Add to radar'}
        data-tour={dataTour}
      >
        <DynamicRadarIcon
          isActive={displayedActive ?? false}
          shouldAnimate={shouldAnimate}
          onAnimationEnd={handleAnimationEnd}
          className={iconClassName}
        />
      </Button>

      {/* Mobile: Bottom sheet (<768px) - keep mounted for exit animations */}
      {isMobile && (
        <AddToRadarSheet
          githubRepoId={githubRepoId}
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {/* Desktop: Modal (>=768px) - keep mounted for exit animations */}
      {!isMobile && (
        <ManageRadarsModal
          githubRepoId={githubRepoId}
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
