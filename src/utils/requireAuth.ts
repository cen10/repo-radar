import { redirect } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { logger } from './logger';

/**
 * Route loader that requires authentication.
 * Redirects to home page if user is not authenticated.
 *
 * Usage in router config:
 * ```tsx
 * {
 *   path: '/stars',
 *   element: <StarsPage />,
 *   loader: requireAuth,
 * }
 * ```
 */
export async function requireAuth() {
  logger.debug('requireAuth: Checking session...');

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    logger.warn('requireAuth: Error getting session', { error: error.message });
  }

  if (!session) {
    logger.info('requireAuth: No session found, redirecting to home');
    return redirect('/');
  }

  logger.debug('requireAuth: Session valid', {
    userId: session.user?.id,
    expiresAt: session.expires_at,
  });

  return null; // Continue to route
}
