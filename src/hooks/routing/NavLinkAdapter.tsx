'use client';

import type { ReactNode } from 'react';
import { useRouterAdapter } from './router-context';

type NavLinkRenderProps = {
  isActive: boolean;
};

interface NavLinkAdapterProps {
  to: string;
  onClick?: () => void;
  children: ReactNode | ((props: NavLinkRenderProps) => ReactNode);
  className?: string | ((props: NavLinkRenderProps) => string);
  'aria-label'?: string;
  'data-tour'?: string;
}

/**
 * Universal NavLink component that works in both Next.js and Vite.
 *
 * Requires being wrapped in a RouterProvider (NextJsRouterProvider or ViteRouterProvider).
 * Supports render props for className and children to enable active state styling.
 */
export function NavLinkAdapter({
  to,
  onClick,
  children,
  className,
  'aria-label': ariaLabel,
  'data-tour': dataTour,
}: NavLinkAdapterProps) {
  const adapter = useRouterAdapter();
  const isActive = adapter.pathname === to || adapter.pathname.startsWith(`${to}/`);

  const resolvedClassName = typeof className === 'function' ? className({ isActive }) : className;
  const resolvedChildren = typeof children === 'function' ? children({ isActive }) : children;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onClick?.();
    adapter.navigate(to);
  };

  return (
    <a
      href={to}
      onClick={handleClick}
      className={resolvedClassName}
      aria-label={ariaLabel}
      data-tour={dataTour}
    >
      {resolvedChildren}
    </a>
  );
}
