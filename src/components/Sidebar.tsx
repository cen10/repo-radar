import { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { StarIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from '@heroicons/react/24/outline';

interface SidebarProps {
  children?: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeIcon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { to: '/stars', label: 'My Stars', icon: StarIcon, activeIcon: StarIconSolid },
  { to: '/explore', label: 'Explore', icon: GlobeAltIcon, activeIcon: GlobeAltIcon },
];

export function Sidebar({ children, isOpen = false, onClose }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  // Escape key closes drawer
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus management for mobile drawer
  useEffect(() => {
    if (isOpen) {
      const firstFocusable = sidebarRef.current?.querySelector<HTMLElement>('a, button');
      firstFocusable?.focus();
    }
  }, [isOpen]);

  return (
    <>
      {/* Backdrop - only visible when drawer is open on mobile/tablet */}
      {isOpen && (
        <div
          data-testid="sidebar-backdrop"
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`
          fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-gray-200
          transition-all duration-300 ease-in-out z-40
          lg:translate-x-0
          ${isCollapsed ? 'lg:w-16' : 'lg:w-64'}
          ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full'}
        `}
      >
        <nav aria-label="Main navigation" className="flex flex-col h-full">
          <div className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
                  } ${isCollapsed ? 'justify-center' : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive ? (
                      <item.activeIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    ) : (
                      <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    )}
                    {!isCollapsed && <span>{item.label}</span>}
                  </>
                )}
              </NavLink>
            ))}

            {/* Divider */}
            {children && (
              <>
                <div className="border-t border-gray-200 my-4" aria-hidden="true" />
                {children}
              </>
            )}
          </div>

          {/* Collapse toggle - desktop only */}
          <button
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="hidden lg:flex items-center justify-center w-full p-4 border-t border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? (
              <ChevronDoubleRightIcon className="h-5 w-5" aria-hidden="true" />
            ) : (
              <ChevronDoubleLeftIcon className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </nav>
      </aside>
    </>
  );
}
