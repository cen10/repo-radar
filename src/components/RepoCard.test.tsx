import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RepoCard } from './RepoCard';
import type { Repository } from '../types';
import * as radarService from '../services/radar';

// Mock the radar service
vi.mock('../services/radar', () => ({
  getRadarsContainingRepo: vi.fn(),
  getRadars: vi.fn(),
  addRepoToRadar: vi.fn(),
  removeRepoFromRadar: vi.fn(),
  createRadar: vi.fn(),
  RADAR_LIMITS: {
    MAX_RADARS_PER_USER: 5,
    MAX_REPOS_PER_RADAR: 25,
    MAX_TOTAL_REPOS: 50,
  },
}));

// Mock window.open
const mockWindowOpen = vi.fn();
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
  writable: true,
});

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

const createMockRepository = (overrides: Partial<Repository> = {}): Repository => ({
  id: 123,
  name: 'awesome-repo',
  full_name: 'octocat/awesome-repo',
  owner: {
    login: 'octocat',
    avatar_url: 'https://github.com/images/error/octocat_happy.gif',
  },
  description: 'This is an awesome repository for testing purposes',
  html_url: 'https://github.com/octocat/awesome-repo',
  stargazers_count: 1234,
  open_issues_count: 42,
  language: 'TypeScript',
  topics: ['testing', 'javascript', 'react'],
  updated_at: '2024-01-15T10:30:00Z',
  pushed_at: '2024-01-15T10:30:00Z',
  created_at: '2023-01-01T00:00:00Z',
  is_starred: false, // Default to not starred
  ...overrides,
});

describe('RepoCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock current time for consistent relative time tests
    vi.setSystemTime(new Date('2024-01-16T10:30:00Z'));
    // Default mocks for radar services
    vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);
    vi.mocked(radarService.getRadars).mockResolvedValue([]);
  });

  it('renders repository basic information correctly', () => {
    const repo = createMockRepository();
    renderWithProviders(<RepoCard repository={repo} />);

    expect(screen.getByText('awesome-repo')).toBeInTheDocument();
    expect(screen.getByText('by octocat')).toBeInTheDocument();
    expect(
      screen.getByText('This is an awesome repository for testing purposes')
    ).toBeInTheDocument();
  });

  it('displays star count with proper formatting', () => {
    const repo = createMockRepository({ stargazers_count: 1234 });
    renderWithProviders(<RepoCard repository={repo} />);

    expect(screen.getByText(/Stars: 1.2k/)).toBeInTheDocument();
  });

  it('displays star count without formatting for small numbers', () => {
    const repo = createMockRepository({ stargazers_count: 567 });
    renderWithProviders(<RepoCard repository={repo} />);

    expect(screen.getByText(/Stars: 567/)).toBeInTheDocument();
  });

  it('displays issue count correctly', () => {
    const repo = createMockRepository({ open_issues_count: 42 });
    renderWithProviders(<RepoCard repository={repo} />);

    expect(screen.getByText(/Open issues: 42/)).toBeInTheDocument();
  });

  it('displays primary language when present', () => {
    const repo = createMockRepository({ language: 'JavaScript' });
    renderWithProviders(<RepoCard repository={repo} />);

    expect(screen.getByText(/primary language: javascript/i)).toBeInTheDocument();
  });

  it('omits language row when repository has no language', () => {
    const repo = createMockRepository({ language: null });
    renderWithProviders(<RepoCard repository={repo} />);

    expect(screen.queryByText(/primary language/i)).not.toBeInTheDocument();
  });

  it('displays all topics when 3 or fewer', () => {
    const repo = createMockRepository({
      topics: ['testing', 'react'],
    });
    renderWithProviders(<RepoCard repository={repo} />);

    expect(screen.getByText(/labels: testing, react/i)).toBeInTheDocument();
    expect(screen.queryByText(/more/i)).not.toBeInTheDocument();
  });

  it('limits topics display to 3 and shows count for additional topics', () => {
    const repo = createMockRepository({
      topics: ['topic1', 'topic2', 'topic3', 'topic4', 'topic5'],
    });
    renderWithProviders(<RepoCard repository={repo} />);

    expect(screen.getByText('topic1')).toBeInTheDocument();
    expect(screen.getByText('topic2')).toBeInTheDocument();
    expect(screen.getByText('topic3')).toBeInTheDocument();
    expect(screen.getByText('+2 more')).toBeInTheDocument();
    expect(screen.queryByText('topic4')).not.toBeInTheDocument();
    expect(screen.queryByText('topic5')).not.toBeInTheDocument();
  });

  it('handles repository without topics', () => {
    const repo = createMockRepository({ topics: [] });
    renderWithProviders(<RepoCard repository={repo} />);

    expect(screen.queryByText(/topic/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/more/i)).not.toBeInTheDocument();
  });

  it('handles repository without description', () => {
    const repo = createMockRepository({ description: null });
    renderWithProviders(<RepoCard repository={repo} />);

    expect(screen.queryByText(/this is an awesome repository/i)).not.toBeInTheDocument();
  });

  it('truncates long descriptions at 150 characters', () => {
    const longDescription =
      'This is a very long description that exceeds 150 characters. It goes on and on with lots of details about what the repository does and why it is useful for developers.';
    const repo = createMockRepository({ description: longDescription });
    renderWithProviders(<RepoCard repository={repo} />);

    // Should be truncated with ellipsis
    expect(screen.getByText(/\.\.\.$/)).toBeInTheDocument();
    // Should not contain the full text
    expect(screen.queryByText(longDescription)).not.toBeInTheDocument();
  });

  it('does not truncate short descriptions', () => {
    const shortDescription = 'A short description under 150 chars.';
    const repo = createMockRepository({ description: shortDescription });
    renderWithProviders(<RepoCard repository={repo} />);

    expect(screen.getByText(shortDescription)).toBeInTheDocument();
  });

  it('includes sr-only truncation indicator for long descriptions', () => {
    const longDescription =
      'This is a very long description that exceeds 150 characters. It goes on and on with lots of details about what the repository does and why it is useful for developers.';
    const repo = createMockRepository({ description: longDescription });
    renderWithProviders(<RepoCard repository={repo} />);

    expect(screen.getByText(/description truncated/i)).toBeInTheDocument();
  });

  it('does not include truncation indicator for short descriptions', () => {
    const shortDescription = 'A short description under 150 chars.';
    const repo = createMockRepository({ description: shortDescription });
    renderWithProviders(<RepoCard repository={repo} />);

    expect(screen.queryByText(/description truncated/i)).not.toBeInTheDocument();
  });

  it('configures repository link to open in new tab securely', () => {
    const repo = createMockRepository();
    renderWithProviders(<RepoCard repository={repo} />);

    const link = screen.getByRole('link', { name: /awesome-repo by octocat/i });
    expect(link).toHaveAttribute('href', 'https://github.com/octocat/awesome-repo');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAccessibleName(/opens in new tab/i);
  });

  it('link is reachable via keyboard navigation', async () => {
    const user = userEvent.setup();
    const repo = createMockRepository();
    renderWithProviders(<RepoCard repository={repo} />);

    await user.tab();

    const link = screen.getByRole('link', { name: /awesome-repo by octocat/i });
    expect(link).toHaveFocus();
  });

  it('renders as an article element for semantic structure', () => {
    const repo = createMockRepository();
    renderWithProviders(<RepoCard repository={repo} />);

    const article = screen.getByRole('article');
    expect(article).toBeInTheDocument();
  });

  describe('Star indicator', () => {
    it('displays star icon when repository is starred', () => {
      const repo = createMockRepository({ is_starred: true });
      renderWithProviders(<RepoCard repository={repo} />);

      expect(screen.getByLabelText('Starred')).toBeInTheDocument();
    });

    it('does not display star icon when repository is not starred', () => {
      const repo = createMockRepository({ is_starred: false });
      renderWithProviders(<RepoCard repository={repo} />);

      expect(screen.queryByLabelText('Starred')).not.toBeInTheDocument();
    });

    it('includes starred in card link aria-label when starred', () => {
      const repo = createMockRepository({ is_starred: true });
      renderWithProviders(<RepoCard repository={repo} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAccessibleName(/starred/i);
    });

    it('does not include starred in card link aria-label when not starred', () => {
      const repo = createMockRepository({ is_starred: false });
      renderWithProviders(<RepoCard repository={repo} />);

      const link = screen.getByRole('link');
      expect(link).not.toHaveAccessibleName(/starred/i);
    });
  });

  describe('Metrics display', () => {
    it('displays growth rate for stars', () => {
      const repo = createMockRepository({
        metrics: { stars_growth_rate: 0.155 }, // Decimal: 0.155 = 15.5%
      });
      renderWithProviders(<RepoCard repository={repo} />);

      expect(screen.getByText(/\+15\.5%/)).toBeInTheDocument();
    });

    it('displays negative growth rate for stars', () => {
      const repo = createMockRepository({
        metrics: { stars_growth_rate: -0.052 }, // Decimal: -0.052 = -5.2%
      });
      renderWithProviders(<RepoCard repository={repo} />);

      const growthElement = screen.getByText(/-5\.2%/);
      expect(growthElement).toBeInTheDocument();
    });

    // regression test for UI bug where star count was displayed as 148.0k0
    it('should not display extra zero when growth rate is zero', () => {
      const repository = createMockRepository({
        stargazers_count: 148018, // Use the exact number that was problematic
        metrics: {
          stars_growth_rate: 0, // Exactly zero growth rate
          issues_growth_rate: 0,
          is_trending: false,
        },
      });

      renderWithProviders(<RepoCard repository={repository} />);

      // Should show clean star count (formatCompactNumber returns "148k" for 148018)
      expect(screen.getByText(/Stars: 148k$/)).toBeInTheDocument();

      // Should NOT contain the malformed version with extra zero
      expect(screen.queryByText(/148k0/)).not.toBeInTheDocument();

      // Should not show growth rate for zero growth
      expect(screen.queryByText(/0%/)).not.toBeInTheDocument();
    });

    it('handles repository without metrics', () => {
      const repo = createMockRepository({ metrics: undefined });
      renderWithProviders(<RepoCard repository={repo} />);

      expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    });
  });

  describe('HotBadge integration', () => {
    it('displays hot badge when all criteria are met', () => {
      const repo = createMockRepository({
        stargazers_count: 200,
        metrics: {
          stars_growth_rate: 0.3, // 30%
          stars_gained: 60,
        },
      });
      renderWithProviders(<RepoCard repository={repo} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Hot')).toBeInTheDocument();
    });

    it('does not display hot badge when criteria not met', () => {
      const repo = createMockRepository({
        stargazers_count: 50, // Below 100 threshold
        metrics: {
          stars_growth_rate: 0.3,
          stars_gained: 60,
        },
      });
      renderWithProviders(<RepoCard repository={repo} />);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('does not display hot badge when metrics undefined', () => {
      const repo = createMockRepository({ metrics: undefined });
      renderWithProviders(<RepoCard repository={repo} />);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('does not display hot badge when stars_gained is missing', () => {
      const repo = createMockRepository({
        stargazers_count: 200,
        metrics: {
          stars_growth_rate: 0.3,
          // stars_gained not provided, defaults to 0
        },
      });
      renderWithProviders(<RepoCard repository={repo} />);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('includes hot in card link aria-label when hot', () => {
      const repo = createMockRepository({
        stargazers_count: 200,
        metrics: {
          stars_growth_rate: 0.3,
          stars_gained: 60,
        },
      });
      renderWithProviders(<RepoCard repository={repo} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAccessibleName(/awesome-repo by octocat, hot/i);
    });

    it('does not include hot in card link aria-label when not hot', () => {
      const repo = createMockRepository({
        stargazers_count: 50,
        metrics: {
          stars_growth_rate: 0.1,
          stars_gained: 10,
        },
      });
      renderWithProviders(<RepoCard repository={repo} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAccessibleName(/awesome-repo by octocat.*opens in new tab/i);
      expect(link).not.toHaveAccessibleName(/hot,/i);
    });
  });

  describe('Radar icon integration', () => {
    it('displays radar icon button', () => {
      const repo = createMockRepository();
      renderWithProviders(<RepoCard repository={repo} />);

      expect(screen.getByRole('button', { name: /add to radar/i })).toBeInTheDocument();
    });

    it('shows outline icon when repo is not in any radar', async () => {
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);
      const repo = createMockRepository();
      renderWithProviders(<RepoCard repository={repo} />);

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /add to radar/i });
        expect(button).toBeInTheDocument();
      });
    });

    it('shows filled icon when repo is in at least one radar', async () => {
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue(['radar-1']);
      const repo = createMockRepository();
      renderWithProviders(<RepoCard repository={repo} />);

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /manage radars/i });
        expect(button).toBeInTheDocument();
      });
    });

    it('includes tracked in card link aria-label when in radar', async () => {
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue(['radar-1']);
      const repo = createMockRepository();
      renderWithProviders(<RepoCard repository={repo} />);

      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).toHaveAccessibleName(/tracked/i);
      });
    });

    it('does not include tracked in card link aria-label when not in radar', async () => {
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);
      const repo = createMockRepository();
      renderWithProviders(<RepoCard repository={repo} />);

      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).not.toHaveAccessibleName(/tracked/i);
      });
    });

    it('opens dropdown when radar icon is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(radarService.getRadars).mockResolvedValue([]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);
      const repo = createMockRepository();
      renderWithProviders(<RepoCard repository={repo} />);

      await user.click(screen.getByRole('button', { name: /add to radar/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /add to radar/i })).toBeInTheDocument();
      });
    });
  });
});
