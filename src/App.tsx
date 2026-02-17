import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/AppLayout';
import { AuthProvider } from './components/AuthProvider';
import Home from './pages/Home';
import StarsPage from './pages/StarsPage';
import ExplorePage from './pages/ExplorePage';
import RadarPage from './pages/RadarPage';
import RepoDetailPage from './pages/RepoDetailPage';
import { AuthErrorFallback } from './components/AuthErrorFallback';
import { requireAuth, redirectIfAuthenticated } from './utils/requireAuth';
import { logger } from './utils/logger';
import { DemoModeProvider } from './demo/demo-context';

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

const router = createBrowserRouter([
  // Public route - redirects authenticated users to /stars
  { path: '/', element: <Home />, loader: redirectIfAuthenticated },

  // Protected routes - wrapped in AppLayout with auth at layout level
  {
    element: <AppLayout />,
    loader: requireAuth,
    children: [
      { path: '/stars', element: <StarsPage /> },
      { path: '/explore', element: <ExplorePage /> },
      { path: '/radar/:id', element: <RadarPage /> },
      { path: '/repo/:id', element: <RepoDetailPage /> },
    ],
  },
]);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DemoModeProvider>
        <ErrorBoundary
          FallbackComponent={AuthErrorFallback}
          onError={(error, errorInfo) => {
            logger.error('Auth Error Boundary caught an error:', { error, errorInfo });
          }}
        >
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </ErrorBoundary>
      </DemoModeProvider>
    </QueryClientProvider>
  );
}

export default App;
