/**
 * MSW browser setup for demo mode.
 * Dynamically starts/stops the service worker for API mocking.
 */

import { setupWorker } from 'msw/browser';
import { handlers, resetDemoState } from './handlers';

// Force full page reload on HMR to avoid MSW getting out of sync with React state.
// This is also in handlers.ts - both are needed since HMR guards are per-file.
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    window.location.reload();
  });
}

// Lazy-initialized worker instance
let worker: ReturnType<typeof setupWorker> | null = null;
let isStarted = false;
let startPromise: Promise<ServiceWorkerRegistration | undefined> | null = null;

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
    await startPromise;
    return;
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

  try {
    await startPromise;
    isStarted = true;
  } finally {
    startPromise = null;
  }
}

/**
 * Stop MSW and clear the worker.
 */
export async function stopDemoMode(): Promise<void> {
  if (worker) {
    await worker.stop();
  }
  isStarted = false;
  startPromise = null;
}
