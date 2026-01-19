import { NavLink } from 'react-router-dom';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { StarIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import {
  StarIcon as StarIconSolid,
  GlobeAltIcon as GlobeAltIconSolid,
} from '@heroicons/react/24/solid';
import { ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from '@heroicons/react/24/outline';

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
  onLinkClick: () => void;
  children?: React.ReactNode;
}

function NavContent({ collapsed, onLinkClick, children }: NavContentProps) {
  return (
    <div className="flex-1 p-4 space-y-1">
      {navItems.map(({ to, label, icon: Icon, activeIcon: ActiveIcon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onLinkClick}
          title={collapsed ? label : undefined}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
            } ${collapsed ? 'justify-center' : ''}`
          }
        >
          {({ isActive }) => (
            <>
              {isActive ? (
                <ActiveIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
              ) : (
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              )}
              {!collapsed && <span>{label}</span>}
            </>
          )}
        </NavLink>
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
      className="flex items-center justify-center w-full p-4 border-t border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors"
      aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      aria-expanded={!isCollapsed}
    >
      {isCollapsed ? (
        <ChevronDoubleRightIcon className="h-5 w-5" aria-hidden="true" />
      ) : (
        <ChevronDoubleLeftIcon className="h-5 w-5" aria-hidden="true" />
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
  children: React.ReactNode;
}

function DesktopSidebar({ isCollapsed, children }: DesktopSidebarProps) {
  return (
    <aside
      className={`
        hidden lg:block fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-gray-200
        transition-all duration-300 ease-in-out z-40
        ${isCollapsed ? 'w-16' : 'w-64'}
      `}
    >
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
  return (
    <>
      <MobileDrawer isOpen={isOpen} onClose={onClose}>
        <NavContent collapsed={false} onLinkClick={onClose}>
          {children}
        </NavContent>
      </MobileDrawer>

      <DesktopSidebar isCollapsed={isCollapsed}>
        <NavContent collapsed={isCollapsed} onLinkClick={onClose}>
          {children}
        </NavContent>
        {onToggleCollapsed && (
          <CollapseButton isCollapsed={isCollapsed} onToggle={onToggleCollapsed} />
        )}
      </DesktopSidebar>
    </>
  );
}
