import { render, type RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { createTestQueryClient } from './query-client';

interface RenderWithRouterOptions {
  route?: string;
}

interface RenderWithProvidersOptions extends RenderWithRouterOptions {
  queryClient?: QueryClient;
}

interface RenderWithProvidersResult extends RenderResult {
  queryClient: QueryClient;
}

/**
 * Renders a component wrapped in MemoryRouter for testing components that use routing.
 */
export const renderWithRouter = (
  ui: React.ReactElement,
  { route = '/' }: RenderWithRouterOptions = {}
): RenderResult => {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
};

/**
 * Renders a component wrapped in QueryClientProvider and MemoryRouter.
 * Returns the render result plus the queryClient for cache invalidation testing.
 */
export const renderWithProviders = (
  ui: React.ReactElement,
  { route = '/', queryClient }: RenderWithProvidersOptions = {}
): RenderWithProvidersResult => {
  const client = queryClient ?? createTestQueryClient();
  return {
    ...render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </QueryClientProvider>
    ),
    queryClient: client,
  };
};

/**
 * Creates a wrapper component for use with renderHook.
 * Returns both the wrapper and the queryClient for assertions.
 */
export const createQueryClientWrapper = (queryClient?: QueryClient) => {
  const client = queryClient ?? createTestQueryClient();
  return {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
    queryClient: client,
  };
};
