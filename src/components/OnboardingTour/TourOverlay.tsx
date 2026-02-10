import { useState, useEffect, useCallback, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { TourPlacement } from './tourSteps';

const SPOTLIGHT_PADDING = 8;
const TOOLTIP_GAP = 12;

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TourOverlayProps {
  target: string;
  content: string;
  placement: TourPlacement;
  spotlightClicks?: boolean;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function getTargetRect(selector: string): TargetRect | null {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height,
  };
}

function scrollToTarget(selector: string) {
  if (!selector) return;
  const el = document.querySelector(selector);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function TourOverlay({
  target,
  content,
  placement,
  spotlightClicks,
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  isFirst,
  isLast,
}: TourOverlayProps) {
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    const rect = getTargetRect(target);
    setTargetRect(rect);
  }, [target]);

  // Scroll target into view and measure position
  useEffect(() => {
    scrollToTarget(target);
    // Wait for scroll to settle
    const timer = setTimeout(updatePosition, 400);
    return () => clearTimeout(timer);
  }, [target, updatePosition]);

  // Update on scroll/resize
  useEffect(() => {
    const handleUpdate = () => updatePosition();
    window.addEventListener('scroll', handleUpdate, { passive: true });
    window.addEventListener('resize', handleUpdate, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleUpdate);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [updatePosition]);

  // Calculate tooltip position after target rect is known and tooltip rendered
  useEffect(() => {
    if (!targetRect || !tooltipRef.current) return;

    const tooltip = tooltipRef.current;
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;
    const viewportWidth = window.innerWidth;

    const spotTop = targetRect.top - SPOTLIGHT_PADDING;
    const spotLeft = targetRect.left - SPOTLIGHT_PADDING;
    const spotWidth = targetRect.width + SPOTLIGHT_PADDING * 2;
    const spotHeight = targetRect.height + SPOTLIGHT_PADDING * 2;

    let top = 0;
    let left = 0;

    switch (placement) {
      case 'bottom':
        top = spotTop + spotHeight + TOOLTIP_GAP;
        left = spotLeft + spotWidth / 2 - tooltipWidth / 2;
        break;
      case 'top':
        top = spotTop - tooltipHeight - TOOLTIP_GAP;
        left = spotLeft + spotWidth / 2 - tooltipWidth / 2;
        break;
      case 'left':
        top = spotTop + spotHeight / 2 - tooltipHeight / 2;
        left = spotLeft - tooltipWidth - TOOLTIP_GAP;
        break;
      case 'right':
        top = spotTop + spotHeight / 2 - tooltipHeight / 2;
        left = spotLeft + spotWidth + TOOLTIP_GAP;
        break;
      case 'center':
        top = spotTop + spotHeight + TOOLTIP_GAP;
        left = spotLeft + spotWidth / 2 - tooltipWidth / 2;
        break;
    }

    // Clamp to viewport
    const scrollX = window.scrollX;
    left = Math.max(scrollX + 12, Math.min(left, scrollX + viewportWidth - tooltipWidth - 12));
    top = Math.max(window.scrollY + 12, top);

    setTooltipPos({ top, left });
  }, [targetRect, placement]);

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (isLast) onSkip();
        else onNext();
      } else if (e.key === 'ArrowLeft') {
        if (!isFirst) onPrev();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrev, onSkip, isFirst, isLast]);

  if (!targetRect) {
    // Target not found — show centered fallback
    return (
      <div className="fixed inset-0 z-[9999]">
        <div className="fixed inset-0 bg-black/50" onClick={onSkip} />
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-5 max-w-sm w-[calc(100%-2rem)] z-[10000]">
          <p className="text-sm text-gray-700 mb-4">{content}</p>
          <TourControls
            currentStep={currentStep}
            totalSteps={totalSteps}
            onNext={onNext}
            onPrev={onPrev}
            onSkip={onSkip}
            isFirst={isFirst}
            isLast={isLast}
          />
        </div>
      </div>
    );
  }

  // Spotlight cutout dimensions
  const spotTop = targetRect.top - SPOTLIGHT_PADDING;
  const spotLeft = targetRect.left - SPOTLIGHT_PADDING;
  const spotWidth = targetRect.width + SPOTLIGHT_PADDING * 2;
  const spotHeight = targetRect.height + SPOTLIGHT_PADDING * 2;

  return (
    <div
      className="fixed inset-0 z-[9999]"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: document.documentElement.scrollHeight,
      }}
    >
      {/* Overlay with spotlight cutout using box-shadow */}
      <div
        className="absolute rounded-lg"
        style={{
          top: spotTop,
          left: spotLeft,
          width: spotWidth,
          height: spotHeight,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
          pointerEvents: spotlightClicks ? 'none' : 'auto',
        }}
      />

      {/* Click blocker for non-spotlight areas */}
      {!spotlightClicks && (
        <>
          {/* Top */}
          <div
            className="absolute left-0 w-full"
            style={{ top: 0, height: spotTop }}
            onClick={onSkip}
          />
          {/* Bottom */}
          <div
            className="absolute left-0 w-full"
            style={{
              top: spotTop + spotHeight,
              bottom: 0,
              height: document.documentElement.scrollHeight - (spotTop + spotHeight),
            }}
            onClick={onSkip}
          />
          {/* Left */}
          <div
            className="absolute"
            style={{ top: spotTop, left: 0, width: spotLeft, height: spotHeight }}
            onClick={onSkip}
          />
          {/* Right */}
          <div
            className="absolute"
            style={{
              top: spotTop,
              left: spotLeft + spotWidth,
              right: 0,
              width: document.documentElement.scrollWidth - (spotLeft + spotWidth),
              height: spotHeight,
            }}
            onClick={onSkip}
          />
        </>
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute bg-white rounded-xl shadow-2xl border border-gray-200 p-5 max-w-sm w-[calc(100vw-2rem)] sm:w-80"
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
        role="dialog"
        aria-label={`Tour step ${currentStep + 1} of ${totalSteps}`}
      >
        <button
          onClick={onSkip}
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 rounded-md"
          aria-label="Close tour"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
        <p className="text-sm text-gray-700 mb-4 pr-6">{content}</p>
        <TourControls
          currentStep={currentStep}
          totalSteps={totalSteps}
          onNext={onNext}
          onPrev={onPrev}
          onSkip={onSkip}
          isFirst={isFirst}
          isLast={isLast}
        />
      </div>
    </div>
  );
}

interface TourControlsProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function TourControls({
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  isFirst,
  isLast,
}: TourControlsProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <button onClick={onSkip} className="text-xs text-gray-500 hover:text-gray-700">
        Skip tour
      </button>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">
          {currentStep + 1}/{totalSteps}
        </span>
        {!isFirst && (
          <button
            onClick={onPrev}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Back
          </button>
        )}
        <button
          onClick={isLast ? onSkip : onNext}
          className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
        >
          {isLast ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
}
