import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { RadarIcon } from './RadarIcon';

describe('RadarIcon', () => {
  it('renders outline icon when filled is false', () => {
    const { container } = render(<RadarIcon filled={false} />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('fill', 'none');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
  });

  it('renders filled icon when filled is true', () => {
    const { container } = render(<RadarIcon filled={true} />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('fill', 'currentColor');
    expect(svg).not.toHaveAttribute('stroke');
  });

  it('applies custom className', () => {
    const { container } = render(<RadarIcon filled={false} className="h-5 w-5 text-gray-500" />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-5', 'w-5', 'text-gray-500');
  });

  it('has aria-hidden for decorative purposes', () => {
    const { container } = render(<RadarIcon filled={false} />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders different SVG structure for filled vs outline', () => {
    const { container: outlineContainer } = render(<RadarIcon filled={false} />);
    const { container: filledContainer } = render(<RadarIcon filled={true} />);

    // Outline uses circle elements
    const outlineCircles = outlineContainer.querySelectorAll('circle');
    expect(outlineCircles.length).toBeGreaterThan(0);

    // Filled uses path element
    const filledPath = filledContainer.querySelector('path');
    expect(filledPath).toBeInTheDocument();
  });
});
