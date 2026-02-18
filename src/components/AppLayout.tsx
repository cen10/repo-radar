import { useState, useCallback, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { SidebarRadarList } from './SidebarRadarList';
import { CreateRadarModal } from './CreateRadarModal';
import { DemoBanner } from './DemoBanner';
import { OnboardingTour } from './OnboardingTour';
import { useDemoMode } from '../demo/use-demo-mode';
import { OnboardingProvider } from '../contexts/onboarding-context';
import { ShepherdJourneyProvider } from 'react-shepherd';

/**
 * Inner layout component for protected routes.
 * User is guaranteed to exist due to requireAuth loader at layout level.
 */
function ProtectedLayout() {
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

  // Skip onboarding tour on mobile - the experience is desktop-optimized
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;

  return (
    <div className="min-h-screen bg-slate-50">
      <DemoBanner />
      <Header onMenuToggle={handleMenuToggle} sidebarCollapsed={isSidebarCollapsed} />
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
      <main
        className={`${isBannerVisible ? 'pt-[118px]' : 'pt-16'} ${transitionsEnabled ? 'transition-[padding] duration-300 ease-in-out' : ''} ${isSidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}
      >
        <Outlet />
      </main>

      {/* TODO: Use onSuccess to navigate to the newly created radar via useNavigate */}
      {isCreateRadarModalOpen && <CreateRadarModal onClose={handleCloseCreateRadarModal} />}

      {isDesktop && <OnboardingTour />}
    </div>
  );
}

/**
 * App layout component that wraps protected routes.
 * Renders sidebar, header, and onboarding tour for authenticated users.
 *
 * Used as the root element in createBrowserRouter configuration with
 * requireAuth loader at the layout level.
 */
export function AppLayout() {
  return (
    <ShepherdJourneyProvider>
      <OnboardingProvider>
        <ProtectedLayout />
      </OnboardingProvider>
    </ShepherdJourneyProvider>
  );
}
