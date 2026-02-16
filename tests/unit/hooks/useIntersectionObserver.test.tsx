import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { mockIntersectionObserver } from 'jsdom-testing-mocks';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

const io = mockIntersectionObserver();

describe('useIntersectionObserver', () => {
  beforeEach(() => {
    io.leaveAll();
  });

  it('returns ref callback and initial isIntersecting as false', () => {
    const { result } = renderHook(() => useIntersectionObserver());

    expect(typeof result.current.ref).toBe('function');
    expect(result.current.isIntersecting).toBe(false);
  });

  it('reports intersection when element enters viewport', () => {
    const { result } = renderHook(() => useIntersectionObserver());

    const node = document.createElement('div');
    act(() => {
      result.current.ref(node);
    });

    expect(result.current.isIntersecting).toBe(false);

    act(() => {
      io.enterNode(node);
    });

    expect(result.current.isIntersecting).toBe(true);
  });

  it('reports no intersection when element leaves viewport', () => {
    const { result } = renderHook(() => useIntersectionObserver());

    const node = document.createElement('div');
    act(() => {
      result.current.ref(node);
    });

    act(() => {
      io.enterNode(node);
    });
    expect(result.current.isIntersecting).toBe(true);

    act(() => {
      io.leaveNode(node);
    });
    expect(result.current.isIntersecting).toBe(false);
  });

  it('does not observe when enabled is false', () => {
    const { result } = renderHook(() => useIntersectionObserver({ enabled: false }));

    const node = document.createElement('div');
    act(() => {
      result.current.ref(node);
    });

    act(() => {
      io.enterNode(node);
    });

    // Should remain false because observation is disabled
    expect(result.current.isIntersecting).toBe(false);
  });

  it('starts observing when enabled changes from false to true', () => {
    const { result, rerender } = renderHook(({ enabled }) => useIntersectionObserver({ enabled }), {
      initialProps: { enabled: false },
    });

    const node = document.createElement('div');
    act(() => {
      result.current.ref(node);
    });

    // Enable observation
    rerender({ enabled: true });

    act(() => {
      io.enterNode(node);
    });

    expect(result.current.isIntersecting).toBe(true);
  });

  it('stops observing when enabled changes from true to false', () => {
    const { result, rerender } = renderHook(({ enabled }) => useIntersectionObserver({ enabled }), {
      initialProps: { enabled: true },
    });

    const node = document.createElement('div');
    act(() => {
      result.current.ref(node);
    });

    act(() => {
      io.enterNode(node);
    });
    expect(result.current.isIntersecting).toBe(true);

    // Disable observation - should reset to false
    rerender({ enabled: false });

    expect(result.current.isIntersecting).toBe(false);
  });

  it('handles node being removed (ref called with null)', () => {
    const { result } = renderHook(() => useIntersectionObserver());

    const node = document.createElement('div');
    act(() => {
      result.current.ref(node);
    });

    act(() => {
      io.enterNode(node);
    });
    expect(result.current.isIntersecting).toBe(true);

    // Remove node (simulates unmount)
    act(() => {
      result.current.ref(null);
    });

    // Should reset to false when node is removed
    expect(result.current.isIntersecting).toBe(false);
  });

  it('cleans up observer on unmount', () => {
    const { result, unmount } = renderHook(() => useIntersectionObserver());

    const node = document.createElement('div');
    act(() => {
      result.current.ref(node);
    });

    act(() => {
      io.enterNode(node);
    });
    expect(result.current.isIntersecting).toBe(true);

    unmount();

    // After unmount, entering node should not throw
    // (observer should be disconnected)
    expect(() => {
      io.enterNode(node);
    }).not.toThrow();
  });
});
