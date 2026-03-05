'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

// Dynamically import providers with ssr: false
// This ensures all browser-dependent code (localStorage, useQueryClient, etc.)
// only runs on the client, following the official Next.js migration pattern
const ClientProviders = dynamic(() => import('./providers-client'), {
  ssr: false,
});

export function Providers({ children }: { children: ReactNode }) {
  return <ClientProviders>{children}</ClientProviders>;
}
