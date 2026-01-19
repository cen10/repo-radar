import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { StarIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import {
  StarIcon as StarIconSolid,
  GlobeAltIcon as GlobeAltIconSolid,
} from '@heroicons/react/24/solid';
import { ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from '@heroicons/react/24/outline';

const SIDEBAR_ANIMATION_DURATION = 300;

interface SidebarTooltipProps {
  label: string;
  show: boolean;
  children: React.ReactNode;
}

export function SidebarTooltip({ label, show, children }: SidebarTooltipProps) {
  return (
    <div className="group relative">
      {children}
      {show && (
        <span
          className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 z-50"
          role="tooltip"
          aria-hidden="true"
        >
          {label}
          <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
        </span>
      )}
    </div>
  );
}

interface SidebarProps {
  children?: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeIcon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { to: '/stars', label: 'My Stars', icon: StarIcon, activeIcon: StarIconSolid },
  { to: '/explore', label: 'Explore', icon: GlobeAltIcon, activeIcon: GlobeAltIconSolid },
];

interface NavContentProps {
  collapsed: boolean;
  hideText: boolean;
  onLinkClick: () => void;
  children?: React.ReactNode;
}

function NavContent({ collapsed, hideText, onLinkClick, children }: NavContentProps) {
  return (
    <div
      className={`flex-1 space-y-1 pt-8 pb-4 overflow-hidden pl-2 ${collapsed ? 'pr-2' : 'pr-4'}`}
    >
      {navItems.map(({ to, label, icon: Icon, activeIcon: ActiveIcon }) => (
        <SidebarTooltip key={to} label={label} show={collapsed}>
          <NavLink
            to={to}
            onClick={onLinkClick}
            className={({ isActive }) =>
              `flex items-center py-2 text-sm font-medium rounded-lg transition-colors overflow-hidden ${
                hideText ? 'justify-center px-2' : 'gap-3 px-3'
              } ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'}`
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? (
                  <ActiveIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                ) : (
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                )}
                <span
                  className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${
                    hideText ? 'w-0' : 'w-auto'
                  }`}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        </SidebarTooltip>
      ))}

      {children && (
        <>
          <div className="border-t border-gray-200 my-4" aria-hidden="true" />
          {children}
        </>
      )}
    </div>
  );
}

interface CollapseButtonProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

function CollapseButton({ isCollapsed, onToggle }: CollapseButtonProps) {
  return (
    <button
      onClick={onToggle}
      className="absolute right-0 translate-x-1/2 top-2 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50 hover:text-gray-700 transition-colors"
      aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      aria-expanded={!isCollapsed}
    >
      {isCollapsed ? (
        <ChevronDoubleRightIcon className="h-3 w-3" aria-hidden="true" />
      ) : (
        <ChevronDoubleLeftIcon className="h-3 w-3" aria-hidden="true" />
      )}
    </button>
  );
}

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function MobileDrawer({ isOpen, onClose, children }: MobileDrawerProps) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="lg:hidden">
      <DialogBackdrop
        transition
        data-testid="sidebar-backdrop"
        className="fixed inset-0 bg-black/50 z-30 transition-opacity duration-300 data-closed:opacity-0"
      />
      <DialogPanel
        transition
        className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 z-40 transition-transform duration-300 ease-in-out data-closed:-translate-x-full"
      >
        <nav aria-label="Main navigation" className="flex flex-col h-full">
          {children}
        </nav>
      </DialogPanel>
    </Dialog>
  );
}

interface DesktopSidebarProps {
  isCollapsed: boolean;
  onToggleCollapsed?: () => void;
  children: React.ReactNode;
}

function DesktopSidebar({ isCollapsed, onToggleCollapsed, children }: DesktopSidebarProps) {
  return (
    <aside
      className={`
        hidden lg:block fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-gray-200
        transition-all duration-300 ease-in-out z-40
        ${isCollapsed ? 'w-16' : 'w-64'}
      `}
    >
      {onToggleCollapsed && (
        <CollapseButton isCollapsed={isCollapsed} onToggle={onToggleCollapsed} />
      )}
      <nav aria-label="Main navigation" className="flex flex-col h-full">
        {children}
      </nav>
    </aside>
  );
}

/**
 * Responsive sidebar with mobile drawer and desktop sidebar variants.
 *
 * Visibility is controlled by Tailwind CSS breakpoints:
 * - MobileDrawer:   visible < 1024px (lg:hidden on Dialog)
 * - DesktopSidebar: visible ≥ 1024px (hidden lg:block on aside)
 */
export function Sidebar({
  children,
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapsed,
}: SidebarProps) {
  // Delay hiding text when collapsing so it slides out with the panel
  const [hideText, setHideText] = useState(isCollapsed);

  useEffect(() => {
    if (isCollapsed) {
      // Collapsing: delay w-0 until animation completes so text slides out
      const timer = setTimeout(() => setHideText(true), SIDEBAR_ANIMATION_DURATION);
      return () => clearTimeout(timer);
    } else {
      // Expanding: immediately show text so it slides in
      setHideText(false);
    }
  }, [isCollapsed]);

  return (
    <>
      <MobileDrawer isOpen={isOpen} onClose={onClose}>
        <NavContent collapsed={false} hideText={false} onLinkClick={onClose}>
          {children}
        </NavContent>
      </MobileDrawer>

      <DesktopSidebar isCollapsed={isCollapsed} onToggleCollapsed={onToggleCollapsed}>
        <NavContent collapsed={isCollapsed} hideText={hideText} onLinkClick={onClose}>
          {children}
        </NavContent>
      </DesktopSidebar>
    </>
  );
}
