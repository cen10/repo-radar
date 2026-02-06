import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { DynamicRadarIcon } from '@/components/DynamicRadarIcon';

describe('DynamicRadarIcon', () => {
  it('renders inactive icon when isActive is false', () => {
    const { container } = render(<DynamicRadarIcon isActive={false} />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('fill', 'none');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg).toHaveAttribute('stroke-width', '1.5');
  });

  it('renders active icon when isActive is true', () => {
    const { container } = render(<DynamicRadarIcon isActive={true} />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('fill', 'none');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg).toHaveAttribute('stroke-width', '2');
  });

  it('applies custom className', () => {
    const { container } = render(
      <DynamicRadarIcon isActive={false} className="h-5 w-5 text-gray-500" />
    );

    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-5', 'w-5', 'text-gray-500');
  });

  it('has aria-hidden for decorative purposes', () => {
    const { container } = render(<DynamicRadarIcon isActive={false} />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('uses thicker strokes for active state', () => {
    const { container: inactiveContainer } = render(<DynamicRadarIcon isActive={false} />);
    const { container: activeContainer } = render(<DynamicRadarIcon isActive={true} />);

    const inactiveSvg = inactiveContainer.querySelector('svg');
    const activeSvg = activeContainer.querySelector('svg');

    expect(inactiveSvg).toHaveAttribute('stroke-width', '1.5');
    expect(activeSvg).toHaveAttribute('stroke-width', '2');
  });

  it('starts animating when shouldAnimate becomes true', () => {
    const { container, rerender } = render(
      <DynamicRadarIcon isActive={true} shouldAnimate={false} />
    );

    // Initially no animation container
    expect(container.querySelector('.animate-radar-sweep')).not.toBeInTheDocument();

    // Trigger animation
    rerender(<DynamicRadarIcon isActive={true} shouldAnimate={true} />);

    // Animation container should appear
    expect(container.querySelector('.animate-radar-sweep')).toBeInTheDocument();
  });

  it('calls onAnimationEnd when animation completes', () => {
    const onAnimationEnd = vi.fn();
    const { container } = render(
      <DynamicRadarIcon isActive={true} shouldAnimate={true} onAnimationEnd={onAnimationEnd} />
    );

    // Find the animated svg and trigger animation end
    const animatedSvg = container.querySelector('.animate-radar-sweep');
    expect(animatedSvg).toBeInTheDocument();

    act(() => {
      animatedSvg?.dispatchEvent(new Event('animationend', { bubbles: true }));
    });

    expect(onAnimationEnd).toHaveBeenCalledTimes(1);
  });

  it('returns to static state after animation ends', () => {
    // Simulate parent behavior: when animation ends, parent clears shouldAnimate
    let shouldAnimate = true;
    const onAnimationEnd = vi.fn(() => {
      shouldAnimate = false;
    });

    const { container, rerender } = render(
      <DynamicRadarIcon
        isActive={true}
        shouldAnimate={shouldAnimate}
        onAnimationEnd={onAnimationEnd}
      />
    );

    // Animation should be showing
    expect(container.querySelector('.animate-radar-sweep')).toBeInTheDocument();

    // Trigger animation end
    const animatedSvg = container.querySelector('.animate-radar-sweep');
    act(() => {
      animatedSvg?.dispatchEvent(new Event('animationend', { bubbles: true }));
    });

    // Parent receives callback and sets shouldAnimate=false, triggering rerender
    expect(onAnimationEnd).toHaveBeenCalled();
    rerender(
      <DynamicRadarIcon
        isActive={true}
        shouldAnimate={shouldAnimate}
        onAnimationEnd={onAnimationEnd}
      />
    );

    // Should return to static active state
    expect(container.querySelector('.animate-radar-sweep')).not.toBeInTheDocument();
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('stroke-width', '2');
  });
});
