import { render, type RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext, type AuthContextType } from '../../src/contexts/auth-context';
import { createTestQueryClient } from './query-client';
import { createMockAuthContext } from '../mocks/factories';

interface IntegrationRenderOptions {
  /** Initial route path */
  route?: string;
  /** Override auth context values */
  authState?: Partial<AuthContextType>;
  /** Custom query client (for cache assertions) */
  queryClient?: QueryClient;
  /** Additional routes to render (for testing navigation) */
  routes?: Array<{ path: string; element: React.ReactNode }>;
}

interface IntegrationRenderResult extends RenderResult {
  /** The QueryClient instance for cache assertions */
  queryClient: QueryClient;
  /** The AuthContext value used */
  authContext: AuthContextType;
}

/**
 * Renders a component with all providers needed for integration testing.
 *
 * Unlike unit test render helpers, this sets up:
 * - AuthContext with configurable auth state
 * - QueryClientProvider for TanStack Query
 * - MemoryRouter with optional route configuration
 *
 * Use this for testing complete user flows across multiple components.
 *
 * @example
 * ```tsx
 * const { queryClient } = renderForIntegration(<MyPage />, {
 *   route: '/radars/123',
 *   authState: { user: mockUser },
 * });
 *
 * // Later, assert on cache
 * expect(queryClient.getQueryData(['radars'])).toEqual([...]);
 * ```
 */
export function renderForIntegration(
  ui: React.ReactElement,
  options: IntegrationRenderOptions = {}
): IntegrationRenderResult {
  const { route = '/', authState = {}, queryClient, routes = [] } = options;

  const client = queryClient ?? createTestQueryClient();
  const authContext = createMockAuthContext(authState);

  const routeElements = routes.length > 0 ? (
    <Routes>
      <Route path={route.split('?')[0]} element={ui} />
      {routes.map(({ path, element }) => (
        <Route key={path} path={path} element={element} />
      ))}
    </Routes>
  ) : (
    ui
  );

  const rendered = render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={authContext}>
        <MemoryRouter initialEntries={[route]}>{routeElements}</MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );

  return {
    ...rendered,
    queryClient: client,
    authContext,
  };
}

/**
 * Creates an integration render wrapper for renderHook.
 *
 * @example
 * ```tsx
 * const { wrapper, queryClient, authContext } = createIntegrationWrapper({
 *   authState: { user: mockUser },
 * });
 *
 * const { result } = renderHook(() => useMyHook(), { wrapper });
 * ```
 */
export function createIntegrationWrapper(options: Omit<IntegrationRenderOptions, 'routes'> = {}) {
  const { route = '/', authState = {}, queryClient } = options;

  const client = queryClient ?? createTestQueryClient();
  const authContext = createMockAuthContext(authState);

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={authContext}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );

  return {
    wrapper,
    queryClient: client,
    authContext,
  };
}
