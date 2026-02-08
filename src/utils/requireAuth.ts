import { redirect } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { logger } from './logger';
import { isDemoModeActive } from '../demo/demo-context';

/**
 * Route loader that requires authentication.
 * Redirects to home page if user is not authenticated.
 * Allows demo mode users through without checking Supabase session.
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

  // Allow demo mode users through
  if (isDemoModeActive()) {
    logger.debug('requireAuth: Demo mode active, allowing access');
    return null;
  }

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
