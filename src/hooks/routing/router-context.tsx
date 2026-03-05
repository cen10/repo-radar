'use client';

import { createContext, useContext, type ReactNode } from 'react';

export interface NavigateOptions {
  replace?: boolean;
}

export interface RouterAdapter {
  pathname: string;
  params: Record<string, string>;
  navigate: (path: string, options?: NavigateOptions) => void;
  isNextJs: boolean;
}

const RouterContext = createContext<RouterAdapter | null>(null);

/**
 * Get the router adapter from context.
 * Returns null if not in a RouterProvider (e.g., Vite without wrapper).
 */
export function useRouterAdapterOptional(): RouterAdapter | null {
  return useContext(RouterContext);
}

/**
 * Get the router adapter, throwing if not available.
 */
export function useRouterAdapter(): RouterAdapter {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouterAdapter must be used within a RouterProvider');
  }
  return context;
}

export function RouterProvider({
  children,
  adapter,
}: {
  children: ReactNode;
  adapter: RouterAdapter;
}) {
  return <RouterContext value={adapter}>{children}</RouterContext>;
}
