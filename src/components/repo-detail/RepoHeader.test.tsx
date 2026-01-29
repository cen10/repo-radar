import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { RepoHeader } from './RepoHeader';
import { createTestQueryClient } from '../../test/helpers/query-client';
import { createMockRepository } from '../../test/mocks/factories';

// Mock RadarIconButton to avoid radar service dependencies
vi.mock('../RadarIconButton', () => ({
  RadarIconButton: ({ githubRepoId }: { githubRepoId: number }) => (
    <button data-testid="radar-icon-button">Radar {githubRepoId}</button>
  ),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

const defaultRepo = createMockRepository();

const defaultProps = {
  repository: defaultRepo,
  onRefresh: vi.fn().mockResolvedValue(undefined),
  isRefreshing: false,
  dataFetchedAt: Date.now() - 5 * 60 * 1000, // 5 minutes ago
};

describe('RepoHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date('2024-01-16T10:30:00Z'));
  });

  describe('basic information', () => {
    it('renders repository name as heading', () => {
      renderWithProviders(<RepoHeader {...defaultProps} />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('user/test-repo');
    });

    it('renders owner link with correct href', () => {
      renderWithProviders(<RepoHeader {...defaultProps} />);

      const ownerLink = screen.getByRole('link', { name: /by user/i });
      expect(ownerLink).toHaveAttribute('href', 'https://github.com/user');
    });

    it('renders owner avatar', () => {
      renderWithProviders(<RepoHeader {...defaultProps} />);

      const avatar = screen.getByRole('presentation');
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('renders description when present', () => {
      renderWithProviders(<RepoHeader {...defaultProps} />);

      expect(screen.getByText('Test repository description')).toBeInTheDocument();
    });

    it('does not render description when absent', () => {
      renderWithProviders(
        <RepoHeader {...defaultProps} repository={{ ...defaultRepo, description: null }} />
      );

      expect(screen.queryByText('Test repository description')).not.toBeInTheDocument();
    });

    it('renders View on GitHub link with correct href', () => {
      renderWithProviders(<RepoHeader {...defaultProps} />);

      const githubLink = screen.getByRole('link', { name: /view on github/i });
      expect(githubLink).toHaveAttribute('href', 'https://github.com/user/test-repo');
      expect(githubLink).toHaveAttribute('target', '_blank');
    });
  });

  describe('language and license', () => {
    it('renders language when present', () => {
      renderWithProviders(<RepoHeader {...defaultProps} />);

      expect(screen.getByText('TypeScript')).toBeInTheDocument();
    });

    it('does not render language when absent', () => {
      renderWithProviders(
        <RepoHeader {...defaultProps} repository={{ ...defaultRepo, language: null }} />
      );

      expect(screen.queryByText('TypeScript')).not.toBeInTheDocument();
    });

    it('renders license as link when url is present', () => {
      renderWithProviders(<RepoHeader {...defaultProps} />);

      const licenseLink = screen.getByRole('link', { name: /mit license/i });
      expect(licenseLink).toHaveAttribute('href', 'https://api.github.com/licenses/mit');
    });

    it('renders license as text when url is absent', () => {
      renderWithProviders(
        <RepoHeader
          {...defaultProps}
          repository={{
            ...defaultRepo,
            license: { key: 'mit', name: 'MIT License', url: null },
          }}
        />
      );

      expect(screen.getByText('MIT License')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /mit license/i })).not.toBeInTheDocument();
    });

    it('does not render license when absent', () => {
      renderWithProviders(
        <RepoHeader {...defaultProps} repository={{ ...defaultRepo, license: null }} />
      );

      expect(screen.queryByText('MIT License')).not.toBeInTheDocument();
    });
  });

  describe('topics', () => {
    it('renders topics when present', () => {
      renderWithProviders(<RepoHeader {...defaultProps} />);

      expect(screen.getByText('react')).toBeInTheDocument();
      expect(screen.getByText('typescript')).toBeInTheDocument();
    });

    it('does not render topics section when empty', () => {
      renderWithProviders(
        <RepoHeader {...defaultProps} repository={{ ...defaultRepo, topics: [] }} />
      );

      expect(screen.queryByText('react')).not.toBeInTheDocument();
    });

    it('shows first 10 topics by default', () => {
      const manyTopics = Array.from({ length: 15 }, (_, i) => `topic-${i + 1}`);
      renderWithProviders(
        <RepoHeader {...defaultProps} repository={{ ...defaultRepo, topics: manyTopics }} />
      );

      // First 10 should be visible
      for (let i = 1; i <= 10; i++) {
        expect(screen.getByText(`topic-${i}`)).toBeInTheDocument();
      }
      // Topics 11-15 should not be visible
      expect(screen.queryByText('topic-11')).not.toBeInTheDocument();
      expect(screen.getByText('+5 more')).toBeInTheDocument();
    });

    it('expands to show all topics when clicking +N more', async () => {
      const user = userEvent.setup();
      const manyTopics = Array.from({ length: 15 }, (_, i) => `topic-${i + 1}`);
      renderWithProviders(
        <RepoHeader {...defaultProps} repository={{ ...defaultRepo, topics: manyTopics }} />
      );

      await user.click(screen.getByText('+5 more'));

      // All topics should now be visible
      for (let i = 1; i <= 15; i++) {
        expect(screen.getByText(`topic-${i}`)).toBeInTheDocument();
      }
      expect(screen.queryByText('+5 more')).not.toBeInTheDocument();
      expect(screen.getByText('Show less')).toBeInTheDocument();
    });

    it('collapses topics when clicking Show less', async () => {
      const user = userEvent.setup();
      const manyTopics = Array.from({ length: 15 }, (_, i) => `topic-${i + 1}`);
      renderWithProviders(
        <RepoHeader {...defaultProps} repository={{ ...defaultRepo, topics: manyTopics }} />
      );

      // Expand
      await user.click(screen.getByText('+5 more'));
      expect(screen.getByText('topic-15')).toBeInTheDocument();

      // Collapse
      await user.click(screen.getByText('Show less'));

      expect(screen.queryByText('topic-11')).not.toBeInTheDocument();
      expect(screen.getByText('+5 more')).toBeInTheDocument();
    });

    it('does not show expand button when 10 or fewer topics', () => {
      const tenTopics = Array.from({ length: 10 }, (_, i) => `topic-${i + 1}`);
      renderWithProviders(
        <RepoHeader {...defaultProps} repository={{ ...defaultRepo, topics: tenTopics }} />
      );

      for (let i = 1; i <= 10; i++) {
        expect(screen.getByText(`topic-${i}`)).toBeInTheDocument();
      }
      expect(screen.queryByText(/more/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/show less/i)).not.toBeInTheDocument();
    });
  });

  describe('starred indicator', () => {
    it('shows star icon when repository is starred', () => {
      renderWithProviders(
        <RepoHeader {...defaultProps} repository={{ ...defaultRepo, is_starred: true }} />
      );

      expect(screen.getByLabelText('Starred')).toBeInTheDocument();
    });

    it('does not show star icon when repository is not starred', () => {
      renderWithProviders(
        <RepoHeader {...defaultProps} repository={{ ...defaultRepo, is_starred: false }} />
      );

      expect(screen.queryByLabelText('Starred')).not.toBeInTheDocument();
    });
  });

  describe('refresh functionality', () => {
    it('displays data freshness timestamp', () => {
      renderWithProviders(<RepoHeader {...defaultProps} />);

      expect(screen.getByText(/data from/i)).toBeInTheDocument();
    });

    it('displays "just now" when dataFetchedAt is undefined', () => {
      renderWithProviders(<RepoHeader {...defaultProps} dataFetchedAt={undefined} />);

      expect(screen.getByText(/just now/i)).toBeInTheDocument();
    });

    it('calls onRefresh when refresh button is clicked', async () => {
      const user = userEvent.setup();
      const onRefresh = vi.fn().mockResolvedValue(undefined);
      renderWithProviders(<RepoHeader {...defaultProps} onRefresh={onRefresh} />);

      await user.click(screen.getByRole('button', { name: /refresh/i }));

      await waitFor(() => {
        expect(onRefresh).toHaveBeenCalledTimes(1);
      });
    });

    it('disables refresh button while refreshing', () => {
      renderWithProviders(<RepoHeader {...defaultProps} isRefreshing={true} />);

      expect(screen.getByRole('button', { name: /refresh/i })).toBeDisabled();
    });

    it('maintains minimum refresh display time', async () => {
      const user = userEvent.setup();
      vi.useRealTimers();

      const onRefresh = vi.fn().mockResolvedValue(undefined);
      renderWithProviders(<RepoHeader {...defaultProps} onRefresh={onRefresh} />);

      const button = screen.getByRole('button', { name: /refresh/i });
      await user.click(button);

      // Button should be disabled immediately after click
      expect(button).toBeDisabled();

      // Wait for minimum display time (300ms) plus some buffer
      await waitFor(
        () => {
          expect(button).not.toBeDisabled();
        },
        { timeout: 500 }
      );
    });
  });

  describe('radar integration', () => {
    it('renders RadarIconButton with repository id', () => {
      renderWithProviders(<RepoHeader {...defaultProps} />);

      expect(screen.getByTestId('radar-icon-button')).toHaveTextContent('Radar 1');
    });
  });
});
