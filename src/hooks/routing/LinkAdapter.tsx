'use client';

import type { ReactNode, MouseEvent } from 'react';
import { useRouterAdapter } from './router-context';

interface LinkAdapterProps {
  to: string;
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
  'data-tour'?: string;
  onClick?: () => void;
}

/**
 * Universal Link component that works in both Next.js and Vite.
 *
 * Requires being wrapped in a RouterProvider (NextJsRouterProvider or ViteRouterProvider).
 */
export function LinkAdapter({
  to,
  children,
  className,
  'aria-label': ariaLabel,
  'data-tour': dataTour,
  onClick,
}: LinkAdapterProps) {
  const adapter = useRouterAdapter();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onClick?.();
    adapter.navigate(to);
  };

  return (
    <a
      href={to}
      onClick={handleClick}
      className={className}
      aria-label={ariaLabel}
      data-tour={dataTour}
    >
      {children}
    </a>
  );
}
