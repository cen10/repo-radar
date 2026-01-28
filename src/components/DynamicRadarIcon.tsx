import type { ComponentProps } from 'react';

interface DynamicRadarIconProps {
  /** Controls filled (active) vs unfilled (inactive) rendering */
  isActive: boolean;
  className?: string;
  /** When true, renders the sweep animation */
  shouldAnimate?: boolean;
  /** Called when the sweep animation completes */
  onAnimationEnd?: () => void;
}

type SvgProps = Omit<ComponentProps<'svg'>, 'children'>;

/** Gray outline icon (inactive state) */
function InactiveIcon(props: SvgProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

/** Indigo filled icon (active state) */
function ActiveIcon(props: SvgProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.0}
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

/** Rotating wedge that reveals the active icon during animation */
function SweepWedge() {
  return (
    <div
      className="absolute rounded-full animate-radar-wedge"
      aria-hidden="true"
      style={{
        width: '75%',
        height: '75%',
        top: '12.5%',
        left: '12.5%',
        background: `conic-gradient(
          from 0deg at 50% 50%,
          transparent var(--wedge-start),
          rgba(79, 70, 229, 0.5) var(--wedge-start),
          rgba(79, 70, 229, 0.1) var(--wedge-end),
          transparent var(--wedge-end)
        )`,
      }}
    />
  );
}

/**
 * Radar icon with filled/outline states and sweep animation.
 * Active = indigo color, thicker strokes
 * Inactive = gray color, thinner strokes
 *
 * Pure presentational component - parent owns all timing logic.
 */
export function DynamicRadarIcon({
  isActive,
  className = '',
  shouldAnimate = false,
  onAnimationEnd,
}: DynamicRadarIconProps) {
  if (shouldAnimate) {
    // Layered reveal: InactiveIcon (base) → ActiveIcon (clipped, revealed by sweep) → SweepWedge (rotating gradient)
    return (
      <div className={`relative ${className}`}>
        <InactiveIcon className="absolute inset-0 w-full h-full text-gray-400" />
        <ActiveIcon
          className="absolute inset-0 w-full h-full text-indigo-600 animate-radar-sweep"
          onAnimationEnd={onAnimationEnd}
        />
        <SweepWedge />
      </div>
    );
  }

  if (isActive) {
    return <ActiveIcon className={`${className} text-indigo-600`} />;
  }

  return <InactiveIcon className={`${className} text-gray-400`} />;
}
