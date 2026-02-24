'use client';

import { usePathname, useParams, useRouter } from 'next/navigation';
import type { RouterAdapter } from './router-context';

export function useNextJsRouterAdapter(): RouterAdapter {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();

  return {
    pathname,
    params: params as Record<string, string>,
    navigate: (path: string) => router.push(path),
    isNextJs: true,
  };
}
