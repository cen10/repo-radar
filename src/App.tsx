import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './components/AuthProvider';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { SidebarRadarList } from './components/SidebarRadarList';
import { CreateRadarModal } from './components/CreateRadarModal';
import Home from './pages/Home';
import StarsPage from './pages/StarsPage';
import ExplorePage from './pages/ExplorePage';
import RadarPage from './pages/RadarPage';
import RepoDetailPage from './pages/RepoDetailPage';
import { AuthErrorFallback } from './components/AuthErrorFallback';
import { logger } from './utils/logger';
import { useAuth } from './hooks/use-auth';

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

function AppLayout() {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCreateRadarModalOpen, setIsCreateRadarModalOpen] = useState(false);

  const handleMenuToggle = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const handleSidebarClose = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  const handleCreateRadar = useCallback(() => {
    setIsCreateRadarModalOpen(true);
  }, []);

  const handleCreateRadarModalClose = useCallback(() => {
    setIsCreateRadarModalOpen(false);
  }, []);

  const handleToggleCollapsed = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev);
  }, []);

  // Only show sidebar for authenticated users
  const showSidebar = !!user;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onMenuToggle={showSidebar ? handleMenuToggle : undefined}
        sidebarCollapsed={showSidebar ? isSidebarCollapsed : undefined}
      />
      {showSidebar && (
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={handleSidebarClose}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapsed={handleToggleCollapsed}
        >
          <SidebarRadarList onLinkClick={handleSidebarClose} onCreateRadar={handleCreateRadar} />
        </Sidebar>
      )}
      <main
        className={`pt-16 transition-[padding] duration-300 ease-in-out ${showSidebar ? (isSidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64') : ''}`}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/stars" element={<StarsPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/radar/:id" element={<RadarPage />} />
          <Route path="/repo/:id" element={<RepoDetailPage />} />
        </Routes>
      </main>

      {isCreateRadarModalOpen && <CreateRadarModal onClose={handleCreateRadarModalClose} />}
    </div>
  );
}

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
            <AppLayout />
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
