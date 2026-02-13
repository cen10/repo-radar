import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactElement } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { RepoCard } from '@/components/RepoCard';
import * as radarService from '@/services/radar';
import { createTestQueryClient } from '../../helpers/query-client';
import { createMockRepository } from '../../mocks/factories';
import { OnboardingProvider } from '@/contexts/onboarding-context';

// Mock the radar service
vi.mock('@/services/radar', () => ({
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

const renderWithProviders = (ui: ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <OnboardingProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </OnboardingProvider>
    </QueryClientProvider>
  );
};

// Test-specific repository with values suitable for RepoCard tests
const defaultRepo = createMockRepository({
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
    renderWithProviders(<RepoCard repository={defaultRepo} />);

    expect(screen.getByText('awesome-repo')).toBeInTheDocument();
    expect(screen.getByText('by octocat')).toBeInTheDocument();
    expect(
      screen.getByText('This is an awesome repository for testing purposes')
    ).toBeInTheDocument();
  });

  it('displays star count with proper formatting', () => {
    renderWithProviders(<RepoCard repository={defaultRepo} />);

    expect(screen.getByText(/Stars: 1.2k/)).toBeInTheDocument();
  });

  it('displays star count without formatting for small numbers', () => {
    renderWithProviders(<RepoCard repository={{ ...defaultRepo, stargazers_count: 567 }} />);

    expect(screen.getByText(/Stars: 567/)).toBeInTheDocument();
  });

  it('displays issue count correctly', () => {
    renderWithProviders(<RepoCard repository={defaultRepo} />);

    expect(screen.getByText(/Open issues: 42/)).toBeInTheDocument();
  });

  it('displays primary language when present', () => {
    renderWithProviders(<RepoCard repository={{ ...defaultRepo, language: 'JavaScript' }} />);

    expect(screen.getByText(/primary language: javascript/i)).toBeInTheDocument();
  });

  it('omits language row when repository has no language', () => {
    renderWithProviders(<RepoCard repository={{ ...defaultRepo, language: null }} />);

    expect(screen.queryByText(/primary language/i)).not.toBeInTheDocument();
  });

  it('displays all topics when 3 or fewer', () => {
    renderWithProviders(<RepoCard repository={{ ...defaultRepo, topics: ['testing', 'react'] }} />);

    expect(screen.getByText(/labels: testing, react/i)).toBeInTheDocument();
    expect(screen.queryByText(/more/i)).not.toBeInTheDocument();
  });

  it('limits topics display to 3 and shows count for additional topics', () => {
    renderWithProviders(
      <RepoCard
        repository={{
          ...defaultRepo,
          topics: ['topic1', 'topic2', 'topic3', 'topic4', 'topic5'],
        }}
      />
    );

    expect(screen.getByText('topic1')).toBeInTheDocument();
    expect(screen.getByText('topic2')).toBeInTheDocument();
    expect(screen.getByText('topic3')).toBeInTheDocument();
    expect(screen.getByText('+2 more')).toBeInTheDocument();
    expect(screen.queryByText('topic4')).not.toBeInTheDocument();
    expect(screen.queryByText('topic5')).not.toBeInTheDocument();
  });

  it('handles repository without topics', () => {
    renderWithProviders(<RepoCard repository={{ ...defaultRepo, topics: [] }} />);

    expect(screen.queryByText(/topic/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/more/i)).not.toBeInTheDocument();
  });

  it('handles repository without description', () => {
    renderWithProviders(<RepoCard repository={{ ...defaultRepo, description: null }} />);

    expect(screen.queryByText(/this is an awesome repository/i)).not.toBeInTheDocument();
  });

  it('truncates long descriptions at 150 characters', () => {
    const longDescription =
      'This is a very long description that exceeds 150 characters. It goes on and on with lots of details about what the repository does and why it is useful for developers.';
    renderWithProviders(<RepoCard repository={{ ...defaultRepo, description: longDescription }} />);

    // Should be truncated with ellipsis
    expect(screen.getByText(/\.\.\.$/)).toBeInTheDocument();
    // Should not contain the full text
    expect(screen.queryByText(longDescription)).not.toBeInTheDocument();
  });

  it('does not truncate short descriptions', () => {
    const shortDescription = 'A short description under 150 chars.';
    renderWithProviders(
      <RepoCard repository={{ ...defaultRepo, description: shortDescription }} />
    );

    expect(screen.getByText(shortDescription)).toBeInTheDocument();
  });

  it('includes sr-only truncation indicator for long descriptions', () => {
    const longDescription =
      'This is a very long description that exceeds 150 characters. It goes on and on with lots of details about what the repository does and why it is useful for developers.';
    renderWithProviders(<RepoCard repository={{ ...defaultRepo, description: longDescription }} />);

    expect(screen.getByText(/description truncated/i)).toBeInTheDocument();
  });

  it('does not include truncation indicator for short descriptions', () => {
    const shortDescription = 'A short description under 150 chars.';
    renderWithProviders(
      <RepoCard repository={{ ...defaultRepo, description: shortDescription }} />
    );

    expect(screen.queryByText(/description truncated/i)).not.toBeInTheDocument();
  });

  it('links to internal repository detail page', () => {
    renderWithProviders(<RepoCard repository={defaultRepo} />);

    const link = screen.getByRole('link', { name: /awesome-repo by octocat/i });
    expect(link).toHaveAttribute('href', '/repo/123');
  });

  it('link is reachable via keyboard navigation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RepoCard repository={defaultRepo} />);

    await user.tab();

    const link = screen.getByRole('link', { name: /awesome-repo by octocat/i });
    expect(link).toHaveFocus();
  });

  it('renders as an article element for semantic structure', () => {
    renderWithProviders(<RepoCard repository={defaultRepo} />);

    const article = screen.getByRole('article');
    expect(article).toBeInTheDocument();
  });

  describe('Star indicator', () => {
    it('displays starred badge when repository is starred', () => {
      renderWithProviders(<RepoCard repository={{ ...defaultRepo, is_starred: true }} />);

      expect(screen.getByRole('status', { name: /starred/i })).toBeInTheDocument();
      expect(screen.getByText('Starred')).toBeInTheDocument();
    });

    it('does not display starred badge when repository is not starred', () => {
      renderWithProviders(<RepoCard repository={{ ...defaultRepo, is_starred: false }} />);

      expect(screen.queryByRole('status', { name: /starred/i })).not.toBeInTheDocument();
    });

    it('includes starred in card link aria-label when starred', () => {
      renderWithProviders(<RepoCard repository={{ ...defaultRepo, is_starred: true }} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAccessibleName(/starred/i);
    });

    it('does not include starred in card link aria-label when not starred', () => {
      renderWithProviders(<RepoCard repository={{ ...defaultRepo, is_starred: false }} />);

      const link = screen.getByRole('link');
      expect(link).not.toHaveAccessibleName(/starred/i);
    });
  });

  describe('Metrics display', () => {
    it('displays growth rate for stars', () => {
      renderWithProviders(
        <RepoCard repository={{ ...defaultRepo, metrics: { stars_growth_rate: 0.155 } }} />
      );

      expect(screen.getByText(/\+15\.5%/)).toBeInTheDocument();
    });

    it('displays negative growth rate for stars', () => {
      renderWithProviders(
        <RepoCard repository={{ ...defaultRepo, metrics: { stars_growth_rate: -0.052 } }} />
      );

      const growthElement = screen.getByText(/-5\.2%/);
      expect(growthElement).toBeInTheDocument();
    });

    // regression test for UI bug where star count was displayed as 148.0k0
    it('should not display extra zero when growth rate is zero', () => {
      renderWithProviders(
        <RepoCard
          repository={{
            ...defaultRepo,
            stargazers_count: 148018,
            metrics: {
              stars_growth_rate: 0,
              issues_growth_rate: 0,
              is_trending: false,
            },
          }}
        />
      );

      // Should show clean star count (formatCompactNumber returns "148k" for 148018)
      expect(screen.getByText(/Stars: 148k$/)).toBeInTheDocument();

      // Should NOT contain the malformed version with extra zero
      expect(screen.queryByText(/148k0/)).not.toBeInTheDocument();

      // Should not show growth rate for zero growth
      expect(screen.queryByText(/0%/)).not.toBeInTheDocument();
    });

    it('handles repository without metrics', () => {
      renderWithProviders(<RepoCard repository={{ ...defaultRepo, metrics: undefined }} />);

      expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    });
  });

  describe('HotBadge integration', () => {
    it('displays hot badge when all criteria are met', () => {
      renderWithProviders(
        <RepoCard
          repository={{
            ...defaultRepo,
            stargazers_count: 200,
            metrics: { stars_growth_rate: 0.3, stars_gained: 60 },
          }}
        />
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Hot')).toBeInTheDocument();
    });

    it('does not display hot badge when criteria not met', () => {
      renderWithProviders(
        <RepoCard
          repository={{
            ...defaultRepo,
            stargazers_count: 50, // Below 100 threshold
            metrics: { stars_growth_rate: 0.3, stars_gained: 60 },
          }}
        />
      );

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('does not display hot badge when metrics undefined', () => {
      renderWithProviders(<RepoCard repository={{ ...defaultRepo, metrics: undefined }} />);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('does not display hot badge when stars_gained is missing', () => {
      renderWithProviders(
        <RepoCard
          repository={{
            ...defaultRepo,
            stargazers_count: 200,
            metrics: { stars_growth_rate: 0.3 },
          }}
        />
      );

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('includes hot in card link aria-label when hot', () => {
      renderWithProviders(
        <RepoCard
          repository={{
            ...defaultRepo,
            stargazers_count: 200,
            metrics: { stars_growth_rate: 0.3, stars_gained: 60 },
          }}
        />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAccessibleName(/awesome-repo by octocat, hot/i);
    });

    it('does not include hot in card link aria-label when not hot', () => {
      renderWithProviders(
        <RepoCard
          repository={{
            ...defaultRepo,
            stargazers_count: 50,
            metrics: { stars_growth_rate: 0.1, stars_gained: 10 },
          }}
        />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAccessibleName(/awesome-repo by octocat/i);
      expect(link).not.toHaveAccessibleName(/hot,/i);
    });
  });

  describe('Radar icon integration', () => {
    it('displays radar icon button', () => {
      renderWithProviders(<RepoCard repository={defaultRepo} />);

      expect(screen.getByRole('button', { name: /add to radar/i })).toBeInTheDocument();
    });

    it('shows outline icon when repo is not in any radar', async () => {
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);
      renderWithProviders(<RepoCard repository={defaultRepo} />);

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /add to radar/i });
        expect(button).toBeInTheDocument();
      });
    });

    it('shows filled icon when repo is in at least one radar', async () => {
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue(['radar-1']);
      renderWithProviders(<RepoCard repository={defaultRepo} />);

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /manage radars/i });
        expect(button).toBeInTheDocument();
      });
    });

    it('opens dropdown when radar icon is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(radarService.getRadars).mockResolvedValue([]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);
      renderWithProviders(<RepoCard repository={defaultRepo} />);

      await user.click(screen.getByRole('button', { name: /add to radar/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /add to radar/i })).toBeInTheDocument();
      });
    });
  });
});
