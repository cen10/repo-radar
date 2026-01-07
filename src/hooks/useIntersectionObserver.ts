import { useEffect, useRef, useState, useCallback } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

interface UseIntersectionObserverReturn {
  ref: (node: HTMLElement | null) => void;
  isIntersecting: boolean;
}

/**
 * Hook to detect when an element enters the viewport using Intersection Observer API.
 * Useful for infinite scroll - triggers when user scrolls near the bottom of content.
 *
 * @param options.threshold - How much of the element must be visible (0-1). Default: 0
 * @param options.rootMargin - Margin around root (e.g., '100px' to trigger early). Default: '100px'
 * @param options.enabled - Whether observation is active. Default: true
 * @returns ref callback to attach to the sentinel element, and isIntersecting state
 */
export function useIntersectionObserver({
  threshold = 0,
  rootMargin = '100px',
  enabled = true,
}: UseIntersectionObserverOptions = {}): UseIntersectionObserverReturn {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [node, setNode] = useState<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Callback ref pattern - more stable than using useRef directly
  const ref = useCallback((newNode: HTMLElement | null) => {
    setNode(newNode);
  }, []);

  useEffect(() => {
    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    // Don't observe if disabled or no node
    if (!enabled || !node) {
      setIsIntersecting(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [node, threshold, rootMargin, enabled]);

  return { ref, isIntersecting };
}
