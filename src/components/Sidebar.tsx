import { useState, useEffect, createContext, useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { StarIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from '@heroicons/react/24/outline';
import { useDemoMode } from '../demo/use-demo-mode';
import clsx from 'clsx';

const SIDEBAR_ANIMATION_DURATION = 300;

// Context for sidebar collapsed state - allows children to adapt to mobile vs desktop context
interface SidebarContextValue {
  collapsed: boolean;
  hideText: boolean;
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  hideText: false,
});

// eslint-disable-next-line react-refresh/only-export-components -- one-liner tightly coupled to Sidebar, minimal dev impact
export const useSidebarContext = () => useContext(SidebarContext);

interface SidebarTooltipProps {
  label: string;
  show: boolean;
  children: React.ReactNode;
  position?: 'right' | 'bottom';
}

export function SidebarTooltip({ label, show, children, position = 'right' }: SidebarTooltipProps) {
  const isRight = position === 'right';
  const tooltipBase =
    'pointer-events-none absolute whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-has-focus-visible:opacity-100 z-tooltip';
  const tooltipRight = 'left-full top-1/2 -translate-y-1/2 ml-2';
  const tooltipBottom = 'top-full left-0 mt-1';
  const arrowBase = 'absolute border-4 border-transparent';
  const arrowRight = 'right-full top-1/2 -translate-y-1/2 border-r-gray-900';
  const arrowBottom = 'bottom-full left-[22px] border-b-gray-900';

  return (
    <div className="group relative">
      {children}
      {show && (
        <span
          className={clsx(tooltipBase, isRight && tooltipRight, !isRight && tooltipBottom)}
          role="tooltip"
          aria-hidden="true"
        >
          {label}
          <span className={clsx(arrowBase, isRight && arrowRight, !isRight && arrowBottom)} />
        </span>
      )}
    </div>
  );
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  dataTour?: string;
}

const navItems: NavItem[] = [
  { to: '/stars', label: 'My Stars', icon: StarIcon },
  { to: '/explore', label: 'Explore', icon: GlobeAltIcon, dataTour: 'explore-link' },
];

interface NavContentProps {
  collapsed: boolean;
  hideText: boolean;
  onLinkClick: () => void;
  children?: React.ReactNode;
}

function NavContent({ collapsed, hideText, onLinkClick, children }: NavContentProps) {
  const navLinkBase =
    'flex items-center py-2 text-sm font-medium transition-colors overflow-hidden rounded-lg';
  const navLinkLayout = collapsed ? 'justify-center px-2 outline-none' : 'gap-3 px-3';
  const navLinkActive = 'bg-indigo-100 text-indigo-700';
  const navLinkInactive = 'text-gray-700 hover:bg-indigo-50';
  const iconWrapperFocus =
    'p-1 -m-1 rounded-lg group-has-focus-visible:ring-2 group-has-focus-visible:ring-indigo-600 group-has-focus-visible:ring-offset-2';
  const labelBase =
    'whitespace-nowrap overflow-hidden transition-all duration-300 motion-reduce:transition-none';

  return (
    <div className="space-y-1 pt-8 pb-4 px-2">
      {navItems.map(({ to, label, icon: Icon, dataTour }) => (
        <SidebarTooltip key={to} label={label} show={collapsed}>
          <NavLink
            to={to}
            onClick={onLinkClick}
            data-tour={dataTour}
            className={({ isActive }) =>
              clsx(
                navLinkBase,
                navLinkLayout,
                isActive && navLinkActive,
                !isActive && navLinkInactive
              )
            }
          >
            <>
              {/* Focus ring on icon wrapper when collapsed, on full link when expanded */}
              <span className={clsx('shrink-0', collapsed && iconWrapperFocus)}>
                <Icon className="h-5 w-5 text-indigo-600" aria-hidden="true" />
              </span>
              <span className={clsx(labelBase, hideText ? 'w-0' : 'w-auto')}>{label}</span>
            </>
          </NavLink>
        </SidebarTooltip>
      ))}

      {children && (
        <>
          <div className="border-t border-gray-200 my-4" aria-hidden="true" />
          <SidebarContext value={{ collapsed, hideText }}>{children}</SidebarContext>
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
      className="absolute right-0 translate-x-1/2 top-2 z-fixed flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
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
  topClass: string;
  heightClass: string;
  children: React.ReactNode;
}

function MobileDrawer({ isOpen, onClose, topClass, heightClass, children }: MobileDrawerProps) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="lg:hidden">
      <DialogBackdrop
        transition
        data-testid="sidebar-backdrop"
        className="fixed inset-0 bg-black/50 z-modal-backdrop transition-opacity duration-300 data-closed:opacity-0"
      />
      <DialogPanel
        transition
        className={`fixed left-0 ${topClass} ${heightClass} w-64 bg-white border-r border-slate-300 z-fixed transition-all duration-300 ease-in-out data-closed:-translate-x-full`}
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
  onToggleCollapsed: () => void;
  topClass: string;
  heightClass: string;
  children: React.ReactNode;
}

function DesktopSidebar({
  isCollapsed,
  onToggleCollapsed,
  topClass,
  heightClass,
  children,
}: DesktopSidebarProps) {
  return (
    <div
      className={`
        hidden lg:block fixed left-0 ${topClass} ${heightClass} z-fixed
        transition-all duration-300 ease-in-out motion-reduce:transition-none overflow-visible
        ${isCollapsed ? 'w-16' : 'w-64'}
      `}
    >
      <CollapseButton isCollapsed={isCollapsed} onToggle={onToggleCollapsed} />
      <aside className="h-full bg-white border-r border-slate-300 overflow-visible">
        <nav aria-label="Main navigation" className="flex flex-col">
          {children}
        </nav>
      </aside>
    </div>
  );
}

interface SidebarProps {
  children?: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
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
  isCollapsed,
  onToggleCollapsed,
}: SidebarProps) {
  const { isBannerVisible } = useDemoMode();
  const [hideText, setHideText] = useState(isCollapsed);

  // Shared by MobileDrawer and DesktopSidebar
  // Adjusts for demo banner (54px) + header (64px) = 118px when banner visible
  const topClass = isBannerVisible ? 'top-[118px]' : 'top-16';
  const heightClass = isBannerVisible ? 'h-[calc(100vh-118px)]' : 'h-[calc(100vh-4rem)]';

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
      <MobileDrawer isOpen={isOpen} onClose={onClose} topClass={topClass} heightClass={heightClass}>
        <NavContent collapsed={false} hideText={false} onLinkClick={onClose}>
          {children}
        </NavContent>
      </MobileDrawer>

      <DesktopSidebar
        isCollapsed={isCollapsed}
        onToggleCollapsed={onToggleCollapsed}
        topClass={topClass}
        heightClass={heightClass}
      >
        <NavContent collapsed={isCollapsed} hideText={hideText} onLinkClick={onClose}>
          {children}
        </NavContent>
      </DesktopSidebar>
    </>
  );
}
