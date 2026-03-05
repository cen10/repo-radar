import type { ReactNode } from 'react';
import { RouterProvider } from './router-context';
import { useReactRouterAdapter } from './use-react-router';

/**
 * Router provider for Vite that uses React Router hooks.
 *
 * This should be used inside React Router's RouterProvider/BrowserRouter
 * to bridge React Router's context with our RouterAdapter abstraction.
 */
export function ViteRouterProvider({ children }: { children: ReactNode }) {
  const adapter = useReactRouterAdapter();
  return <RouterProvider adapter={adapter}>{children}</RouterProvider>;
}
