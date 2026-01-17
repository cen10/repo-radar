import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RepoCard } from './RepoCard';
import type { Repository } from '../types';

// Mock window.open
const mockWindowOpen = vi.fn();
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
  writable: true,
});

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
  });

  it('renders repository basic information correctly', () => {
    const repo = createMockRepository();
    render(<RepoCard repository={repo} />);

    expect(screen.getByText('awesome-repo')).toBeInTheDocument();
    expect(screen.getByText('by octocat')).toBeInTheDocument();
    expect(
      screen.getByText('This is an awesome repository for testing purposes')
    ).toBeInTheDocument();
  });

  it('displays star count with proper formatting', () => {
    const repo = createMockRepository({ stargazers_count: 1234 });
    render(<RepoCard repository={repo} />);

    expect(screen.getByText(/Stars: 1.2k/)).toBeInTheDocument();
  });

  it('displays star count without formatting for small numbers', () => {
    const repo = createMockRepository({ stargazers_count: 567 });
    render(<RepoCard repository={repo} />);

    expect(screen.getByText(/Stars: 567/)).toBeInTheDocument();
  });

  it('displays issue count correctly', () => {
    const repo = createMockRepository({ open_issues_count: 42 });
    render(<RepoCard repository={repo} />);

    expect(screen.getByText(/Open issues: 42/)).toBeInTheDocument();
  });

  it('displays primary language when present', () => {
    const repo = createMockRepository({ language: 'JavaScript' });
    render(<RepoCard repository={repo} />);

    expect(screen.getByText(/primary language: javascript/i)).toBeInTheDocument();
  });

  it('omits language row when repository has no language', () => {
    const repo = createMockRepository({ language: null });
    render(<RepoCard repository={repo} />);

    expect(screen.queryByText(/primary language/i)).not.toBeInTheDocument();
  });

  it('displays all topics when 3 or fewer', () => {
    const repo = createMockRepository({
      topics: ['testing', 'react'],
    });
    render(<RepoCard repository={repo} />);

    expect(screen.getByRole('group', { name: /labels: testing, react/i })).toBeInTheDocument();
    expect(screen.queryByText(/more/i)).not.toBeInTheDocument();
  });

  it('limits topics display to 3 and shows count for additional topics', () => {
    const repo = createMockRepository({
      topics: ['topic1', 'topic2', 'topic3', 'topic4', 'topic5'],
    });
    render(<RepoCard repository={repo} />);

    expect(screen.getByText('topic1')).toBeInTheDocument();
    expect(screen.getByText('topic2')).toBeInTheDocument();
    expect(screen.getByText('topic3')).toBeInTheDocument();
    expect(screen.getByText('+2 more')).toBeInTheDocument();
    expect(screen.queryByText('topic4')).not.toBeInTheDocument();
    expect(screen.queryByText('topic5')).not.toBeInTheDocument();
  });

  it('handles repository without topics', () => {
    const repo = createMockRepository({ topics: [] });
    render(<RepoCard repository={repo} />);

    expect(screen.queryByText(/topic/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/more/i)).not.toBeInTheDocument();
  });

  it('handles repository without description', () => {
    const repo = createMockRepository({ description: null });
    render(<RepoCard repository={repo} />);

    expect(screen.queryByText(/this is an awesome repository/i)).not.toBeInTheDocument();
  });

  it('configures repository link to open in new tab securely', () => {
    const repo = createMockRepository();
    render(<RepoCard repository={repo} />);

    const link = screen.getByRole('link', { name: /awesome-repo by octocat/i });
    expect(link).toHaveAttribute('href', 'https://github.com/octocat/awesome-repo');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('link is reachable via keyboard navigation', async () => {
    const user = userEvent.setup();
    const repo = createMockRepository();
    render(<RepoCard repository={repo} />);

    await user.tab();

    const link = screen.getByRole('link', { name: /awesome-repo by octocat/i });
    expect(link).toHaveFocus();
  });

  it('renders as an article element for semantic structure', () => {
    const repo = createMockRepository();
    render(<RepoCard repository={repo} />);

    const article = screen.getByRole('article');
    expect(article).toBeInTheDocument();
  });

  describe('Star indicator', () => {
    it('displays filled star icon when repository is starred', () => {
      const repo = createMockRepository({ is_starred: true });
      render(<RepoCard repository={repo} />);

      expect(screen.getByLabelText('Starred')).toBeInTheDocument();
      expect(screen.queryByLabelText('Not starred')).not.toBeInTheDocument();
    });

    it('displays outline star icon when repository is not starred', () => {
      const repo = createMockRepository({ is_starred: false });
      render(<RepoCard repository={repo} />);

      expect(screen.getByLabelText('Not starred')).toBeInTheDocument();
      expect(screen.queryByLabelText('Starred')).not.toBeInTheDocument();
    });
  });

  describe('Metrics display', () => {
    it('displays growth rate for stars', () => {
      const repo = createMockRepository({
        metrics: { stars_growth_rate: 15.5 },
      });
      render(<RepoCard repository={repo} />);

      expect(screen.getByText(/\+15.5% this month/)).toBeInTheDocument();
    });

    it('displays negative growth rate for stars', () => {
      const repo = createMockRepository({
        metrics: { stars_growth_rate: -5.2 },
      });
      render(<RepoCard repository={repo} />);

      const growthElement = screen.getByText(/-5.2% this month/);
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

      render(<RepoCard repository={repository} />);

      // Should show clean star count without extra zero
      expect(screen.getByText(/Stars: 148\.0k$/)).toBeInTheDocument();

      // Should NOT contain the malformed version with extra zero
      expect(screen.queryByText(/148\.0k0/)).not.toBeInTheDocument();

      // Should not show growth rate for zero growth
      expect(screen.queryByText(/0\.0% this month/)).not.toBeInTheDocument();
    });

    it('handles repository without metrics', () => {
      const repo = createMockRepository({ metrics: undefined });
      render(<RepoCard repository={repo} />);

      expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    });
  });
});
