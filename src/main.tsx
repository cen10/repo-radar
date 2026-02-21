import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import './index.css';
import App from './App';
import { GenericErrorFallback } from './components/GenericErrorFallback';
import { logger } from './utils/logger';

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
      <App />
    </ErrorBoundary>
  </StrictMode>
);
