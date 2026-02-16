import { DEMO_MODE_KEY } from './DemoContext';

/**
 * Check if demo mode is active by reading localStorage directly.
 *
 * Use this ONLY in non-React code (services, utilities, loaders) where
 * you don't have access to React context. In React components, use
 * the `useDemoMode()` hook instead for reactive updates.
 *
 * This reads localStorage which is updated synchronously before React
 * state in enterDemoMode/exitDemoMode, so it stays in sync.
 */
export function isDemoModeActive(): boolean {
  return localStorage.getItem(DEMO_MODE_KEY) === 'true';
}
