import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: string | null;
  children: React.ReactNode;
  /** Offset from left edge of trigger element. Default: 28 */
  leftOffset?: number;
  /** Enable touch interactions (show on touch, auto-hide after delay). Default: false */
  enableTouch?: boolean;
  /** Auto-hide delay in ms for touch interactions. Default: 2000 */
  touchHideDelay?: number;
}

/**
 * Portal-based tooltip that escapes overflow containers.
 * Supports both mouse hover (default) and touch interactions (opt-in).
 */
export function Tooltip({
  content,
  children,
  leftOffset = 28,
  enableTouch = false,
  touchHideDelay = 2000,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left + leftOffset,
      });
    }
  }, [leftOffset]);

  const show = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (content) {
      updatePosition();
      setIsVisible(true);
    }
  }, [content, updatePosition]);

  const hide = useCallback(() => {
    setIsVisible(false);
  }, []);

  const hideWithDelay = useCallback(() => {
    timeoutRef.current = setTimeout(hide, touchHideDelay);
  }, [hide, touchHideDelay]);

  const handleMouseEnter = () => show();
  const handleMouseLeave = () => hide();
  const handleTouchStart = enableTouch ? () => show() : undefined;
  const handleTouchEnd = enableTouch ? () => hideWithDelay() : undefined;

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
      {isVisible &&
        content &&
        createPortal(
          <div
            className="fixed z-100 w-max max-w-xs rounded bg-gray-900 px-2 py-1 text-xs text-white pointer-events-none"
            style={{ top: position.top, left: position.left }}
            role="tooltip"
          >
            {content}
            <span className="absolute left-4 bottom-full border-4 border-transparent border-b-gray-900" />
          </div>,
          document.body
        )}
    </>
  );
}
