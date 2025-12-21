import { ErrorBoundary } from 'react-error-boundary';
import { AuthProvider } from './components/AuthProvider';
import { Header } from './components/Header';
import Login from './pages/Login';
import { AuthErrorFallback } from './components/AuthErrorFallback';
import { logger } from './utils/logger';

function App() {
  return (
    <ErrorBoundary
      FallbackComponent={AuthErrorFallback}
      onError={(error, errorInfo) => {
        logger.error('Auth Error Boundary caught an error:', { error, errorInfo });

        // In production, you might want to:
        // - Clear auth tokens if auth-related error
        // - Send to error reporting with 'auth' tag
        // - Track auth flow failures
      }}
    >
      <AuthProvider>
        <Header />
        <Login />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
