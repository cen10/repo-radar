import { StrictMode, type ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import './index.css';
import App from './App.tsx';
import { ErrorFallback } from './components/ErrorFallback';

// Error logging function for root boundary
function logError(error: Error, errorInfo: ErrorInfo) {
  console.error('Root Error Boundary caught an error:', error, errorInfo);

  // In production, you would send to an error reporting service:
  // errorReporting.captureException(error, {
  //   tags: { boundary: 'root' },
  //   extra: errorInfo
  // });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={logError}
      onReset={() => {
        console.log('Root error boundary reset');
      }}
    >
      <App />
    </ErrorBoundary>
  </StrictMode>
);
