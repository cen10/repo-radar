import type { FallbackProps } from 'react-error-boundary';
import { ExclamationCircleIcon, ArrowPathIcon } from './icons';

export function GenericErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center p-8">
        <div className="mb-6">
          <ExclamationCircleIcon className="mx-auto h-16 w-16 text-red-500" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h1>

        <p className="text-gray-600 mb-6">
          We encountered an unexpected error. Please try refreshing the page or contact support if
          the problem persists.
        </p>

        <div className="space-y-4">
          <button
            onClick={resetErrorBoundary}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center"
          >
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Try Again
          </button>

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Reload Page
          </button>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Error Details (Development Only)
            </summary>
            <pre className="mt-2 text-xs bg-gray-100 p-4 rounded-md overflow-auto max-h-32">
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
