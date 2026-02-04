import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from './Sidebar';
import { renderWithRouter } from '../../tests/helpers/render';

// Default props for tests - Sidebar requires isOpen, onClose, isCollapsed, and onToggleCollapsed
const defaultProps = {
  isOpen: false,
  onClose: vi.fn(),
  isCollapsed: false,
  onToggleCollapsed: vi.fn(),
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

    it('calls onToggleCollapsed on button click', () => {
      const onToggle = vi.fn();
      renderWithRouter(<Sidebar {...defaultProps} onToggleCollapsed={onToggle} />);

      const collapseBtn = screen.getByRole('button', { name: /collapse sidebar/i });
      fireEvent.click(collapseBtn);

      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('shows expand button when collapsed', () => {
      renderWithRouter(<Sidebar {...defaultProps} isCollapsed={true} />);

      const expandBtn = screen.getByRole('button', { name: /expand sidebar/i });
      expect(expandBtn).toHaveAttribute('aria-expanded', 'false');
    });

    it('collapses text to zero width when collapsed', () => {
      renderWithRouter(<Sidebar {...defaultProps} isCollapsed={true} />);

      // Testing CSS classes is an implementation detail, but jsdom doesn't compute
      // actual dimensions. This is a pragmatic proxy for "text is visually hidden."
      const nav = screen.getByRole('navigation');
      const navLinks = nav.querySelectorAll('a');

      navLinks.forEach((link) => {
        const spans = link.querySelectorAll('span');
        const labelSpan = spans[1]; // second span is text, first is icon wrapper
        expect(labelSpan).toBeInTheDocument();
        expect(labelSpan?.className).toContain('w-0');
        expect(labelSpan?.className).toContain('overflow-hidden');
      });
    });

    it('shows tooltips on links when collapsed', () => {
      renderWithRouter(<Sidebar {...defaultProps} isCollapsed={true} />);

      // CSS tooltips should be rendered with role="tooltip"
      const tooltips = screen.getAllByRole('tooltip', { hidden: true });
      expect(tooltips.length).toBeGreaterThanOrEqual(2); // My Stars and Explore

      // Verify tooltip content (tooltips have the label text)
      const tooltipTexts = tooltips.map((t) => t.textContent);
      expect(tooltipTexts).toContain('My Stars');
      expect(tooltipTexts).toContain('Explore');
    });

    it('does not show tooltips when expanded', () => {
      renderWithRouter(<Sidebar {...defaultProps} />);

      // No tooltip elements should exist when expanded
      expect(screen.queryByRole('tooltip', { hidden: true })).not.toBeInTheDocument();
    });

    it('tooltips show on hover and keyboard focus', () => {
      renderWithRouter(<Sidebar {...defaultProps} isCollapsed={true} />);

      const tooltips = screen.getAllByRole('tooltip', { hidden: true });
      tooltips.forEach((tooltip) => {
        // Check that tooltip shows on hover and keyboard focus (focus-visible)
        expect(tooltip.className).toContain('group-hover:opacity-100');
        expect(tooltip.className).toContain('group-has-focus-visible:opacity-100');
      });
    });
  });

  describe('Mobile drawer', () => {
    it('renders backdrop when isOpen is true', () => {
      renderWithRouter(<Sidebar {...defaultProps} isOpen={true} />);

      expect(screen.getByTestId('sidebar-backdrop')).toBeInTheDocument();
    });

    it('does not render backdrop when isOpen is false', () => {
      renderWithRouter(<Sidebar {...defaultProps} />);

      expect(screen.queryByTestId('sidebar-backdrop')).not.toBeInTheDocument();
    });

    it('calls onClose when backdrop is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithRouter(<Sidebar {...defaultProps} isOpen={true} onClose={onClose} />);

      await user.click(screen.getByTestId('sidebar-backdrop'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape is pressed', () => {
      const onClose = vi.fn();
      renderWithRouter(<Sidebar {...defaultProps} isOpen={true} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose on Escape when drawer is closed', () => {
      const onClose = vi.fn();
      renderWithRouter(<Sidebar {...defaultProps} onClose={onClose} />);

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

      expect(divider).toBeInTheDocument();
      expect(divider!.compareDocumentPosition(radarList)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
  });
});
