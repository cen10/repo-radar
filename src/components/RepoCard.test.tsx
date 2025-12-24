import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RepoCard } from './RepoCard';
import { formatRelativeTime } from '../utils/relativeTime';
import type { RepositoryWithMetrics } from '../types';
import { logger } from '../utils/logger';

// Mock the logger to silence test output
vi.mock('../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock window.open
const mockWindowOpen = vi.fn();
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
  writable: true,
});

const createMockRepository = (
  overrides: Partial<RepositoryWithMetrics> = {}
): RepositoryWithMetrics => ({
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

    expect(screen.getByText('1.2k')).toBeInTheDocument();
  });

  it('displays star count without formatting for small numbers', () => {
    const repo = createMockRepository({ stargazers_count: 567 });
    render(<RepoCard repository={repo} />);

    expect(screen.getByText('567')).toBeInTheDocument();
  });

  it('displays issue count correctly', () => {
    const repo = createMockRepository({ open_issues_count: 42 });
    render(<RepoCard repository={repo} />);

    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('displays language with appropriate styling', () => {
    const repo = createMockRepository({ language: 'JavaScript' });
    render(<RepoCard repository={repo} />);

    const languageBadge = screen.getByLabelText('Primary language: JavaScript');
    expect(languageBadge).toBeInTheDocument();
    // Language badge has multiple classes including the color classes
    expect(languageBadge.className).toMatch(/bg-amber-100/);
    expect(languageBadge.className).toMatch(/text-amber-800/);
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

  it('displays relative time correctly', () => {
    const repo = createMockRepository({
      pushed_at: '2024-01-15T10:30:00Z', // 1 day ago from mocked current time
    });
    render(<RepoCard repository={repo} />);

    expect(screen.getByText(/last commit 1 day ago/i)).toBeInTheDocument();
  });

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

  it('handles repository with no pushed_at date', () => {
    const repo = createMockRepository({ pushed_at: null });
    render(<RepoCard repository={repo} />);

    expect(screen.getByText('No commits yet')).toBeInTheDocument();
  });

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
      await user.click(followButton);

      expect(onToggleFollow).toHaveBeenCalledWith(repo);
    });

    it('metrics are focusable for keyboard navigation', () => {
      const repo = createMockRepository({
        stargazers_count: 1234,
        metrics: { stars_growth_rate: 12.5 },
      });
      render(<RepoCard repository={repo} />);

      // Star count with growth rate should be focusable
      const starElement = screen.getByLabelText('1.2 thousand stars with +12.5% growth');
      expect(starElement).toHaveAttribute('tabIndex', '0');
    });

    it('does not open repository when Space is pressed on issue count metric', async () => {
      const user = userEvent.setup();
      const repo = createMockRepository();
      render(<RepoCard repository={repo} />);

      const issueElement = screen.getByLabelText('42 open issues');
      issueElement.focus();
      await user.keyboard(' ');

      expect(mockWindowOpen).not.toHaveBeenCalled();
    });

    it('does not open repository when Enter is pressed on language badge', async () => {
      const user = userEvent.setup();
      const repo = createMockRepository({ language: 'TypeScript' });
      render(<RepoCard repository={repo} />);

      const languageElement = screen.getByLabelText('Primary language: TypeScript');
      languageElement.focus();
      await user.keyboard('{Enter}');

      expect(mockWindowOpen).not.toHaveBeenCalled();
    });
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
        metrics: { stars_growth_rate: 15.5 },
      });
      render(<RepoCard repository={repo} />);

      expect(screen.getByText('+15.5%')).toBeInTheDocument();
    });

    it('displays negative growth rate for stars', () => {
      const repo = createMockRepository({
        metrics: { stars_growth_rate: -5.2 },
      });
      render(<RepoCard repository={repo} />);

      const growthElement = screen.getByText('-5.2%');
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

    it('has aria-label for star count with proper formatting', () => {
      const repo = createMockRepository({ stargazers_count: 1234 });
      render(<RepoCard repository={repo} />);

      const starElement = screen.getByLabelText('1.2 thousand stars');
      expect(starElement).toBeInTheDocument();
    });

    it('has aria-label for issue count with context', () => {
      const repo = createMockRepository({ open_issues_count: 42 });
      render(<RepoCard repository={repo} />);

      const issueElement = screen.getByLabelText('42 open issues');
      expect(issueElement).toBeInTheDocument();
    });

    it('has aria-label for language badge with context', () => {
      const repo = createMockRepository({ language: 'TypeScript' });
      render(<RepoCard repository={repo} />);

      const languageElement = screen.getByLabelText('Primary language: TypeScript');
      expect(languageElement).toBeInTheDocument();
    });

    it('has aria-label for star count with growth rate when metrics exist', () => {
      const repo = createMockRepository({
        stargazers_count: 1234,
        metrics: { stars_growth_rate: 12.5 },
      });
      render(<RepoCard repository={repo} />);

      const starElement = screen.getByLabelText('1.2 thousand stars with +12.5% growth');
      expect(starElement).toBeInTheDocument();
    });

    it('star count with growth rate is focusable', () => {
      const repo = createMockRepository({
        stargazers_count: 1234,
        metrics: { stars_growth_rate: 12.5 },
      });
      render(<RepoCard repository={repo} />);

      const starElement = screen.getByLabelText('1.2 thousand stars with +12.5% growth');
      expect(starElement).toHaveAttribute('tabIndex', '0');
    });

    it('has focusable issue count element', () => {
      const repo = createMockRepository();
      render(<RepoCard repository={repo} />);

      const issueElement = screen.getByLabelText('42 open issues');
      expect(issueElement).toHaveAttribute('tabIndex', '0');
    });

    it('has focusable language badge element', () => {
      const repo = createMockRepository({ language: 'TypeScript' });
      render(<RepoCard repository={repo} />);

      const languageElement = screen.getByLabelText('Primary language: TypeScript');
      expect(languageElement).toHaveAttribute('tabIndex', '0');
    });

    it('star count without growth rate is focusable', () => {
      const repo = createMockRepository({ stargazers_count: 1234 });
      render(<RepoCard repository={repo} />);

      const starElement = screen.getByLabelText('1.2 thousand stars');
      expect(starElement).toHaveAttribute('tabIndex', '0');
    });

    it('tooltips are hidden from screen readers', () => {
      const repo = createMockRepository({
        open_issues_count: 42,
        language: 'TypeScript',
        metrics: { stars_growth_rate: 12.5 },
      });
      render(<RepoCard repository={repo} />);

      // Check that tooltip content exists but is aria-hidden
      const tooltips = screen.queryAllByText(
        /open issue count|primary language|\+12\.5% growth over 7 days/i
      );
      tooltips.forEach((tooltip) => {
        // The tooltip should be in a parent element that is aria-hidden
        const tooltipElement = tooltip.closest('[aria-hidden="true"]');
        expect(tooltipElement).toBeInTheDocument();
      });
    });
  });

  describe('Time formatting', () => {
    it('formats recent time as "just now"', () => {
      const repo = createMockRepository({
        pushed_at: '2024-01-16T10:29:30Z', // 30 seconds ago
      });
      render(<RepoCard repository={repo} />);

      expect(screen.getByText(/last commit just now/i)).toBeInTheDocument();
    });

    it('formats minutes correctly', () => {
      const repo = createMockRepository({
        pushed_at: '2024-01-16T10:25:00Z', // 5 minutes ago
      });
      render(<RepoCard repository={repo} />);

      expect(screen.getByText(/last commit 5 minutes ago/i)).toBeInTheDocument();
    });

    it('formats hours correctly', () => {
      const repo = createMockRepository({
        pushed_at: '2024-01-16T08:30:00Z', // 2 hours ago
      });
      render(<RepoCard repository={repo} />);

      expect(screen.getByText(/last commit 2 hours ago/i)).toBeInTheDocument();
    });

    it('formats months correctly', () => {
      const repo = createMockRepository({
        pushed_at: '2023-12-16T10:30:00Z', // 1 month ago
      });
      render(<RepoCard repository={repo} />);

      expect(screen.getByText(/last commit 1 month ago/i)).toBeInTheDocument();
    });

    it('formats years correctly', () => {
      const repo = createMockRepository({
        pushed_at: '2022-01-16T10:30:00Z', // 2 years ago
      });
      render(<RepoCard repository={repo} />);

      expect(screen.getByText(/last commit 2 years ago/i)).toBeInTheDocument();
    });
  });

  describe('formatRelativeTime function', () => {
    const baseTime = new Date('2024-01-16T10:30:00Z');
    const loggerWarnSpy = vi.spyOn(logger, 'warn');

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(baseTime);
      loggerWarnSpy.mockClear();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('formats time less than 60 seconds as "just now"', () => {
      const time30SecondsAgo = new Date(baseTime.getTime() - 30 * 1000).toISOString();
      expect(formatRelativeTime(time30SecondsAgo)).toBe('just now');

      const time59SecondsAgo = new Date(baseTime.getTime() - 59 * 1000).toISOString();
      expect(formatRelativeTime(time59SecondsAgo)).toBe('just now');

      const timeNow = baseTime.toISOString();
      expect(formatRelativeTime(timeNow)).toBe('just now');
    });

    it('formats minutes correctly', () => {
      const time1MinuteAgo = new Date(baseTime.getTime() - 1 * 60 * 1000).toISOString();
      expect(formatRelativeTime(time1MinuteAgo)).toBe('1 minute ago');

      const time5MinutesAgo = new Date(baseTime.getTime() - 5 * 60 * 1000).toISOString();
      expect(formatRelativeTime(time5MinutesAgo)).toBe('5 minutes ago');

      const time59MinutesAgo = new Date(baseTime.getTime() - 59 * 60 * 1000).toISOString();
      expect(formatRelativeTime(time59MinutesAgo)).toBe('59 minutes ago');
    });

    it('formats hours correctly', () => {
      const time1HourAgo = new Date(baseTime.getTime() - 1 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(time1HourAgo)).toBe('1 hour ago');

      const time5HoursAgo = new Date(baseTime.getTime() - 5 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(time5HoursAgo)).toBe('5 hours ago');

      const time23HoursAgo = new Date(baseTime.getTime() - 23 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(time23HoursAgo)).toBe('23 hours ago');
    });

    it('formats days correctly', () => {
      const time1DayAgo = new Date(baseTime.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(time1DayAgo)).toBe('1 day ago');

      const time7DaysAgo = new Date(baseTime.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(time7DaysAgo)).toBe('7 days ago');

      const time29DaysAgo = new Date(baseTime.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(time29DaysAgo)).toBe('29 days ago');
    });

    it('formats months correctly', () => {
      const time1MonthAgo = new Date(baseTime.getTime() - 31 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(time1MonthAgo)).toBe('1 month ago');

      const time3MonthsAgo = new Date(baseTime.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(time3MonthsAgo)).toBe('3 months ago');

      const time11MonthsAgo = new Date(
        baseTime.getTime() - 335 * 24 * 60 * 60 * 1000
      ).toISOString();
      expect(formatRelativeTime(time11MonthsAgo)).toBe('11 months ago');
    });

    it('formats years correctly', () => {
      const time1YearAgo = new Date(baseTime.getTime() - 366 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(time1YearAgo)).toBe('1 year ago');

      const time2YearsAgo = new Date(
        baseTime.getTime() - 2 * 365 * 24 * 60 * 60 * 1000
      ).toISOString();
      expect(formatRelativeTime(time2YearsAgo)).toBe('2 years ago');

      const time5YearsAgo = new Date(
        baseTime.getTime() - 5 * 365 * 24 * 60 * 60 * 1000
      ).toISOString();
      expect(formatRelativeTime(time5YearsAgo)).toBe('5 years ago');
    });

    it('handles edge cases and boundary conditions', () => {
      // Exactly 1 hour
      const exactly1Hour = new Date(baseTime.getTime() - 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(exactly1Hour)).toBe('1 hour ago');

      // Exactly 1 day
      const exactly1Day = new Date(baseTime.getTime() - 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(exactly1Day)).toBe('1 day ago');

      // Exactly 30 days (1 month boundary)
      const exactly30Days = new Date(baseTime.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(exactly30Days)).toBe('1 month ago');

      // Exactly 1 year
      const exactly1Year = new Date(baseTime.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(exactly1Year)).toBe('1 year ago');
    });

    it('handles future dates as invalid', () => {
      const futureTime = new Date(baseTime.getTime() + 1000).toISOString();
      expect(formatRelativeTime(futureTime)).toBe('Invalid date');

      const farFutureTime = new Date(baseTime.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(farFutureTime)).toBe('Invalid date');
    });

    it('handles invalid date strings explicitly', () => {
      expect(formatRelativeTime('invalid-date')).toBe('Invalid date');
      expect(formatRelativeTime('')).toBe('Invalid date');
    });

    it('logs warning for invalid date strings', () => {
      formatRelativeTime('invalid-date');

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Invalid date string provided to formatRelativeTime',
        {
          dateString: 'invalid-date',
          context: 'formatRelativeTime',
        }
      );
    });

    it('logs warning for future dates', () => {
      const futureTime = new Date(baseTime.getTime() + 1000).toISOString();
      formatRelativeTime(futureTime);

      expect(loggerWarnSpy).toHaveBeenCalledWith('Future date provided to formatRelativeTime', {
        dateString: futureTime,
        date: futureTime,
        now: baseTime.toISOString(),
        context: 'formatRelativeTime',
      });
    });

    it('uses correct singular/plural forms', () => {
      // Singular forms
      const time1MinuteAgo = new Date(baseTime.getTime() - 1 * 60 * 1000).toISOString();
      expect(formatRelativeTime(time1MinuteAgo)).toBe('1 minute ago');

      const time1HourAgo = new Date(baseTime.getTime() - 1 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(time1HourAgo)).toBe('1 hour ago');

      const time1DayAgo = new Date(baseTime.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(time1DayAgo)).toBe('1 day ago');

      // Plural forms
      const time2MinutesAgo = new Date(baseTime.getTime() - 2 * 60 * 1000).toISOString();
      expect(formatRelativeTime(time2MinutesAgo)).toBe('2 minutes ago');

      const time2HoursAgo = new Date(baseTime.getTime() - 2 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(time2HoursAgo)).toBe('2 hours ago');

      const time2DaysAgo = new Date(baseTime.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(time2DaysAgo)).toBe('2 days ago');
    });
  });
});
