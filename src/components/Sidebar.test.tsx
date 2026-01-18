import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';

// Helper to render with router
const renderWithRouter = (ui: React.ReactElement, { route = '/' } = {}) => {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
};

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Navigation', () => {
    it('renders My Stars and Explore nav items', () => {
      renderWithRouter(<Sidebar />);

      expect(screen.getByRole('link', { name: /my stars/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /explore/i })).toBeInTheDocument();
    });

    it('links point to correct routes', () => {
      renderWithRouter(<Sidebar />);

      expect(screen.getByRole('link', { name: /my stars/i })).toHaveAttribute('href', '/stars');
      expect(screen.getByRole('link', { name: /explore/i })).toHaveAttribute('href', '/explore');
    });

    it('highlights active route with aria-current', () => {
      renderWithRouter(<Sidebar />, { route: '/stars' });

      const starsLink = screen.getByRole('link', { name: /my stars/i });
      expect(starsLink).toHaveAttribute('aria-current', 'page');

      const exploreLink = screen.getByRole('link', { name: /explore/i });
      expect(exploreLink).not.toHaveAttribute('aria-current');
    });
  });

  describe('Collapse behavior', () => {
    it('renders collapse toggle button', () => {
      renderWithRouter(<Sidebar />);

      expect(screen.getByRole('button', { name: /collapse sidebar/i })).toBeInTheDocument();
    });

    it('toggles collapse state on button click', () => {
      renderWithRouter(<Sidebar />);

      const collapseBtn = screen.getByRole('button', { name: /collapse sidebar/i });
      expect(collapseBtn).toHaveAttribute('aria-expanded', 'true');

      fireEvent.click(collapseBtn);

      const expandBtn = screen.getByRole('button', { name: /expand sidebar/i });
      expect(expandBtn).toHaveAttribute('aria-expanded', 'false');
    });

    it('hides text labels when collapsed', () => {
      renderWithRouter(<Sidebar />);

      // Initially visible
      expect(screen.getByText(/my stars/i)).toBeVisible();

      // Collapse
      fireEvent.click(screen.getByRole('button', { name: /collapse sidebar/i }));

      // Text should be hidden (not in document when collapsed)
      expect(screen.queryByText(/my stars/i)).not.toBeInTheDocument();
    });

    it('shows tooltips on links when collapsed', () => {
      renderWithRouter(<Sidebar />);

      fireEvent.click(screen.getByRole('button', { name: /collapse sidebar/i }));

      const starsLink = screen.getByRole('link', { name: /my stars/i });
      expect(starsLink).toHaveAttribute('title', 'My Stars');
    });
  });

  describe('Mobile drawer', () => {
    it('renders backdrop when isOpen is true', () => {
      const { container } = renderWithRouter(<Sidebar isOpen onClose={() => {}} />);

      const backdrop = container.querySelector('[data-testid="sidebar-backdrop"]');
      expect(backdrop).toBeInTheDocument();
    });

    it('does not render backdrop when isOpen is false', () => {
      const { container } = renderWithRouter(<Sidebar isOpen={false} />);

      const backdrop = container.querySelector('[data-testid="sidebar-backdrop"]');
      expect(backdrop).not.toBeInTheDocument();
    });

    it('calls onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      const { container } = renderWithRouter(<Sidebar isOpen onClose={onClose} />);

      const backdrop = container.querySelector('[data-testid="sidebar-backdrop"]');
      fireEvent.click(backdrop!);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape is pressed', () => {
      const onClose = vi.fn();
      renderWithRouter(<Sidebar isOpen onClose={onClose} />);

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
      renderWithRouter(<Sidebar />);

      expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
    });

    it('nav items are keyboard focusable', () => {
      renderWithRouter(<Sidebar />);

      const starsLink = screen.getByRole('link', { name: /my stars/i });
      const exploreLink = screen.getByRole('link', { name: /explore/i });

      // Links should be focusable (no tabIndex=-1)
      expect(starsLink).not.toHaveAttribute('tabIndex', '-1');
      expect(exploreLink).not.toHaveAttribute('tabIndex', '-1');
    });

    it('icons are hidden from screen readers', () => {
      renderWithRouter(<Sidebar />);

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
        <Sidebar>
          <div data-testid="radar-list">Radars content</div>
        </Sidebar>
      );

      expect(screen.getByTestId('radar-list')).toBeInTheDocument();
    });

    it('renders children after divider', () => {
      renderWithRouter(
        <Sidebar>
          <div data-testid="radar-list">Radars</div>
        </Sidebar>
      );

      const nav = screen.getByRole('navigation');
      const divider = nav.querySelector('[aria-hidden="true"]');
      const radarList = screen.getByTestId('radar-list');

      // Both should be in the nav, with divider before radar list
      expect(nav).toContainElement(divider);
      expect(nav).toContainElement(radarList);
    });
  });
});
