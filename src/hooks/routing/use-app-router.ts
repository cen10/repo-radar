import { useRouterAdapter, type RouterAdapter } from './router-context';
import { useViteParams } from './use-vite-params';

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
  const adapter = useRouterAdapter();

  // For Vite/React Router: params must be fetched from inside the matched route,
  // not from where ViteRouterProvider renders (which is outside Routes).
  // This hook safely returns empty object in Next.js where react-router context doesn't exist.
  const viteParams = useViteParams(adapter.isNextJs);

  // In Vite, override the adapter params with fresh params from useParams.
  // In Next.js, the adapter already has the correct params from the App Router.
  if (!adapter.isNextJs) {
    return {
      ...adapter,
      params: viteParams,
    };
  }

  return adapter;
}
