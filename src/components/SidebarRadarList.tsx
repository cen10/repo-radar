import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PlusIcon } from '@heroicons/react/24/outline';
import { getRadars, RADAR_LIMITS } from '../services/radar';
import type { RadarWithCount } from '../types/database';
import { SidebarTooltip } from './Sidebar';

// Radar icon - concentric circles representing radar
function RadarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

interface SidebarRadarListProps {
  collapsed: boolean;
  onLinkClick: () => void;
  onCreateRadar: () => void;
}

interface RadarNavItemProps {
  radar: RadarWithCount;
  collapsed: boolean;
  onLinkClick: () => void;
}

function RadarNavItem({ radar, collapsed, onLinkClick }: RadarNavItemProps) {
  return (
    <SidebarTooltip label={radar.name} show={collapsed}>
      <NavLink
        to={`/radar/${radar.id}`}
        onClick={onLinkClick}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
          } ${collapsed ? 'justify-center' : ''}`
        }
      >
        <RadarIcon className="h-5 w-5 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{radar.name}</span>
            <span className="text-gray-400 text-xs">{radar.repo_count}</span>
          </>
        )}
      </NavLink>
    </SidebarTooltip>
  );
}

function LoadingSkeleton() {
  return (
    <div data-testid="radar-list-loading" className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2 animate-pulse">
          <div className="h-5 w-5 bg-gray-200 rounded-full shrink-0" />
          <div className="flex-1 h-4 bg-gray-200 rounded" />
          <div className="h-4 w-6 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

interface ErrorStateProps {
  onRetry: () => void;
}

function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <div className="px-3 py-4 text-center">
      <p className="text-sm text-gray-500 mb-2">Failed to load radars</p>
      <button
        onClick={onRetry}
        className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
      >
        Retry
      </button>
    </div>
  );
}

interface EmptyStateProps {
  onCreateRadar: () => void;
}

function EmptyState({ onCreateRadar }: EmptyStateProps) {
  return (
    <div className="px-3 py-4 text-center">
      <p className="text-sm text-gray-500 mb-3">
        Create your first radar to start tracking repo metrics.
      </p>
      <button
        onClick={onCreateRadar}
        className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-500 font-medium"
      >
        <PlusIcon className="h-4 w-4" aria-hidden="true" />
        Create Radar
      </button>
    </div>
  );
}

interface CreateButtonProps {
  onClick: () => void;
  disabled: boolean;
}

function CreateButton({ onClick, disabled }: CreateButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={
        disabled
          ? `You've reached the radar limit (${RADAR_LIMITS.MAX_RADARS_PER_USER}). Delete a radar to create a new one.`
          : undefined
      }
      className={`flex items-center gap-2 w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
        disabled
          ? 'text-gray-400 cursor-not-allowed'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <PlusIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span>New Radar</span>
    </button>
  );
}

export function SidebarRadarList({ collapsed, onLinkClick, onCreateRadar }: SidebarRadarListProps) {
  const {
    data: radars = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['radars'],
    queryFn: getRadars,
  });

  const isAtLimit = radars.length >= RADAR_LIMITS.MAX_RADARS_PER_USER;

  // Loading state
  if (isLoading) {
    return (
      <div data-testid="radar-list">
        <LoadingSkeleton />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div data-testid="radar-list">
        <ErrorState onRetry={() => refetch()} />
      </div>
    );
  }

  // Empty state
  if (radars.length === 0) {
    return (
      <div data-testid="radar-list">
        {!collapsed && <EmptyState onCreateRadar={onCreateRadar} />}
      </div>
    );
  }

  // Normal state with radars
  return (
    <div data-testid="radar-list" className="space-y-1">
      {/* Section header */}
      {!collapsed && (
        <div className="px-3 py-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            My Radars
          </span>
          <span className="text-xs text-gray-400 ml-1">
            ({radars.length}/{RADAR_LIMITS.MAX_RADARS_PER_USER})
          </span>
        </div>
      )}

      {/* Radar list */}
      {radars.map((radar) => (
        <RadarNavItem
          key={radar.id}
          radar={radar}
          collapsed={collapsed}
          onLinkClick={onLinkClick}
        />
      ))}

      {/* Create button */}
      {!collapsed && <CreateButton onClick={onCreateRadar} disabled={isAtLimit} />}
    </div>
  );
}
