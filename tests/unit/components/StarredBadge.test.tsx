import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StarredBadge } from '@/components/StarredBadge';

describe('StarredBadge', () => {
  it('renders with status role and accessible label', () => {
    render(<StarredBadge />);

    expect(screen.getByRole('status', { name: /starred repository/i })).toBeInTheDocument();
  });

  it('displays "Starred" text', () => {
    render(<StarredBadge />);

    expect(screen.getByText('Starred')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<StarredBadge className="custom-class" />);

    const badge = screen.getByRole('status');
    expect(badge).toHaveClass('custom-class');
  });
});
