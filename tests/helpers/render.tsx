import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { createTestQueryClient } from './query-client';
import { OnboardingProvider } from '../../src/contexts/onboarding-context';

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
  ui: ReactElement,
  { route = '/' }: RenderWithRouterOptions = {}
): RenderResult => {
  return render(
    <OnboardingProvider>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </OnboardingProvider>
  );
};

/**
 * Renders a component wrapped in QueryClientProvider and MemoryRouter.
 * Returns the render result plus the queryClient for cache invalidation testing.
 */
export const renderWithProviders = (
  ui: ReactElement,
  { route = '/', queryClient }: RenderWithProvidersOptions = {}
): RenderWithProvidersResult => {
  const client = queryClient ?? createTestQueryClient();
  return {
    ...render(
      <QueryClientProvider client={client}>
        <OnboardingProvider>
          <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
        </OnboardingProvider>
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
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
    queryClient: client,
  };
};
