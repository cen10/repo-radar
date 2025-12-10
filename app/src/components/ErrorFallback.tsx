import type { FallbackProps } from 'react-error-boundary';
import { ExclamationCircleIcon, ArrowPathIcon } from './icons';

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
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

export function AuthErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center p-8">
        <div className="mb-6">
          <ExclamationCircleIcon className="mx-auto h-16 w-16 text-red-500" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Error</h1>

        <p className="text-gray-600 mb-6">
          We're having trouble with the login system. This might be a temporary issue.
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
            onClick={() => (window.location.href = '/help')}
            className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Get Help
          </button>
        </div>

        <p className="text-sm text-gray-500 mt-6">
          If this continues, please contact support with the timestamp:{' '}
          {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export function DashboardErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-md p-6 m-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">Dashboard Temporarily Unavailable</h3>
          <div className="mt-2 text-sm text-red-700">
            <p>We're having trouble loading your dashboard data. Your information is safe.</p>
          </div>
          <div className="mt-4 flex space-x-3">
            <button
              onClick={resetErrorBoundary}
              className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
            >
              Retry Dashboard
            </button>
            <button
              onClick={() => {
                // Could implement offline/cached data view here
                resetErrorBoundary();
              }}
              className="bg-white px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-gray-50 border border-red-300"
            >
              Use Cached Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
