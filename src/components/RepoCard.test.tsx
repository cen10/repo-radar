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
  starred_at: '2024-01-01T12:00:00Z',
  ...overrides,
});

describe('RepoCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock current time for consistent relative time tests
    vi.setSystemTime(new Date('2024-01-16T10:30:00Z'));
  });

  it('displays starred indicator when repository is starred', () => {
    const repo = createMockRepository({
      starred_at: '2024-01-01T12:00:00Z',
    });
    render(<RepoCard repository={repo} />);

    expect(screen.getByText('⭐ Starred')).toBeInTheDocument();
  });

  it('does not display starred indicator when repository is not starred', () => {
    const repo = createMockRepository({
      starred_at: undefined,
    });
    render(<RepoCard repository={repo} />);

    expect(screen.queryByText('⭐ Starred')).not.toBeInTheDocument();
  });

  it('positions follow button lower when starred indicator is present', () => {
    const repo = createMockRepository({
      starred_at: '2024-01-01T12:00:00Z',
      is_following: false,
    });
    const onToggleFollow = vi.fn();
    render(<RepoCard repository={repo} onToggleFollow={onToggleFollow} />);

    const followButton = screen.getByRole('button', { name: /follow awesome-repo repository/i });
    expect(followButton).toHaveClass('top-10');
  });

  it('positions follow button normally when no starred indicator', () => {
    const repo = createMockRepository({
      starred_at: undefined,
      is_following: false,
    });
    const onToggleFollow = vi.fn();
    render(<RepoCard repository={repo} onToggleFollow={onToggleFollow} />);

    const followButton = screen.getByRole('button', { name: /follow awesome-repo repository/i });
    expect(followButton).toHaveClass('top-6');
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
    it('follow button responds to Enter key press', async () => {
      const user = userEvent.setup();
      const repo = createMockRepository({ is_following: false });
      const onToggleFollow = vi.fn();
      render(<RepoCard repository={repo} onToggleFollow={onToggleFollow} />);

      const followButton = screen.getByRole('button', { name: /follow awesome-repo repository/i });
      followButton.focus();
      await user.keyboard('{Enter}');

      expect(onToggleFollow).toHaveBeenCalledWith(repo);
    });

    it('follow button responds to Space key press', async () => {
      const user = userEvent.setup();
      const repo = createMockRepository({ is_following: true });
      const onToggleFollow = vi.fn();
      render(<RepoCard repository={repo} onToggleFollow={onToggleFollow} />);

      const followButton = screen.getByRole('button', {
        name: /unfollow awesome-repo repository/i,
      });
      followButton.focus();
      await user.keyboard(' ');

      expect(onToggleFollow).toHaveBeenCalledWith(repo);
    });

    // Metrics are no longer focusable in simplified UI

    // Metrics are no longer focusable in simplified UI
  });

  describe('Follow functionality', () => {
    it('displays follow button when onToggleFollow is provided', () => {
      const repo = createMockRepository({ is_following: false });
      const onToggleFollow = vi.fn();
      render(<RepoCard repository={repo} onToggleFollow={onToggleFollow} />);

      const followButton = screen.getByRole('button', { name: /follow awesome-repo repository/i });
      expect(followButton).toBeInTheDocument();
      expect(followButton).toHaveTextContent('Follow');
    });

    it('displays following state when repository is followed', () => {
      const repo = createMockRepository({ is_following: true });
      const onToggleFollow = vi.fn();
      render(<RepoCard repository={repo} onToggleFollow={onToggleFollow} />);

      const followButton = screen.getByRole('button', {
        name: /unfollow awesome-repo repository/i,
      });
      expect(followButton).toBeInTheDocument();
      expect(followButton).toHaveTextContent('Following');
      expect(followButton).toHaveClass('bg-blue-100', 'text-blue-800');
    });

    it('calls onToggleFollow when follow button is clicked', async () => {
      const user = userEvent.setup();
      const repo = createMockRepository({ is_following: false });
      const onToggleFollow = vi.fn();
      render(<RepoCard repository={repo} onToggleFollow={onToggleFollow} />);

      const followButton = screen.getByRole('button', { name: /follow awesome-repo repository/i });
      await user.click(followButton);

      expect(onToggleFollow).toHaveBeenCalledWith(repo);
      expect(onToggleFollow).toHaveBeenCalledTimes(1);
    });

    it('does not open repository when follow button is clicked', async () => {
      const user = userEvent.setup();
      const repo = createMockRepository({ is_following: false });
      const onToggleFollow = vi.fn();
      render(<RepoCard repository={repo} onToggleFollow={onToggleFollow} />);

      const followButton = screen.getByRole('button', { name: /follow awesome-repo repository/i });
      await user.click(followButton);

      expect(mockWindowOpen).not.toHaveBeenCalled();
    });

    it('does not display follow button when onToggleFollow is not provided', () => {
      const repo = createMockRepository();
      render(<RepoCard repository={repo} />);

      expect(screen.queryByRole('button', { name: /follow repository/i })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /unfollow repository/i })
      ).not.toBeInTheDocument();
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

    it('has proper accessibility attributes for follow button', () => {
      const repo = createMockRepository({ is_following: false });
      const onToggleFollow = vi.fn();
      render(<RepoCard repository={repo} onToggleFollow={onToggleFollow} />);

      const followButton = screen.getByRole('button', { name: /follow awesome-repo repository/i });
      expect(followButton).toBeInTheDocument();
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
});
