import { ErrorBoundary } from 'react-error-boundary';
import { AuthProvider } from './components/AuthProvider';
import Login from './pages/Login';
import { AuthErrorFallback } from './components/ErrorFallback';

function App() {
  return (
    <ErrorBoundary
      FallbackComponent={AuthErrorFallback}
      onError={(error, errorInfo) => {
        console.error('Auth Error Boundary caught an error:', error, errorInfo);

        // In production, you might want to:
        // - Clear auth tokens if auth-related error
        // - Send to error reporting with 'auth' tag
        // - Track auth flow failures
      }}
      onReset={() => {
        console.log('Auth error boundary reset');
        // Could clear auth state here if needed
      }}
    >
      <AuthProvider>
        <Login />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
