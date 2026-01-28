import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DynamicRadarIcon } from './DynamicRadarIcon';

describe('DynamicRadarIcon', () => {
  it('renders outline icon when filled is false', () => {
    const { container } = render(<DynamicRadarIcon filled={false} modalOpen={false} />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('fill', 'none');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg).toHaveAttribute('stroke-width', '1.5');
  });

  it('renders filled icon when filled is true', () => {
    const { container } = render(<DynamicRadarIcon filled={true} modalOpen={false} />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('fill', 'none');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    // Filled state has thicker strokes
    expect(svg).toHaveAttribute('stroke-width', '2');
  });

  it('applies custom className', () => {
    const { container } = render(
      <DynamicRadarIcon filled={false} modalOpen={false} className="h-5 w-5 text-gray-500" />
    );

    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-5', 'w-5', 'text-gray-500');
  });

  it('has aria-hidden for decorative purposes', () => {
    const { container } = render(<DynamicRadarIcon filled={false} modalOpen={false} />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('uses thicker strokes for filled state to indicate active', () => {
    const { container: outlineContainer } = render(
      <DynamicRadarIcon filled={false} modalOpen={false} />
    );
    const { container: filledContainer } = render(
      <DynamicRadarIcon filled={true} modalOpen={false} />
    );

    const outlineSvg = outlineContainer.querySelector('svg');
    const filledSvg = filledContainer.querySelector('svg');

    // Both use same structure (circles), but different stroke widths
    expect(outlineSvg).toHaveAttribute('stroke-width', '1.5');
    expect(filledSvg).toHaveAttribute('stroke-width', '2');
  });
});
