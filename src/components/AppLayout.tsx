import { useState, useCallback, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { AuthProvider } from './AuthProvider';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { SidebarRadarList } from './SidebarRadarList';
import { CreateRadarModal } from './CreateRadarModal';
import { DemoBanner } from './DemoBanner';
import { useAuth } from '../hooks/use-auth';
import { useDemoMode } from '../demo/demo-context';

/**
 * Inner layout component that uses auth context.
 * Separated from AppLayout so it can access useAuth.
 */
function AuthenticatedLayout() {
  const { user } = useAuth();
  const { isBannerVisible } = useDemoMode();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCreateRadarModalOpen, setIsCreateRadarModalOpen] = useState(false);
  const [transitionsEnabled, setTransitionsEnabled] = useState(false);

  // Enable transitions after initial render to prevent layout shift on page load
  useEffect(() => {
    requestAnimationFrame(() => setTransitionsEnabled(true));
  }, []);

  const handleMenuToggle = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const handleSidebarClose = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  const handleOpenCreateRadarModal = useCallback(() => {
    setIsCreateRadarModalOpen(true);
  }, []);

  const handleCloseCreateRadarModal = useCallback(() => {
    setIsCreateRadarModalOpen(false);
  }, []);

  const handleToggleCollapsed = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev);
  }, []);

  // Only show sidebar for authenticated users
  const showSidebar = !!user;

  return (
    <div className="min-h-screen bg-white">
      <DemoBanner />
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
          <SidebarRadarList
            onLinkClick={handleSidebarClose}
            onCreateRadar={handleOpenCreateRadarModal}
          />
        </Sidebar>
      )}
      <main
        className={`${isBannerVisible ? 'pt-40 min-[400px]:pt-[118px]' : 'pt-16'} ${transitionsEnabled ? 'transition-[padding] duration-300 ease-in-out' : ''} ${showSidebar ? (isSidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64') : ''}`}
      >
        <Outlet />
      </main>

      {/* TODO: Use onSuccess to navigate to the newly created radar via useNavigate */}
      {isCreateRadarModalOpen && <CreateRadarModal onClose={handleCloseCreateRadarModal} />}
    </div>
  );
}

/**
 * App layout component that wraps all routes.
 * Provides AuthProvider context and renders the authenticated layout.
 *
 * Used as the root element in createBrowserRouter configuration.
 */
export function AppLayout() {
  return (
    <AuthProvider>
      <AuthenticatedLayout />
    </AuthProvider>
  );
}
