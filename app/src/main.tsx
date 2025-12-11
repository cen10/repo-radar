import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import './index.css';
import App from './App.tsx';
import { GenericErrorFallback } from './components/GenericErrorFallback';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary
      FallbackComponent={GenericErrorFallback}
      onError={(error, errorInfo) => {
        console.error('Root Error Boundary caught an error:', error, errorInfo);

        // In production, you would send to an error reporting service:
        // errorReporting.captureException(error, {
        //   tags: { boundary: 'root' },
        //   extra: errorInfo
        // });
      }}
      onReset={() => {
        console.log('Root error boundary reset');
      }}
    >
      <App />
    </ErrorBoundary>
  </StrictMode>
);
