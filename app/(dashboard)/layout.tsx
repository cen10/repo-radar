'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/src/components/Header';
import { Sidebar } from '@/src/components/Sidebar';
import { SidebarRadarList } from '@/src/components/SidebarRadarList';
import { CreateRadarModal } from '@/src/components/CreateRadarModal';
import { DemoBanner } from '@/src/components/DemoBanner';
import { OnboardingTour } from '@/src/components/OnboardingTour';
import { useDemoMode } from '@/src/demo/use-demo-mode';
import { OnboardingProvider } from '@/src/contexts/onboarding-context';
import { ShepherdJourneyProvider } from 'react-shepherd';

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { isBannerVisible } = useDemoMode();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCreateRadarModalOpen, setIsCreateRadarModalOpen] = useState(false);
  const [transitionsEnabled, setTransitionsEnabled] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setTransitionsEnabled(true));
  }, []);

  const handleMenuToggle = () => setIsSidebarOpen((prev) => !prev);
  const handleSidebarClose = () => setIsSidebarOpen(false);
  const handleOpenCreateRadarModal = () => setIsCreateRadarModalOpen(true);
  const handleCloseCreateRadarModal = () => setIsCreateRadarModalOpen(false);
  const handleToggleCollapsed = () => setIsSidebarCollapsed((prev) => !prev);

  const isDesktop = window.innerWidth >= 1024;

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
        {children}
      </main>

      {isCreateRadarModalOpen && <CreateRadarModal onClose={handleCloseCreateRadarModal} />}

      {isDesktop && <OnboardingTour />}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ShepherdJourneyProvider>
      <OnboardingProvider>
        <DashboardLayoutInner>{children}</DashboardLayoutInner>
      </OnboardingProvider>
    </ShepherdJourneyProvider>
  );
}
