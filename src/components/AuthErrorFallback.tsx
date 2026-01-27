import { useState, useEffect, useRef } from 'react';
import type { FallbackProps } from 'react-error-boundary';
import { ExclamationCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Button } from './Button';

export function AuthErrorFallback({ error: _error, resetErrorBoundary }: FallbackProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const retryButtonRef = useRef<HTMLButtonElement>(null);

  // Focus the retry button on mount
  useEffect(() => {
    retryButtonRef.current?.focus();
  }, []);

  const handleRetry = () => {
    setIsRetrying(true);
    // Minimum display time for loading state to give users confidence
    // that their action was registered and is being processed
    setTimeout(() => {
      resetErrorBoundary();
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center p-8" role="alert" aria-live="assertive">
        <div className="mb-6">
          <ExclamationCircleIcon className="mx-auto h-16 w-16 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Error</h1>
        <p className="text-gray-600 mb-6">
          We're having trouble with the login system. This might be a temporary issue.
        </p>
        <Button
          ref={retryButtonRef}
          onClick={handleRetry}
          loading={isRetrying}
          loadingText="Retrying..."
          fullWidth
        >
          <ArrowPathIcon className="w-4 h-4 mr-2" />
          Try Again
        </Button>
        <p className="text-sm text-gray-500 mt-6">
          If this continues, please contact support with the timestamp:{' '}
          {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
}
