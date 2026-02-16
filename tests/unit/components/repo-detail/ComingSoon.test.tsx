import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComingSoon } from '@/components/repo-detail/ComingSoon';

describe('ComingSoon', () => {
  it('renders the Coming Soon heading', () => {
    render(<ComingSoon />);

    expect(screen.getByRole('heading', { name: /coming soon/i })).toBeInTheDocument();
  });

  it('lists historical star tracking feature', () => {
    render(<ComingSoon />);

    expect(screen.getByText(/historical star tracking/i)).toBeInTheDocument();
    expect(screen.getByText(/sparklines/i)).toBeInTheDocument();
  });

  it('lists trend analysis feature', () => {
    render(<ComingSoon />);

    expect(screen.getByText(/trend analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/growth rates/i)).toBeInTheDocument();
  });

  it('hides icons from screen readers', () => {
    render(<ComingSoon />);

    const icons = document.querySelectorAll('svg');
    icons.forEach((icon) => {
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
