'use client';

import { useCallback } from 'react';
import { usePathname, useParams, useRouter } from 'next/navigation';
import type { RouterAdapter } from './router-context';

export function useNextJsRouterAdapter(): RouterAdapter {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();

  // Stable reference for useEffect dependency arrays
  const navigate = useCallback((path: string) => router.push(path), [router]);

  return {
    pathname,
    params: params as Record<string, string>,
    navigate,
    isNextJs: true,
  };
}
