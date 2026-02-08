/**
 * MSW browser setup for demo mode.
 * Dynamically starts/stops the service worker for API mocking.
 */

import { setupWorker } from 'msw/browser';
import { handlers, resetDemoState } from './handlers';

// Force full page reload on HMR to avoid MSW getting out of sync with React state.
// Without this, editing demo files causes MSW to stop while React still thinks
// demo mode is active, resulting in 401 errors hitting the real API.
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    window.location.reload();
  });
}

// Lazy-initialized worker instance
let worker: ReturnType<typeof setupWorker> | null = null;
let isStarted = false;
let startPromise: Promise<void> | null = null;

/**
 * Start MSW in demo mode.
 * Intercepts all API calls and returns mock data.
 */
export async function startDemoMode(): Promise<void> {
  // Prevent double-start (React Strict Mode calls useEffect twice)
  if (isStarted) {
    return;
  }

  // If a start is in progress, wait for it
  if (startPromise) {
    return startPromise;
  }

  if (!worker) {
    worker = setupWorker(...handlers);
  }

  // Reset demo state to initial values
  resetDemoState();

  startPromise = worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
  });

  await startPromise;
  isStarted = true;
  startPromise = null;
}

/**
 * Stop MSW and clear the worker.
 */
export function stopDemoMode(): void {
  if (worker) {
    worker.stop();
  }
  isStarted = false;
  startPromise = null;
}
