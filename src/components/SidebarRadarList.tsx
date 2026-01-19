import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { getRadars, RADAR_LIMITS } from '../services/radar';
import type { RadarWithCount } from '../types/database';
import { SidebarTooltip } from './Sidebar';
import { LoadingSpinner } from './icons';

const SIDEBAR_ANIMATION_DURATION = 300;

// Radar icon - concentric circles representing radar (outline version)
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

// Radar icon - filled version for active state (bullseye pattern)
// Radii are 0.75 larger than outline version to account for stroke width
function RadarIconSolid({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {/* Layered circles: purple -> white -> purple -> white -> purple (center) */}
      <circle cx="12" cy="12" r="9.75" />
      <circle cx="12" cy="12" r="8.25" fill="white" />
      <circle cx="12" cy="12" r="6.75" />
      <circle cx="12" cy="12" r="5.25" fill="white" />
      <circle cx="12" cy="12" r="3.75" />
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
  hideText: boolean;
  onLinkClick: () => void;
}

function RadarNavItem({ radar, collapsed, hideText, onLinkClick }: RadarNavItemProps) {
  return (
    <SidebarTooltip label={radar.name} show={collapsed}>
      <NavLink
        to={`/radar/${radar.id}`}
        onClick={onLinkClick}
        aria-label={`${radar.name}, ${radar.repo_count} repositories`}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors overflow-hidden ${
            isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
          }`
        }
      >
        {({ isActive }) => (
          <>
            {isActive ? (
              <RadarIconSolid className="h-5 w-5 shrink-0" />
            ) : (
              <RadarIcon className="h-5 w-5 shrink-0" />
            )}
            <span
              aria-hidden="true"
              className={`flex-1 truncate whitespace-nowrap overflow-hidden transition-all duration-300 motion-reduce:transition-none ${
                hideText ? 'w-0' : 'w-auto'
              }`}
            >
              {radar.name}
            </span>
            <span
              aria-hidden="true"
              className={`text-gray-400 text-xs shrink-0 whitespace-nowrap overflow-hidden transition-all duration-300 motion-reduce:transition-none ${
                hideText ? 'w-0' : 'w-auto'
              }`}
            >
              {radar.repo_count}
            </span>
          </>
        )}
      </NavLink>
    </SidebarTooltip>
  );
}

function LoadingSkeleton() {
  return (
    <div
      data-testid="radar-list-loading"
      className="space-y-2"
      aria-busy="true"
      aria-label="Loading radars"
    >
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-3 py-2 animate-pulse motion-reduce:animate-none"
        >
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

const MINIMUM_LOADING_DISPLAY_MS = 600;

function ErrorState({ onRetry }: ErrorStateProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = () => {
    setIsRetrying(true);
    // Minimum display time for loading state to give users confidence
    setTimeout(() => {
      onRetry();
    }, MINIMUM_LOADING_DISPLAY_MS);
  };

  return (
    <div className="px-3 py-4 text-center" role="alert">
      <p className="text-sm text-gray-500 mb-2">Failed to load radars</p>
      <button
        onClick={handleRetry}
        disabled={isRetrying}
        aria-busy={isRetrying}
        className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
      >
        {isRetrying ? (
          <>
            <LoadingSpinner className="h-3 w-3" />
            Retrying...
          </>
        ) : (
          <>
            <ArrowPathIcon className="h-3 w-3" aria-hidden="true" />
            Retry
          </>
        )}
      </button>
    </div>
  );
}

interface EmptyStateProps {
  hideText: boolean;
  onCreateRadar: () => void;
}

function EmptyState({ hideText, onCreateRadar }: EmptyStateProps) {
  // pl-11 = 44px (12px nav padding + 20px icon + 12px gap) to align with nav text
  return (
    <div className="pl-11 pr-3 py-4">
      <p
        className={`text-sm text-gray-500 mb-3 whitespace-nowrap overflow-hidden transition-all duration-300 motion-reduce:transition-none ${
          hideText ? 'w-0' : 'w-auto'
        }`}
      >
        No radars yet.
      </p>
      <button
        onClick={onCreateRadar}
        className={`inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-500 font-medium whitespace-nowrap overflow-hidden transition-all duration-300 motion-reduce:transition-none ${
          hideText ? 'w-0' : 'w-auto'
        }`}
      >
        <PlusIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        Create Radar
      </button>
    </div>
  );
}

interface CreateButtonProps {
  hideText: boolean;
  onClick: () => void;
  disabled: boolean;
}

function CreateButton({ hideText, onClick, disabled }: CreateButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={
        disabled
          ? `You've reached the radar limit (${RADAR_LIMITS.MAX_RADARS_PER_USER}). Delete a radar to create a new one.`
          : undefined
      }
      className={`flex items-center gap-3 w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
        disabled
          ? 'text-gray-400 cursor-not-allowed'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <PlusIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span
        className={`whitespace-nowrap overflow-hidden transition-all duration-300 motion-reduce:transition-none ${
          hideText ? 'w-0' : 'w-auto'
        }`}
      >
        New Radar
      </span>
    </button>
  );
}

export function SidebarRadarList({ collapsed, onLinkClick, onCreateRadar }: SidebarRadarListProps) {
  // Delay hiding text when collapsing so it slides out with the panel
  const [hideText, setHideText] = useState(collapsed);

  useEffect(() => {
    if (collapsed) {
      // Collapsing: delay w-0 until animation completes so text slides out
      const timer = setTimeout(() => setHideText(true), SIDEBAR_ANIMATION_DURATION);
      return () => clearTimeout(timer);
    } else {
      // Expanding: immediately show text so it slides in
      setHideText(false);
    }
  }, [collapsed]);

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
        <EmptyState hideText={hideText} onCreateRadar={onCreateRadar} />
      </div>
    );
  }

  // Normal state with radars
  return (
    <div data-testid="radar-list" className="space-y-1">
      {/* Section header */}
      <div className="pl-11 pr-3 py-2">
        <span
          className={`text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap overflow-hidden transition-all duration-300 motion-reduce:transition-none inline-block ${
            hideText ? 'w-0' : 'w-auto'
          }`}
        >
          My Radars
        </span>
        <span
          className={`text-xs text-gray-400 ml-1 whitespace-nowrap overflow-hidden transition-all duration-300 motion-reduce:transition-none inline-block ${
            hideText ? 'w-0' : 'w-auto'
          }`}
        >
          ({radars.length}/{RADAR_LIMITS.MAX_RADARS_PER_USER})
        </span>
      </div>

      {/* Radar list */}
      {radars.map((radar) => (
        <RadarNavItem
          key={radar.id}
          radar={radar}
          collapsed={collapsed}
          hideText={hideText}
          onLinkClick={onLinkClick}
        />
      ))}

      {/* Create button */}
      <CreateButton hideText={hideText} onClick={onCreateRadar} disabled={isAtLimit} />
    </div>
  );
}
