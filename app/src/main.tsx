import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import './index.css';
import App from './App.tsx';
import { GenericErrorFallback } from './components/GenericErrorFallback';
import { logger } from './utils/logger';

// Temporary component to test error fallback UI
function ThrowError(): never {
  throw new Error('Test error to display GenericErrorFallback UI');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary
      FallbackComponent={GenericErrorFallback}
      onError={(error, errorInfo) => {
        logger.error('Root Error Boundary caught an error:', { error, errorInfo });

        // In production, you would send to an error reporting service:
        // errorReporting.captureException(error, {
        //   tags: { boundary: 'root' },
        //   extra: errorInfo
        // });
      }}
    >
      <ThrowError />
      <App />
    </ErrorBoundary>
  </StrictMode>
);
