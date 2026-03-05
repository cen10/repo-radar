import { useCallback } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import type { RouterAdapter, NavigateOptions } from './router-context';

export function useReactRouterAdapter(): RouterAdapter {
  const location = useLocation();
  const params = useParams();
  // useNavigate returns a stable reference when using RouterProvider
  const routerNavigate = useNavigate();

  // Wrap to match our interface signature with options support
  const navigate = useCallback(
    (path: string, options?: NavigateOptions) => routerNavigate(path, options),
    [routerNavigate]
  );

  return {
    pathname: location.pathname,
    params: params as Record<string, string>,
    navigate,
    isNextJs: false,
  };
}
