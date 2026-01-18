import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';

// Helper to render with router
const renderWithRouter = (ui: React.ReactElement, { route = '/' } = {}) => {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
};

// Default props for tests - Sidebar requires isOpen and onClose
const defaultProps = {
  isOpen: false,
  onClose: vi.fn(),
};

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Navigation', () => {
    it('renders My Stars and Explore nav items', () => {
      renderWithRouter(<Sidebar {...defaultProps} />);

      expect(screen.getByRole('link', { name: /my stars/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /explore/i })).toBeInTheDocument();
    });

    it('links point to correct routes', () => {
      renderWithRouter(<Sidebar {...defaultProps} />);

      expect(screen.getByRole('link', { name: /my stars/i })).toHaveAttribute('href', '/stars');
      expect(screen.getByRole('link', { name: /explore/i })).toHaveAttribute('href', '/explore');
    });

    it('highlights active route with aria-current', () => {
      renderWithRouter(<Sidebar {...defaultProps} />, { route: '/stars' });

      const starsLink = screen.getByRole('link', { name: /my stars/i });
      expect(starsLink).toHaveAttribute('aria-current', 'page');

      const exploreLink = screen.getByRole('link', { name: /explore/i });
      expect(exploreLink).not.toHaveAttribute('aria-current');
    });
  });

  describe('Collapse behavior', () => {
    it('renders collapse toggle button', () => {
      renderWithRouter(<Sidebar {...defaultProps} />);

      expect(screen.getByRole('button', { name: /collapse sidebar/i })).toBeInTheDocument();
    });

    it('toggles collapse state on button click', () => {
      renderWithRouter(<Sidebar {...defaultProps} />);

      const collapseBtn = screen.getByRole('button', { name: /collapse sidebar/i });
      expect(collapseBtn).toHaveAttribute('aria-expanded', 'true');

      fireEvent.click(collapseBtn);

      const expandBtn = screen.getByRole('button', { name: /expand sidebar/i });
      expect(expandBtn).toHaveAttribute('aria-expanded', 'false');
    });

    it('hides text labels when collapsed', () => {
      renderWithRouter(<Sidebar {...defaultProps} />);

      // Initially visible
      expect(screen.getByText(/my stars/i)).toBeVisible();

      // Collapse
      fireEvent.click(screen.getByRole('button', { name: /collapse sidebar/i }));

      // Text should be hidden (not in document when collapsed)
      expect(screen.queryByText(/my stars/i)).not.toBeInTheDocument();
    });

    it('shows tooltips on links when collapsed', () => {
      renderWithRouter(<Sidebar {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /collapse sidebar/i }));

      const starsLink = screen.getByRole('link', { name: /my stars/i });
      expect(starsLink).toHaveAttribute('title', 'My Stars');
    });
  });

  describe('Mobile drawer', () => {
    it('renders backdrop when isOpen is true', () => {
      renderWithRouter(<Sidebar isOpen={true} onClose={() => {}} />);

      expect(screen.getByTestId('sidebar-backdrop')).toBeInTheDocument();
    });

    it('does not render backdrop when isOpen is false', () => {
      renderWithRouter(<Sidebar {...defaultProps} />);

      expect(screen.queryByTestId('sidebar-backdrop')).not.toBeInTheDocument();
    });

    it('calls onClose when backdrop is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithRouter(<Sidebar isOpen={true} onClose={onClose} />);

      await user.click(screen.getByTestId('sidebar-backdrop'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape is pressed', () => {
      const onClose = vi.fn();
      renderWithRouter(<Sidebar isOpen={true} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose on Escape when drawer is closed', () => {
      const onClose = vi.fn();
      renderWithRouter(<Sidebar isOpen={false} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has accessible navigation landmark', () => {
      renderWithRouter(<Sidebar {...defaultProps} />);

      expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
    });

    it('nav items are keyboard focusable', () => {
      renderWithRouter(<Sidebar {...defaultProps} />);

      const starsLink = screen.getByRole('link', { name: /my stars/i });
      const exploreLink = screen.getByRole('link', { name: /explore/i });

      // Links should be focusable (no tabIndex=-1)
      expect(starsLink).not.toHaveAttribute('tabIndex', '-1');
      expect(exploreLink).not.toHaveAttribute('tabIndex', '-1');
    });

    it('icons are hidden from screen readers', () => {
      renderWithRouter(<Sidebar {...defaultProps} />);

      const nav = screen.getByRole('navigation');
      const icons = nav.querySelectorAll('svg');

      icons.forEach((icon) => {
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('Children slot', () => {
    it('renders children in radars section', () => {
      renderWithRouter(
        <Sidebar {...defaultProps}>
          <div data-testid="radar-list">Radars content</div>
        </Sidebar>
      );

      expect(screen.getByTestId('radar-list')).toBeInTheDocument();
    });

    it('renders children after divider', () => {
      renderWithRouter(
        <Sidebar {...defaultProps}>
          <div data-testid="radar-list">Radars</div>
        </Sidebar>
      );

      const nav = screen.getByRole('navigation');
      const divider = nav.querySelector('div[aria-hidden="true"]');
      const radarList = screen.getByTestId('radar-list');

      // Both should be in the nav, with divider before radar list
      expect(nav).toContainElement(divider);
      expect(nav).toContainElement(radarList);
    });
  });
});
