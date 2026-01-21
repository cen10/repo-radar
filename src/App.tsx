import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/AppLayout';
import Home from './pages/Home';
import StarsPage from './pages/StarsPage';
import ExplorePage from './pages/ExplorePage';
import RadarPage from './pages/RadarPage';
import RepoDetailPage from './pages/RepoDetailPage';
import { AuthErrorFallback } from './components/AuthErrorFallback';
import { requireAuth } from './utils/requireAuth';
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

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <Home /> },
      {
        path: '/stars',
        element: <StarsPage />,
        loader: requireAuth,
      },
      {
        path: '/explore',
        element: <ExplorePage />,
        loader: requireAuth,
      },
      {
        path: '/radar/:id',
        element: <RadarPage />,
        loader: requireAuth,
      },
      {
        path: '/repo/:id',
        element: <RepoDetailPage />,
        loader: requireAuth,
      },
    ],
  },
]);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary
        FallbackComponent={AuthErrorFallback}
        onError={(error, errorInfo) => {
          logger.error('Auth Error Boundary caught an error:', { error, errorInfo });
        }}
      >
        <RouterProvider router={router} />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
