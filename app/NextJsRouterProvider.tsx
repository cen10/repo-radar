'use client';

import type { ReactNode } from 'react';
import { RouterProvider } from '@/src/hooks/routing';
import { useNextJsRouterAdapter } from '@/src/hooks/routing/use-nextjs-router';

export function NextJsRouterProvider({ children }: { children: ReactNode }) {
  const adapter = useNextJsRouterAdapter();
  return <RouterProvider adapter={adapter}>{children}</RouterProvider>;
}
