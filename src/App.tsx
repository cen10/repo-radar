import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './components/AuthProvider';
import { Header } from './components/Header';
import Home from './pages/Home';
import StarsPage from './pages/StarsPage';
import ExplorePage from './pages/ExplorePage';
import RadarPage from './pages/RadarPage';
import RepoDetailPage from './pages/RepoDetailPage';
import { AuthErrorFallback } from './components/AuthErrorFallback';
import { logger } from './utils/logger';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
                <Route path="/stars" element={<StarsPage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/radar/:id" element={<RadarPage />} />
                <Route path="/repo/:id" element={<RepoDetailPage />} />
              </Routes>
            </div>
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
