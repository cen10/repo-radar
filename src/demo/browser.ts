/**
 * MSW browser setup for demo mode.
 * Dynamically starts/stops the service worker for API mocking.
 */

import { setupWorker } from 'msw/browser';
import { handlers, resetDemoState } from './handlers';

// Lazy-initialized worker instance
let worker: ReturnType<typeof setupWorker> | null = null;

/**
 * Start MSW in demo mode.
 * Intercepts all API calls and returns mock data.
 */
export async function startDemoMode(): Promise<void> {
  if (!worker) {
    worker = setupWorker(...handlers);
  }

  // Reset demo state to initial values
  resetDemoState();

  await worker.start({
    // Don't log warnings for unhandled requests - just let them through
    onUnhandledRequest: 'bypass',
    // Suppress the "[MSW] Mocking enabled" console message
    quiet: true,
  });
}

/**
 * Stop MSW and clear the worker.
 */
export function stopDemoMode(): void {
  if (worker) {
    worker.stop();
  }
}
