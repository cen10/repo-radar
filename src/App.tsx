import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { AuthProvider } from './components/AuthProvider';
import { Header } from './components/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
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
      <BrowserRouter>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50">
            <Header />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
          </div>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
