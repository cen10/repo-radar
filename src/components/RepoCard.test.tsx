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

  it('displays star button in starred state when repository is starred', () => {
    const repo = createMockRepository({
      is_starred: true,
    });
    const onToggleStar = vi.fn();
    render(<RepoCard repository={repo} onToggleStar={onToggleStar} />);

    const starButton = screen.getByRole('button', { name: /unstar awesome-repo repository/i });
    expect(starButton).toBeInTheDocument();
    expect(starButton).toHaveTextContent('Starred');
  });

  it('displays star button in unstarred state when repository is not starred', () => {
    const repo = createMockRepository({
      is_starred: false,
    });
    const onToggleStar = vi.fn();
    render(<RepoCard repository={repo} onToggleStar={onToggleStar} />);

    const starButton = screen.getByRole('button', { name: /star awesome-repo repository/i });
    expect(starButton).toBeInTheDocument();
    expect(starButton).toHaveTextContent('Star');
  });

  it('displays star button with filled star icon when starred', () => {
    const repo = createMockRepository({
      is_starred: true,
    });
    const onToggleStar = vi.fn();
    render(<RepoCard repository={repo} onToggleStar={onToggleStar} />);

    const starButton = screen.getByRole('button', { name: /unstar awesome-repo repository/i });
    expect(starButton).toHaveTextContent('Starred');
    // Check that it contains an SVG (StarIconSolid)
    expect(starButton.querySelector('svg')).toBeInTheDocument();
  });

  it('displays star button with empty star icon when not starred', () => {
    const repo = createMockRepository({
      is_starred: false,
    });
    const onToggleStar = vi.fn();
    render(<RepoCard repository={repo} onToggleStar={onToggleStar} />);

    const starButton = screen.getByRole('button', { name: /star awesome-repo repository/i });
    expect(starButton).toHaveTextContent('Star');
    // Check that it contains an SVG (StarIconOutline)
    expect(starButton.querySelector('svg')).toBeInTheDocument();
  });

  it('renders repository basic information correctly', () => {
    const repo = createMockRepository();
    render(<RepoCard repository={repo} />);

    expect(screen.getByText('awesome-repo')).toBeInTheDocument();
    expect(screen.getByText('by octocat')).toBeInTheDocument();
    expect(
      screen.getByText('This is an awesome repository for testing purposes')
    ).toBeInTheDocument();
    // Avatar has empty alt text since it's decorative and owner name is adjacent
    const avatar = document.querySelector(
      'img[src="https://github.com/images/error/octocat_happy.gif"]'
    );
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('alt', '');
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

  it('displays language correctly', () => {
    const repo = createMockRepository({ language: 'JavaScript' });
    render(<RepoCard repository={repo} />);

    expect(screen.getByText(/Primary language: JavaScript/)).toBeInTheDocument();
  });

  it('handles repository without language', () => {
    const repo = createMockRepository({
      language: null,
      topics: ['testing', 'automation'], // Use topics that don't match language keywords
    });
    render(<RepoCard repository={repo} />);

    // Check that no language badge is displayed (look for language-specific styling)
    expect(screen.queryByText('JavaScript')).not.toBeInTheDocument();
    expect(screen.queryByText('TypeScript')).not.toBeInTheDocument();
    expect(screen.queryByText('Python')).not.toBeInTheDocument();
  });

  it('displays topics correctly', () => {
    const repo = createMockRepository({
      topics: ['testing', 'javascript', 'react'],
    });
    render(<RepoCard repository={repo} />);

    expect(screen.getByText('testing')).toBeInTheDocument();
    expect(screen.getByText('javascript')).toBeInTheDocument();
    expect(screen.getByText('react')).toBeInTheDocument();
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

  // Last commit display has been removed from simplified UI

  it('handles repository without description', () => {
    const repo = createMockRepository({ description: null });
    render(<RepoCard repository={repo} />);

    expect(screen.queryByText(/this is an awesome repository/i)).not.toBeInTheDocument();
  });

  it('opens repository in new tab when link is clicked', () => {
    const repo = createMockRepository();
    render(<RepoCard repository={repo} />);

    const link = screen.getByRole('link', { name: /awesome-repo by octocat/i });
    expect(link).toHaveAttribute('href', 'https://github.com/octocat/awesome-repo');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('link can be accessed via keyboard navigation', () => {
    const repo = createMockRepository();
    render(<RepoCard repository={repo} />);

    const link = screen.getByRole('link', { name: /awesome-repo by octocat/i });
    link.focus();

    // Link should be focusable and have correct attributes
    expect(document.activeElement).toBe(link);
    expect(link).toHaveAttribute('href', 'https://github.com/octocat/awesome-repo');
  });

  it('renders as an article element for semantic structure', () => {
    const repo = createMockRepository();
    render(<RepoCard repository={repo} />);

    const article = screen.getByRole('article');
    expect(article).toBeInTheDocument();
    expect(article).toHaveClass('bg-white', 'border', 'border-gray-200', 'rounded-lg');
  });

  // Last commit display has been removed from simplified UI

  describe('Keyboard navigation', () => {
    it('star button responds to Enter key press', async () => {
      const user = userEvent.setup();
      const repo = createMockRepository({ is_starred: false });
      const onToggleStar = vi.fn();
      render(<RepoCard repository={repo} onToggleStar={onToggleStar} />);

      const starButton = screen.getByRole('button', { name: /star awesome-repo repository/i });
      starButton.focus();
      await user.keyboard('{Enter}');

      expect(onToggleStar).toHaveBeenCalledWith(repo);
    });

    it('star button responds to Space key press', async () => {
      const user = userEvent.setup();
      const repo = createMockRepository({ is_starred: true });
      const onToggleStar = vi.fn();
      render(<RepoCard repository={repo} onToggleStar={onToggleStar} />);

      const starButton = screen.getByRole('button', {
        name: /unstar awesome-repo repository/i,
      });
      starButton.focus();
      await user.keyboard(' ');

      expect(onToggleStar).toHaveBeenCalledWith(repo);
    });

    // Metrics are no longer focusable in simplified UI

    // Metrics are no longer focusable in simplified UI
  });

  describe('Star functionality', () => {
    it('displays star button when onToggleStar is provided', () => {
      const repo = createMockRepository({ is_starred: false });
      const onToggleStar = vi.fn();
      render(<RepoCard repository={repo} onToggleStar={onToggleStar} />);

      const starButton = screen.getByRole('button', { name: /star awesome-repo repository/i });
      expect(starButton).toBeInTheDocument();
      expect(starButton).toHaveTextContent('Star');
    });

    it('displays starred state when repository is starred', () => {
      const repo = createMockRepository({ is_starred: true });
      const onToggleStar = vi.fn();
      render(<RepoCard repository={repo} onToggleStar={onToggleStar} />);

      const starButton = screen.getByRole('button', {
        name: /unstar awesome-repo repository/i,
      });
      expect(starButton).toBeInTheDocument();
      expect(starButton).toHaveTextContent('Starred');
      expect(starButton).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });

    it('calls onToggleStar when star button is clicked', async () => {
      const user = userEvent.setup();
      const repo = createMockRepository({ is_starred: false });
      const onToggleStar = vi.fn();
      render(<RepoCard repository={repo} onToggleStar={onToggleStar} />);

      const starButton = screen.getByRole('button', { name: /star awesome-repo repository/i });
      await user.click(starButton);

      expect(onToggleStar).toHaveBeenCalledWith(repo);
      expect(onToggleStar).toHaveBeenCalledTimes(1);
    });

    it('does not open repository when star button is clicked', async () => {
      const user = userEvent.setup();
      const repo = createMockRepository({ is_starred: false });
      const onToggleStar = vi.fn();
      render(<RepoCard repository={repo} onToggleStar={onToggleStar} />);

      const starButton = screen.getByRole('button', { name: /star awesome-repo repository/i });
      await user.click(starButton);

      expect(mockWindowOpen).not.toHaveBeenCalled();
    });

    it('does not display star button when onToggleStar is not provided', () => {
      const repo = createMockRepository();
      render(<RepoCard repository={repo} />);

      expect(screen.queryByRole('button', { name: /star repository/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /unstar repository/i })).not.toBeInTheDocument();
    });
  });

  describe('Metrics display', () => {
    it('displays growth rate for stars', () => {
      const repo = createMockRepository({
        stargazers_count: 1234,
        metrics: { stars_growth_rate: 15.5 },
      });
      render(<RepoCard repository={repo} />);

      expect(screen.getByText(/\+15.5% this month/)).toBeInTheDocument();
    });

    it('displays negative growth rate for stars', () => {
      const repo = createMockRepository({
        stargazers_count: 1234,
        metrics: { stars_growth_rate: -5.2 },
      });
      render(<RepoCard repository={repo} />);

      const growthElement = screen.getByText(/-5.2% this month/);
      expect(growthElement).toBeInTheDocument();
      expect(growthElement).toHaveClass('text-red-600');
    });

    // Trending feature has been removed

    it('does not display trending indicator when repository is not trending', () => {
      const repo = createMockRepository({
        metrics: { is_trending: false },
      });
      render(<RepoCard repository={repo} />);

      expect(screen.queryByText(/trending/i)).not.toBeInTheDocument();
    });

    it('handles repository without metrics', () => {
      const repo = createMockRepository({ metrics: undefined });
      render(<RepoCard repository={repo} />);

      expect(screen.queryByText(/%/)).not.toBeInTheDocument();
      expect(screen.queryByText(/trending/i)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper accessibility structure with article and link', () => {
      const repo = createMockRepository();
      render(<RepoCard repository={repo} />);

      const article = screen.getByRole('article');
      expect(article).toBeInTheDocument();

      const link = screen.getByRole('link', { name: /awesome-repo by octocat/i });
      expect(link).toBeInTheDocument();
    });

    it('has proper accessibility attributes for star button', () => {
      const repo = createMockRepository({ is_starred: false });
      const onToggleStar = vi.fn();
      render(<RepoCard repository={repo} onToggleStar={onToggleStar} />);

      const starButton = screen.getByRole('button', { name: /star awesome-repo repository/i });
      expect(starButton).toBeInTheDocument();
    });

    it('has empty alt text for decorative avatar', () => {
      const repo = createMockRepository();
      render(<RepoCard repository={repo} />);

      const avatar = document.querySelector(
        'img[src="https://github.com/images/error/octocat_happy.gif"]'
      );
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('alt', '');
    });

    // Simplified UI no longer has complex aria-labels or tooltips
  });

  // Time formatting tests removed - last commit display has been removed from simplified UI

  // formatRelativeTime function tests removed - last commit display has been removed from simplified UI

  describe('Star count with growth rate display', () => {
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

    it('should display growth rate when non-zero', () => {
      const repository = createMockRepository({
        stargazers_count: 148018,
        metrics: {
          stars_growth_rate: 6.5, // Positive growth
          issues_growth_rate: 0,
          is_trending: false,
        },
      });

      render(<RepoCard repository={repository} />);

      // Should show star count with growth rate
      expect(screen.getByText(/Stars: 148\.0k/)).toBeInTheDocument();
      expect(screen.getByText(/\+6\.5% this month/)).toBeInTheDocument();
    });

    it('should handle negative growth rate', () => {
      const repository = createMockRepository({
        stargazers_count: 148018,
        metrics: {
          stars_growth_rate: -2.1, // Negative growth
          issues_growth_rate: 0,
          is_trending: false,
        },
      });

      render(<RepoCard repository={repository} />);

      // Should show star count with negative growth rate
      expect(screen.getByText(/Stars: 148\.0k/)).toBeInTheDocument();
      expect(screen.getByText(/-2\.1% this month/)).toBeInTheDocument();
    });
  });
});
