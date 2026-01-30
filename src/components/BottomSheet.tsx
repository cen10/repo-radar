import { useRef, useCallback } from 'react';
import type { ReactNode, TouchEvent } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { Button } from './Button';

const SWIPE_THRESHOLD = 100;

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  doneLabel?: string;
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  doneLabel = 'Done',
}: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const currentTranslateY = useRef(0);
  const isSwipeGesture = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    currentTranslateY.current = 0;
    // Only allow swipe gesture if scrollable content is at top
    const scrollTop = scrollRef.current?.scrollTop ?? 0;
    isSwipeGesture.current = scrollTop === 0;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (touchStartY.current === null || !panelRef.current) return;
    // Don't interfere with content scrolling
    if (!isSwipeGesture.current) return;

    const deltaY = e.touches[0].clientY - touchStartY.current;

    // Only allow downward swipe (positive delta)
    if (deltaY > 0) {
      currentTranslateY.current = deltaY;
      panelRef.current.style.transform = `translateY(${deltaY}px)`;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!panelRef.current) return;

    // Always reset inline transform before any action
    panelRef.current.style.transform = '';

    if (isSwipeGesture.current && currentTranslateY.current > SWIPE_THRESHOLD) {
      onClose();
    }

    touchStartY.current = null;
    currentTranslateY.current = 0;
    isSwipeGesture.current = false;
  }, [onClose]);

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/50 transition-opacity duration-200 data-closed:opacity-0"
      />
      <div className="fixed inset-0 flex items-end justify-center px-4 pt-2 pb-0">
        <DialogPanel
          ref={panelRef}
          transition
          data-testid="bottom-sheet-panel"
          className="w-full max-h-[calc(100vh-5rem)] rounded-t-2xl bg-white shadow-xl transition-transform duration-300 ease-out data-closed:translate-y-full motion-reduce:transition-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          {/* Drag handle indicator */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="h-1 w-10 rounded-full bg-gray-300" aria-hidden="true" />
          </div>

          <div className="px-4" style={{ paddingBottom: 'env(safe-area-inset-bottom, 1rem)' }}>
            <DialogTitle className="text-lg font-semibold text-gray-900">{title}</DialogTitle>

            <div ref={scrollRef} className="mt-4 max-h-[60vh] overflow-y-auto">
              {children}
            </div>

            <div className="mt-6 pb-4">
              <Button variant="primary" className="w-full" onClick={onClose}>
                {doneLabel}
              </Button>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
