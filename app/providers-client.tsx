'use client';

import { useState, type ReactNode } from 'react';
import { ApolloProvider } from '@apollo/client/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { AuthProvider } from '@/src/components/AuthProvider';
import { AuthErrorFallback } from '@/src/components/AuthErrorFallback';
import { DemoModeProvider } from '@/src/demo/demo-context';
import { createApolloClient } from '@/src/lib/apollo-client';
import { NextJsRouterProvider } from './NextJsRouterProvider';
import { logger } from '@/src/utils/logger';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 30 * 60 * 1000, // 30 minutes
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export default function ClientProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());
  const [apolloClient] = useState(() => createApolloClient());

  return (
    <ApolloProvider client={apolloClient}>
      <QueryClientProvider client={queryClient}>
        <NextJsRouterProvider>
          <DemoModeProvider>
            <ErrorBoundary
              FallbackComponent={AuthErrorFallback}
              onError={(error, errorInfo) => {
                logger.error('Auth Error Boundary caught an error:', { error, errorInfo });
              }}
            >
              <AuthProvider isNextJs>{children}</AuthProvider>
            </ErrorBoundary>
          </DemoModeProvider>
        </NextJsRouterProvider>
      </QueryClientProvider>
    </ApolloProvider>
  );
}
