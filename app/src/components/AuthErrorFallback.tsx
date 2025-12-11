import type { FallbackProps } from 'react-error-boundary';
import { ExclamationCircleIcon, ArrowPathIcon } from './icons';

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
