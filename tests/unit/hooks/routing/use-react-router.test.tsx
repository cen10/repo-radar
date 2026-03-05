import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useReactRouterAdapter } from '@/hooks/routing/use-react-router';

describe('useReactRouterAdapter', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={['/test']}>{children}</MemoryRouter>
  );

  it('should return pathname from current location', () => {
    const { result } = renderHook(() => useReactRouterAdapter(), { wrapper });

    expect(result.current.pathname).toBe('/test');
  });

  it('should return isNextJs as false', () => {
    const { result } = renderHook(() => useReactRouterAdapter(), { wrapper });

    expect(result.current.isNextJs).toBe(false);
  });

  it('should return a stable navigate function reference across re-renders', () => {
    const { result, rerender } = renderHook(() => useReactRouterAdapter(), { wrapper });

    const firstNavigate = result.current.navigate;

    rerender();
    const secondNavigate = result.current.navigate;

    rerender();
    const thirdNavigate = result.current.navigate;

    // Navigate function should be the same reference across re-renders
    // This is critical for useEffect dependency arrays to work correctly
    expect(secondNavigate).toBe(firstNavigate);
    expect(thirdNavigate).toBe(firstNavigate);
  });
});
