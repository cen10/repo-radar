import type { ReactElement, ReactNode } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext, type AuthContextType } from '@/contexts/auth-context';
import { OnboardingProvider } from '@/contexts/onboarding-context';
import { createTestQueryClient } from './query-client';
import { createMockAuthContext } from '../mocks/factories';

interface IntegrationRenderOptions {
  route?: string;
  authState?: Partial<AuthContextType>;
  queryClient?: QueryClient;
  routes?: Array<{ path: string; element: ReactNode }>;
}

interface IntegrationRenderResult extends RenderResult {
  queryClient: QueryClient;
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
  ui: ReactElement,
  options: IntegrationRenderOptions = {}
): IntegrationRenderResult {
  const { route = '/', authState = {}, queryClient, routes = [] } = options;

  const client = queryClient ?? createTestQueryClient();
  const authContext = createMockAuthContext(authState);

  const routeElements =
    routes.length > 0 ? (
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
      <OnboardingProvider>
        <AuthContext.Provider value={authContext}>
          <MemoryRouter initialEntries={[route]}>{routeElements}</MemoryRouter>
        </AuthContext.Provider>
      </OnboardingProvider>
    </QueryClientProvider>
  );

  return {
    ...rendered,
    queryClient: client,
    authContext,
  };
}
