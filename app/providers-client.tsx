'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { AuthProvider } from '@/src/components/AuthProvider';
import { AuthErrorFallback } from '@/src/components/AuthErrorFallback';
import { DemoModeProvider } from '@/src/demo/demo-context';
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

  return (
    <QueryClientProvider client={queryClient}>
      <DemoModeProvider>
        <ErrorBoundary
          FallbackComponent={AuthErrorFallback}
          onError={(error, errorInfo) => {
            logger.error('Auth Error Boundary caught an error:', { error, errorInfo });
          }}
        >
          <AuthProvider>{children}</AuthProvider>
        </ErrorBoundary>
      </DemoModeProvider>
    </QueryClientProvider>
  );
}
