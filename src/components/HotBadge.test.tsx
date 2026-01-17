import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HotBadge } from './HotBadge';
import {
  HOT_REPO_MIN_STARS,
  HOT_REPO_MIN_GROWTH_RATE,
  HOT_REPO_MIN_STARS_GAINED,
} from '../utils/metrics';

describe('HotBadge', () => {
  describe('rendering', () => {
    it('renders badge when all hot criteria are met', () => {
      render(<HotBadge stars={200} growthRate={0.3} starsGained={60} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Hot')).toBeInTheDocument();
    });

    it('renders badge at exact threshold values', () => {
      render(
        <HotBadge
          stars={HOT_REPO_MIN_STARS}
          growthRate={HOT_REPO_MIN_GROWTH_RATE}
          starsGained={HOT_REPO_MIN_STARS_GAINED}
        />
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('does not render when stars below threshold', () => {
      render(<HotBadge stars={99} growthRate={0.3} starsGained={60} />);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('does not render when growth rate below threshold', () => {
      render(<HotBadge stars={200} growthRate={0.24} starsGained={60} />);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('does not render when stars gained below threshold', () => {
      render(<HotBadge stars={200} growthRate={0.3} starsGained={49} />);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has accessible label for screen readers', () => {
      render(<HotBadge stars={200} growthRate={0.3} starsGained={60} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveAccessibleName(/trending/i);
    });

    it('hides emoji from screen readers with aria-hidden', () => {
      render(<HotBadge stars={200} growthRate={0.3} starsGained={60} />);

      const emoji = screen.getByText('🔥');
      expect(emoji).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('styling', () => {
    it('applies custom className when provided', () => {
      render(<HotBadge stars={200} growthRate={0.3} starsGained={60} className="custom-class" />);

      // className is applied to the wrapper element (parent of the badge)
      const badge = screen.getByRole('status');
      expect(badge.parentElement).toHaveClass('custom-class');
    });
  });

  describe('tooltip', () => {
    it('has tooltip text explaining hot criteria', () => {
      render(<HotBadge stars={200} growthRate={0.3} starsGained={60} />);

      // Tooltip is aria-hidden (decorative), query by text content
      expect(screen.getByText(/25%\+ growth/)).toBeInTheDocument();
      expect(screen.getByText(/50\+ new stars/)).toBeInTheDocument();
    });
  });
});
