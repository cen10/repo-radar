import { useRouterAdapter, type RouterAdapter } from './router-context';

/**
 * Universal router hook that works in both Next.js and Vite.
 *
 * Requires being wrapped in a RouterProvider:
 * - In Next.js: NextJsRouterProvider (in app/NextJsRouterProvider.tsx)
 * - In Vite: ViteRouterProvider (wraps React Router hooks)
 *
 * This enables shared components to work in both environments during migration.
 */
export function useAppRouter(): RouterAdapter {
  return useRouterAdapter();
}
