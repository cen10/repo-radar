import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SidebarRadarList } from './SidebarRadarList';
import * as radarService from '../services/radar';
import * as Sidebar from './Sidebar';
import { createTestQueryClient } from '../test/helpers/query-client';
import { createMockRadar } from '../test/mocks/factories';

// Mock the radar service
vi.mock('../services/radar', () => ({
  getRadars: vi.fn(),
  RADAR_LIMITS: {
    MAX_RADARS_PER_USER: 5,
    MAX_REPOS_PER_RADAR: 25,
    MAX_TOTAL_REPOS: 50,
  },
}));

// Default sidebar context values (expanded state)
const defaultContextValue = { collapsed: false, hideText: false };

// Mock useSidebarContext - defaults to expanded state
vi.spyOn(Sidebar, 'useSidebarContext').mockReturnValue(defaultContextValue);

// Helper to set sidebar context for tests
const setSidebarContext = (value: { collapsed: boolean; hideText: boolean }) => {
  vi.spyOn(Sidebar, 'useSidebarContext').mockReturnValue(value);
};

const defaultProps = {
  onLinkClick: vi.fn(),
  onCreateRadar: vi.fn(),
};

describe('SidebarRadarList', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
    // Reset to default expanded context
    setSidebarContext(defaultContextValue);
  });

  const renderWithProviders = (ui: React.ReactElement, { route = '/' } = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </QueryClientProvider>
    );
  };

  describe('Loading state', () => {
    it('renders loading skeletons while fetching', async () => {
      // Never resolve to keep loading state
      vi.mocked(radarService.getRadars).mockImplementation(() => new Promise(() => {}));

      renderWithProviders(<SidebarRadarList {...defaultProps} />);

      expect(screen.getByTestId('radar-list-loading')).toBeInTheDocument();
    });
  });

  describe('Radar list', () => {
    it('renders radars with names and counts', async () => {
      const mockRadars = [
        createMockRadar({ id: 'r1', name: 'Open Source', repo_count: 12 }),
        createMockRadar({ id: 'r2', name: 'Education', repo_count: 7 }),
      ];
      vi.mocked(radarService.getRadars).mockResolvedValue(mockRadars);

      renderWithProviders(<SidebarRadarList {...defaultProps} />);

      // Wait for radars to load
      expect(await screen.findByText('Open Source')).toBeInTheDocument();
      expect(screen.getByText('Education')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
    });

    it('renders correct links to radar pages', async () => {
      const mockRadars = [createMockRadar({ id: 'radar-abc', name: 'My Radar' })];
      vi.mocked(radarService.getRadars).mockResolvedValue(mockRadars);

      renderWithProviders(<SidebarRadarList {...defaultProps} />);

      const link = await screen.findByRole('link', { name: /my radar/i });
      expect(link).toHaveAttribute('href', '/radar/radar-abc');
    });

    it('highlights active radar', async () => {
      const mockRadars = [createMockRadar({ id: 'radar-active', name: 'Active Radar' })];
      vi.mocked(radarService.getRadars).mockResolvedValue(mockRadars);

      renderWithProviders(<SidebarRadarList {...defaultProps} />, {
        route: '/radar/radar-active',
      });

      const link = await screen.findByRole('link', { name: /active radar/i });
      expect(link).toHaveAttribute('aria-current', 'page');
    });

    it('calls onLinkClick when radar link is clicked', async () => {
      const user = userEvent.setup();
      const onLinkClick = vi.fn();
      const mockRadars = [createMockRadar({ name: 'Click Me' })];
      vi.mocked(radarService.getRadars).mockResolvedValue(mockRadars);

      renderWithProviders(<SidebarRadarList {...defaultProps} onLinkClick={onLinkClick} />);

      const link = await screen.findByRole('link', { name: /click me/i });
      await user.click(link);

      expect(onLinkClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Empty state', () => {
    it('renders empty state when no radars', async () => {
      vi.mocked(radarService.getRadars).mockResolvedValue([]);

      renderWithProviders(<SidebarRadarList {...defaultProps} />);

      expect(await screen.findByText(/no radars yet/i)).toBeInTheDocument();
    });

    it('shows create button in empty state', async () => {
      vi.mocked(radarService.getRadars).mockResolvedValue([]);

      renderWithProviders(<SidebarRadarList {...defaultProps} />);

      expect(await screen.findByRole('button', { name: /create radar/i })).toBeInTheDocument();
    });

    it('collapses empty state text to zero width when collapsed', async () => {
      vi.mocked(radarService.getRadars).mockResolvedValue([]);
      setSidebarContext({ collapsed: true, hideText: true });

      renderWithProviders(<SidebarRadarList {...defaultProps} />);

      // Wait for empty state to render (loading skeleton hidden when collapsed)
      // Testing CSS classes is an implementation detail, but jsdom doesn't compute
      // actual dimensions. This is a pragmatic proxy for "text is visually hidden."
      const emptyText = await screen.findByText(/no radars yet/i);
      expect(emptyText.className).toContain('w-0');
      expect(emptyText.className).toContain('overflow-hidden');
    });
  });

  describe('Error state', () => {
    it('renders error message when fetch fails', async () => {
      vi.mocked(radarService.getRadars).mockRejectedValue(new Error('Failed to fetch'));

      renderWithProviders(<SidebarRadarList {...defaultProps} />);

      expect(await screen.findByText(/failed to load radars/i)).toBeInTheDocument();
    });

    it('shows retry button on error', async () => {
      vi.mocked(radarService.getRadars).mockRejectedValue(new Error('Network error'));

      renderWithProviders(<SidebarRadarList {...defaultProps} />);

      expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('refetches on retry click', async () => {
      const user = userEvent.setup();
      vi.mocked(radarService.getRadars).mockRejectedValueOnce(new Error('First fail'));

      renderWithProviders(<SidebarRadarList {...defaultProps} />);

      const retryButton = await screen.findByRole('button', { name: /retry/i });

      // Now make it succeed
      vi.mocked(radarService.getRadars).mockResolvedValue([
        createMockRadar({ name: 'Success Radar' }),
      ]);

      await user.click(retryButton);

      expect(await screen.findByText('Success Radar')).toBeInTheDocument();
    });
  });

  describe('Create radar button', () => {
    it('renders create radar button', async () => {
      vi.mocked(radarService.getRadars).mockResolvedValue([createMockRadar()]);

      renderWithProviders(<SidebarRadarList {...defaultProps} />);

      expect(await screen.findByRole('button', { name: /new radar/i })).toBeInTheDocument();
    });

    it('calls onCreateRadar when clicked', async () => {
      const user = userEvent.setup();
      const onCreateRadar = vi.fn();
      vi.mocked(radarService.getRadars).mockResolvedValue([createMockRadar()]);

      renderWithProviders(<SidebarRadarList {...defaultProps} onCreateRadar={onCreateRadar} />);

      const createButton = await screen.findByRole('button', {
        name: /new radar/i,
      });
      await user.click(createButton);

      expect(onCreateRadar).toHaveBeenCalledTimes(1);
    });

    it('disables create button when at radar limit', async () => {
      const mockRadars = Array.from({ length: 5 }, (_, i) =>
        createMockRadar({ id: `r${i}`, name: `Radar ${i}` })
      );
      vi.mocked(radarService.getRadars).mockResolvedValue(mockRadars);

      renderWithProviders(<SidebarRadarList {...defaultProps} />);

      const createButton = await screen.findByRole('button', {
        name: /new radar/i,
      });
      expect(createButton).toBeDisabled();
    });

    it('shows tooltip when create button is disabled', async () => {
      const mockRadars = Array.from({ length: 5 }, (_, i) =>
        createMockRadar({ id: `r${i}`, name: `Radar ${i}` })
      );
      vi.mocked(radarService.getRadars).mockResolvedValue(mockRadars);

      renderWithProviders(<SidebarRadarList {...defaultProps} />);

      await screen.findByRole('button', { name: /new radar/i });

      // CSS tooltip shows limit message when disabled
      const tooltip = screen.getByRole('tooltip', { hidden: true });
      expect(tooltip).toHaveTextContent(/limit/i);
    });

    it('collapses create button text to zero width when collapsed', async () => {
      vi.mocked(radarService.getRadars).mockResolvedValue([createMockRadar()]);
      setSidebarContext({ collapsed: true, hideText: true });

      renderWithProviders(<SidebarRadarList {...defaultProps} />);

      // Wait for content to load
      await screen.findByRole('link');

      // Testing CSS classes is an implementation detail, but jsdom doesn't compute
      // actual dimensions. This is a pragmatic proxy for "text is visually hidden."
      const createButton = screen.getByRole('button', { name: /new radar/i });
      const spans = createButton.querySelectorAll('span');
      const textSpan = spans[1]; // second span is text, first is icon wrapper
      expect(textSpan?.className).toContain('w-0');
      expect(textSpan?.className).toContain('overflow-hidden');
    });
  });

  describe('Collapsed mode', () => {
    it('hides radar text when collapsed', async () => {
      const mockRadars = [createMockRadar({ name: 'Collapsed Radar' })];
      vi.mocked(radarService.getRadars).mockResolvedValue(mockRadars);
      setSidebarContext({ collapsed: true, hideText: true });

      renderWithProviders(<SidebarRadarList {...defaultProps} />);

      // Wait for link to appear
      const link = await screen.findByRole('link');

      // Text spans are not rendered when collapsed (for proper centering)
      const nameSpan = link.querySelector('.line-clamp-2');
      expect(nameSpan).not.toBeInTheDocument();

      // CSS tooltips should be rendered with role="tooltip" (one for radar, one for create button)
      const tooltips = screen.getAllByRole('tooltip', { hidden: true });
      expect(tooltips.length).toBe(2);
      expect(tooltips[0]).toHaveTextContent('Collapsed Radar');
      expect(tooltips[1]).toHaveTextContent('New Radar');
    });

    it('does not show tooltip for short names when expanded', async () => {
      const mockRadars = [createMockRadar({ name: 'Short Name' })];
      vi.mocked(radarService.getRadars).mockResolvedValue(mockRadars);

      renderWithProviders(<SidebarRadarList {...defaultProps} />);

      await screen.findByRole('link');

      // No tooltip for radar (short name), but create button never has tooltip when expanded
      expect(screen.queryByRole('tooltip', { hidden: true })).not.toBeInTheDocument();
    });

    it('shows tooltip for long names when expanded', async () => {
      const longName = 'This is a very long radar name that exceeds forty characters';
      const mockRadars = [createMockRadar({ name: longName })];
      vi.mocked(radarService.getRadars).mockResolvedValue(mockRadars);

      renderWithProviders(<SidebarRadarList {...defaultProps} />);

      await screen.findByRole('link');

      // Tooltip should show for truncated name
      const tooltip = screen.getByRole('tooltip', { hidden: true });
      expect(tooltip).toHaveTextContent(longName);
    });

    it('tooltips show on hover and keyboard focus', async () => {
      const mockRadars = [createMockRadar({ name: 'Accessible Radar' })];
      vi.mocked(radarService.getRadars).mockResolvedValue(mockRadars);
      setSidebarContext({ collapsed: true, hideText: true });

      renderWithProviders(<SidebarRadarList {...defaultProps} />);

      await screen.findByRole('link');

      const tooltips = screen.getAllByRole('tooltip', { hidden: true });
      tooltips.forEach((tooltip) => {
        expect(tooltip.className).toContain('group-hover:opacity-100');
        expect(tooltip.className).toContain('group-has-focus-visible:opacity-100');
      });
    });
  });

  describe('Accessibility', () => {
    it('radar items are keyboard accessible', async () => {
      const mockRadars = [createMockRadar({ name: 'Accessible Radar' })];
      vi.mocked(radarService.getRadars).mockResolvedValue(mockRadars);

      renderWithProviders(<SidebarRadarList {...defaultProps} />);

      const link = await screen.findByRole('link', { name: /accessible radar/i });
      expect(link).not.toHaveAttribute('tabIndex', '-1');
    });

    it('icons are hidden from screen readers', async () => {
      const mockRadars = [createMockRadar()];
      vi.mocked(radarService.getRadars).mockResolvedValue(mockRadars);

      renderWithProviders(<SidebarRadarList {...defaultProps} />);

      await screen.findByRole('link');

      const list = screen.getByTestId('radar-list');
      const icons = list.querySelectorAll('svg');

      icons.forEach((icon) => {
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });
});
