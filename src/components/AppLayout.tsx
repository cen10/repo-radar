import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { AuthProvider } from './AuthProvider';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { SidebarRadarList } from './SidebarRadarList';
import { CreateRadarModal } from './CreateRadarModal';
import { useAuth } from '../hooks/use-auth';

/**
 * Inner layout component that uses auth context.
 * Separated from AppLayout so it can access useAuth.
 */
function AuthenticatedLayout() {
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
    <div className="min-h-screen bg-white">
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
        <Outlet />
      </main>

      {/* TODO: Use onSuccess to navigate to the newly created radar via useNavigate */}
      {isCreateRadarModalOpen && <CreateRadarModal onClose={handleCreateRadarModalClose} />}
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
