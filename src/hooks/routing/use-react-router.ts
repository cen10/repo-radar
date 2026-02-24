import { useLocation, useParams, useNavigate } from 'react-router-dom';
import type { RouterAdapter } from './router-context';

export function useReactRouterAdapter(): RouterAdapter {
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();

  return {
    pathname: location.pathname,
    params: params as Record<string, string>,
    navigate: (path: string) => navigate(path),
    isNextJs: false,
  };
}
