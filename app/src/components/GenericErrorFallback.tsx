import { useState, useEffect, useRef } from 'react';
import type { FallbackProps } from 'react-error-boundary';
import { ExclamationCircleIcon, ArrowPathIcon, LoadingSpinner } from './icons';

export function GenericErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const retryButtonRef = useRef<HTMLButtonElement>(null);

  // Focus the retry button on mount
  useEffect(() => {
    retryButtonRef.current?.focus();
  }, []);

  const handleRetry = () => {
    setIsRetrying(true);
    // Small delay to show loading state before reset
    setTimeout(() => {
      resetErrorBoundary();
    }, 100);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center p-8" role="alert" aria-live="assertive">
        <div className="mb-6">
          <ExclamationCircleIcon className="mx-auto h-16 w-16 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h1>
        <p className="text-gray-600 mb-6">
          We encountered an unexpected error. Please try refreshing the page or contact support if
          the problem persists.
        </p>
        <button
          ref={retryButtonRef}
          onClick={handleRetry}
          disabled={isRetrying}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          aria-busy={isRetrying}
        >
          {isRetrying ? (
            <>
              <LoadingSpinner className="w-4 h-4 mr-2" />
              Retrying...
            </>
          ) : (
            <>
              <ArrowPathIcon className="w-4 h-4 mr-2" />
              Try Again
            </>
          )}
        </button>

        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left w-full max-w-none">
            <summary className="cursor-pointer text-sm text-gray-700 hover:text-gray-900">
              Error Details (Development Only)
            </summary>
            <pre
              className="mt-2 text-sm bg-gray-800 text-gray-100 p-4 rounded-md overflow-auto 
        max-h-100 whitespace-pre-wrap break-words hover:[&::-webkit-scrollbar-thumb]:bg-gray-400"
            >
              {error.message}
              {'\n\n'}
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
