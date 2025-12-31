import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import RepositoryList from './RepositoryList';
import type { Repository } from '../types';

// Mock the logger to silence test output
vi.mock('../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

interface MockRepoCardProps {
  repository: Repository & { is_following?: boolean };
  onToggleFollow?: () => void;
}

// Mock RepoCard component
vi.mock('./RepoCard', () => ({
  RepoCard: ({ repository, onToggleFollow }: MockRepoCardProps) => (
    <div data-testid={`repo-card-${repository.id}`}>
      <h3>{repository.name}</h3>
      <p>{repository.description}</p>
      <span>{repository.stargazers_count} stars</span>
      <span>{repository.open_issues_count} issues</span>
      <span>{repository.is_following ? 'Following' : 'Not following'}</span>
      {onToggleFollow && (
        <button onClick={onToggleFollow}>{repository.is_following ? 'Unfollow' : 'Follow'}</button>
      )}
    </div>
  ),
}));

const createMockRepository = (overrides?: Partial<Repository>): Repository => ({
  id: 1,
  name: 'test-repo',
  full_name: 'user/test-repo',
  owner: {
    login: 'user',
    avatar_url: 'https://example.com/avatar.jpg',
  },
  description: 'Test repository description',
  html_url: 'https://github.com/user/test-repo',
  stargazers_count: 100,
  open_issues_count: 5,
  language: 'TypeScript',
  topics: ['react', 'typescript'],
  updated_at: '2024-01-15T10:00:00Z',
  pushed_at: '2024-01-15T10:00:00Z',
  created_at: '2023-01-01T00:00:00Z',
  ...overrides,
});

describe('RepositoryList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading state', () => {
    it('displays loading spinner when isLoading is true', () => {
      render(<RepositoryList repositories={[]} isLoading={true} />);
      const spinner = screen.getByRole('status', { hidden: true });
      expect(spinner).toHaveClass('animate-spin');
    });
  });

  describe('Error state', () => {
    it('displays error message when error is provided', () => {
      const error = new Error('Failed to fetch repositories');
      render(<RepositoryList repositories={[]} error={error} />);

      expect(screen.getByText(/error loading repositories/i)).toBeInTheDocument();
      expect(screen.getByText(error.message)).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('displays empty state when no repositories are provided', () => {
      render(<RepositoryList repositories={[]} />);

      expect(screen.getByText(/no repositories found/i)).toBeInTheDocument();
      expect(screen.getByText(/star some repositories/i)).toBeInTheDocument();
    });
  });

  describe('Repository display', () => {
    it('renders repository cards for provided repositories', () => {
      const repos = [
        createMockRepository({ id: 1, name: 'repo-1' }),
        createMockRepository({ id: 2, name: 'repo-2' }),
        createMockRepository({ id: 3, name: 'repo-3' }),
      ];

      render(<RepositoryList repositories={repos} />);

      expect(screen.getByTestId('repo-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('repo-card-2')).toBeInTheDocument();
      expect(screen.getByTestId('repo-card-3')).toBeInTheDocument();
    });

    it('passes follow state correctly to repo cards', () => {
      const repos = [
        createMockRepository({ id: 1, name: 'repo-1' }),
        createMockRepository({ id: 2, name: 'repo-2' }),
      ];
      const followedRepos = new Set([1]);

      render(
        <RepositoryList
          repositories={repos}
          followedRepos={followedRepos}
          onFollow={vi.fn()}
          onUnfollow={vi.fn()}
        />
      );

      const card1 = screen.getByTestId('repo-card-1');
      const card2 = screen.getByTestId('repo-card-2');

      expect(card1).toHaveTextContent('Following');
      expect(card2).toHaveTextContent('Not following');
    });

    it('calls onFollow when follow button is clicked', () => {
      const onFollow = vi.fn();
      const onUnfollow = vi.fn();
      const repos = [createMockRepository({ id: 1, name: 'repo-1' })];

      render(<RepositoryList repositories={repos} onFollow={onFollow} onUnfollow={onUnfollow} />);

      const followButton = screen.getByRole('button', { name: /follow/i });
      fireEvent.click(followButton);

      expect(onFollow).toHaveBeenCalledWith(1);
    });

    it('calls onUnfollow when unfollow button is clicked', () => {
      const onFollow = vi.fn();
      const onUnfollow = vi.fn();
      const repos = [createMockRepository({ id: 1, name: 'repo-1' })];
      const followedRepos = new Set([1]);

      render(
        <RepositoryList
          repositories={repos}
          followedRepos={followedRepos}
          onFollow={onFollow}
          onUnfollow={onUnfollow}
        />
      );

      const unfollowButton = screen.getByRole('button', { name: /unfollow/i });
      fireEvent.click(unfollowButton);

      expect(onUnfollow).toHaveBeenCalledWith(1);
    });
  });

  describe('Search functionality', () => {
    it('uses external search when provided', () => {
      const mockOnSearchChange = vi.fn();
      const repos = [createMockRepository({ id: 1, name: 'test-repo' })];
      render(
        <RepositoryList
          repositories={repos}
          searchQuery="test"
          onSearchChange={mockOnSearchChange}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search repositories/i);
      fireEvent.change(searchInput, { target: { value: 'new search' } });

      expect(mockOnSearchChange).toHaveBeenCalledWith('new search');
    });

    it('shows searching indicator when isSearching is true', () => {
      const repos = [createMockRepository({ id: 1, name: 'test-repo' })];
      render(
        <RepositoryList
          repositories={repos}
          searchQuery="test"
          onSearchChange={vi.fn()}
          isSearching={true}
        />
      );

      expect(screen.getByText('Searching GitHub...')).toBeInTheDocument();
    });

    it('shows search placeholder with quotes hint', () => {
      const repos = [createMockRepository({ id: 1, name: 'test-repo' })];
      render(<RepositoryList repositories={repos} />);

      const searchInput = screen.getByPlaceholderText(/search repositories/i);
      expect(searchInput).toHaveAttribute(
        'placeholder',
        'Search repositories... (use "quotes" for exact name match)'
      );
    });

    it('filters repositories based on search query', () => {
      const repos = [
        createMockRepository({ id: 1, name: 'react-app', topics: [] }),
        createMockRepository({ id: 2, name: 'vue-app', topics: [] }),
        createMockRepository({ id: 3, name: 'angular-app', topics: [] }),
      ];

      render(<RepositoryList repositories={repos} />);

      const searchInput = screen.getByLabelText(/search repositories/i);
      fireEvent.change(searchInput, { target: { value: 'react' } });

      expect(screen.getByTestId('repo-card-1')).toBeInTheDocument();
      expect(screen.queryByTestId('repo-card-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('repo-card-3')).not.toBeInTheDocument();
    });

    it('searches in description', () => {
      const repos = [
        createMockRepository({ id: 1, name: 'repo-1', description: 'React framework' }),
        createMockRepository({ id: 2, name: 'repo-2', description: 'Vue framework' }),
      ];

      render(<RepositoryList repositories={repos} />);

      const searchInput = screen.getByLabelText(/search repositories/i);
      fireEvent.change(searchInput, { target: { value: 'vue' } });

      expect(screen.queryByTestId('repo-card-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('repo-card-2')).toBeInTheDocument();
    });

    it('searches in language', () => {
      const repos = [
        createMockRepository({ id: 1, language: 'Python' }),
        createMockRepository({ id: 2, language: 'JavaScript' }),
      ];

      render(<RepositoryList repositories={repos} />);

      const searchInput = screen.getByLabelText(/search repositories/i);
      fireEvent.change(searchInput, { target: { value: 'python' } });

      expect(screen.getByTestId('repo-card-1')).toBeInTheDocument();
      expect(screen.queryByTestId('repo-card-2')).not.toBeInTheDocument();
    });

    it('searches in topics', () => {
      const repos = [
        createMockRepository({ id: 1, topics: ['react', 'frontend'] }),
        createMockRepository({ id: 2, topics: ['backend', 'api'] }),
      ];

      render(<RepositoryList repositories={repos} />);

      const searchInput = screen.getByLabelText(/search repositories/i);
      fireEvent.change(searchInput, { target: { value: 'backend' } });

      expect(screen.queryByTestId('repo-card-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('repo-card-2')).toBeInTheDocument();
    });

    it('shows no results message when search returns nothing', () => {
      const repos = [createMockRepository({ id: 1, name: 'repo-1' })];

      render(<RepositoryList repositories={repos} />);

      const searchInput = screen.getByLabelText(/search repositories/i);
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      // Use getAllByText since we have both visible and sr-only versions
      const noResultsTexts = screen.getAllByText(/no repositories match your filters/i);
      expect(noResultsTexts.length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
    });

    it('clears filters when clear button is clicked', () => {
      const repos = [createMockRepository({ id: 1, name: 'repo-1' })];

      render(<RepositoryList repositories={repos} />);

      const searchInput = screen.getByLabelText(/search repositories/i);
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      const clearButton = screen.getByRole('button', { name: /clear filters/i });
      fireEvent.click(clearButton);

      expect(searchInput).toHaveValue('');
      expect(screen.getByTestId('repo-card-1')).toBeInTheDocument();
    });
  });

  describe('Filter functionality', () => {
    it('filters by active repositories', () => {
      const now = new Date();
      const recentDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const oldDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const repos = [
        createMockRepository({ id: 1, pushed_at: recentDate }),
        createMockRepository({ id: 2, pushed_at: oldDate }),
      ];

      render(<RepositoryList repositories={repos} />);

      const filterSelect = screen.getByLabelText(/filter repositories/i);
      fireEvent.change(filterSelect, { target: { value: 'active' } });

      expect(screen.getByTestId('repo-card-1')).toBeInTheDocument();
      expect(screen.queryByTestId('repo-card-2')).not.toBeInTheDocument();
    });

    it('shows all repositories when filter is set to all', () => {
      const repos = [createMockRepository({ id: 1 }), createMockRepository({ id: 2 })];

      render(<RepositoryList repositories={repos} />);

      const filterSelect = screen.getByLabelText(/filter repositories/i);
      fireEvent.change(filterSelect, { target: { value: 'all' } });

      expect(screen.getByTestId('repo-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('repo-card-2')).toBeInTheDocument();
    });
  });

  describe('Sort functionality', () => {
    it('sorts by stars', () => {
      const repos = [
        createMockRepository({ id: 1, name: 'repo-1', stargazers_count: 50 }),
        createMockRepository({ id: 2, name: 'repo-2', stargazers_count: 200 }),
        createMockRepository({ id: 3, name: 'repo-3', stargazers_count: 100 }),
      ];

      render(<RepositoryList repositories={repos} />);

      const sortSelect = screen.getByLabelText(/sort repositories/i);
      fireEvent.change(sortSelect, { target: { value: 'stars' } });

      const cards = screen.getAllByTestId(/repo-card-/);
      expect(cards[0]).toHaveAttribute('data-testid', 'repo-card-2');
      expect(cards[1]).toHaveAttribute('data-testid', 'repo-card-3');
      expect(cards[2]).toHaveAttribute('data-testid', 'repo-card-1');
    });

    it('sorts by name alphabetically', () => {
      const repos = [
        createMockRepository({ id: 1, name: 'zebra' }),
        createMockRepository({ id: 2, name: 'apple' }),
        createMockRepository({ id: 3, name: 'banana' }),
      ];

      render(<RepositoryList repositories={repos} />);

      const sortSelect = screen.getByLabelText(/sort repositories/i);
      fireEvent.change(sortSelect, { target: { value: 'name' } });

      const cards = screen.getAllByTestId(/repo-card-/);
      expect(cards[0]).toHaveAttribute('data-testid', 'repo-card-2');
      expect(cards[1]).toHaveAttribute('data-testid', 'repo-card-3');
      expect(cards[2]).toHaveAttribute('data-testid', 'repo-card-1');
    });

    it('sorts by open issues', () => {
      const repos = [
        createMockRepository({ id: 1, open_issues_count: 5 }),
        createMockRepository({ id: 2, open_issues_count: 20 }),
        createMockRepository({ id: 3, open_issues_count: 10 }),
      ];

      render(<RepositoryList repositories={repos} />);

      const sortSelect = screen.getByLabelText(/sort repositories/i);
      fireEvent.change(sortSelect, { target: { value: 'issues' } });

      const cards = screen.getAllByTestId(/repo-card-/);
      expect(cards[0]).toHaveAttribute('data-testid', 'repo-card-2');
      expect(cards[1]).toHaveAttribute('data-testid', 'repo-card-3');
      expect(cards[2]).toHaveAttribute('data-testid', 'repo-card-1');
    });

    it('sorts by activity (recent first)', () => {
      const repos = [
        createMockRepository({
          id: 1,
          pushed_at: '2024-01-10T00:00:00Z',
          updated_at: '2024-01-10T00:00:00Z',
        }),
        createMockRepository({
          id: 2,
          pushed_at: '2024-01-20T00:00:00Z',
          updated_at: '2024-01-20T00:00:00Z',
        }),
        createMockRepository({
          id: 3,
          pushed_at: '2024-01-15T00:00:00Z',
          updated_at: '2024-01-15T00:00:00Z',
        }),
      ];

      render(<RepositoryList repositories={repos} />);

      const sortSelect = screen.getByLabelText(/sort repositories/i);
      fireEvent.change(sortSelect, { target: { value: 'activity' } });

      const cards = screen.getAllByTestId(/repo-card-/);
      expect(cards[0]).toHaveAttribute('data-testid', 'repo-card-2');
      expect(cards[1]).toHaveAttribute('data-testid', 'repo-card-3');
      expect(cards[2]).toHaveAttribute('data-testid', 'repo-card-1');
    });
  });

  describe('Pagination', () => {
    it('displays correct number of items per page', () => {
      const repos = Array.from({ length: 15 }, (_, i) =>
        createMockRepository({ id: i + 1, name: `repo-${i + 1}` })
      );

      render(<RepositoryList repositories={repos} itemsPerPage={5} />);

      const cards = screen.getAllByTestId(/repo-card-/);
      expect(cards).toHaveLength(5);
    });

    it('shows pagination controls when there are multiple pages', () => {
      const repos = Array.from({ length: 15 }, (_, i) =>
        createMockRepository({ id: i + 1, name: `repo-${i + 1}` })
      );

      render(<RepositoryList repositories={repos} itemsPerPage={5} />);

      // Check for page number buttons instead of text
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
    });

    it('navigates to next page', () => {
      const repos = Array.from({ length: 10 }, (_, i) =>
        createMockRepository({ id: i + 1, name: `repo-${i + 1}` })
      );

      render(<RepositoryList repositories={repos} itemsPerPage={5} />);

      const nextButton = screen
        .getAllByRole('button')
        .find((btn) => btn.textContent === 'Next' || btn.querySelector('[aria-hidden="true"]'));

      if (nextButton) {
        fireEvent.click(nextButton);
      }

      expect(screen.getByTestId('repo-card-6')).toBeInTheDocument();
      expect(screen.queryByTestId('repo-card-1')).not.toBeInTheDocument();
    });

    it('navigates to previous page', () => {
      const repos = Array.from({ length: 10 }, (_, i) =>
        createMockRepository({ id: i + 1, name: `repo-${i + 1}` })
      );

      render(<RepositoryList repositories={repos} itemsPerPage={5} />);

      // Go to page 2 first
      const nextButton = screen
        .getAllByRole('button')
        .find((btn) => btn.textContent === 'Next' || btn.querySelector('[aria-hidden="true"]'));

      if (nextButton) {
        fireEvent.click(nextButton);
      }

      // Then go back
      const prevButton = screen
        .getAllByRole('button')
        .find(
          (btn) =>
            btn.textContent === 'Previous' ||
            btn.querySelector('.sr-only')?.textContent === 'Previous'
        );

      if (prevButton) {
        fireEvent.click(prevButton);
      }

      expect(screen.getByTestId('repo-card-1')).toBeInTheDocument();
      expect(screen.queryByTestId('repo-card-6')).not.toBeInTheDocument();
    });

    it('navigates to specific page number', () => {
      const repos = Array.from({ length: 15 }, (_, i) =>
        createMockRepository({ id: i + 1, name: `repo-${i + 1}` })
      );

      render(<RepositoryList repositories={repos} itemsPerPage={5} />);

      const page3Button = screen.getByRole('button', { name: '3' });
      fireEvent.click(page3Button);

      expect(screen.getByTestId('repo-card-11')).toBeInTheDocument();
      expect(screen.queryByTestId('repo-card-1')).not.toBeInTheDocument();
    });

    it('disables previous button on first page', () => {
      const repos = Array.from({ length: 10 }, (_, i) =>
        createMockRepository({ id: i + 1, name: `repo-${i + 1}` })
      );

      render(<RepositoryList repositories={repos} itemsPerPage={5} />);

      const prevButtons = screen
        .getAllByRole('button')
        .filter(
          (btn) =>
            btn.textContent === 'Previous' ||
            btn.querySelector('.sr-only')?.textContent === 'Previous'
        );

      prevButtons.forEach((btn) => {
        expect(btn).toBeDisabled();
      });
    });

    it('disables next button on last page', () => {
      const repos = Array.from({ length: 10 }, (_, i) =>
        createMockRepository({ id: i + 1, name: `repo-${i + 1}` })
      );

      render(<RepositoryList repositories={repos} itemsPerPage={5} />);

      // Go to last page
      const page2Button = screen.getByRole('button', { name: '2' });
      fireEvent.click(page2Button);

      const nextButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.textContent === 'Next' || btn.querySelector('[aria-hidden="true"]'));

      const disabledNextButtons = nextButtons.filter((btn) => btn.hasAttribute('disabled'));
      expect(disabledNextButtons.length).toBeGreaterThan(0);
    });

    it('resets to page 1 when filters change', () => {
      const repos = Array.from({ length: 10 }, (_, i) =>
        createMockRepository({ id: i + 1, name: `repo-${i + 1}` })
      );

      render(<RepositoryList repositories={repos} itemsPerPage={5} />);

      // Go to page 2
      const page2Button = screen.getByRole('button', { name: '2' });
      fireEvent.click(page2Button);

      // Change filter
      const searchInput = screen.getByLabelText(/search repositories/i);
      fireEvent.change(searchInput, { target: { value: 'repo' } });

      // Should be back on page 1
      expect(screen.getByTestId('repo-card-1')).toBeInTheDocument();
      expect(screen.queryByTestId('repo-card-6')).not.toBeInTheDocument();
    });
  });

  describe('Combined functionality', () => {
    it('applies search and filter together', () => {
      const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const repos = [
        createMockRepository({
          id: 1,
          name: 'react-app',
          stargazers_count: 150,
          topics: [],
          pushed_at: recentDate, // Recently active
        }),
        createMockRepository({
          id: 2,
          name: 'react-lib',
          stargazers_count: 50,
          topics: [],
          pushed_at: oldDate, // Not recently active
        }),
        createMockRepository({
          id: 3,
          name: 'vue-app',
          stargazers_count: 200,
          topics: [],
          pushed_at: recentDate, // Recently active but doesn't match search
        }),
      ];

      render(<RepositoryList repositories={repos} />);

      // Apply search
      const searchInput = screen.getByLabelText(/search repositories/i);
      fireEvent.change(searchInput, { target: { value: 'react' } });

      // Apply filter
      const filterSelect = screen.getByLabelText(/filter repositories/i);
      fireEvent.change(filterSelect, { target: { value: 'active' } });

      // Only react-app should be visible (matches search "react" and is recently active)
      expect(screen.getByTestId('repo-card-1')).toBeInTheDocument();
      expect(screen.queryByTestId('repo-card-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('repo-card-3')).not.toBeInTheDocument();
    });

    it('maintains sort order after filtering', () => {
      const now = new Date();
      const recentDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

      const repos = [
        createMockRepository({
          id: 1,
          stargazers_count: 50,
          pushed_at: recentDate,
        }),
        createMockRepository({
          id: 2,
          stargazers_count: 200,
          pushed_at: recentDate,
        }),
        createMockRepository({
          id: 3,
          stargazers_count: 100,
          pushed_at: recentDate,
        }),
      ];

      render(<RepositoryList repositories={repos} />);

      // Apply sort
      const sortSelect = screen.getByLabelText(/sort repositories/i);
      fireEvent.change(sortSelect, { target: { value: 'stars' } });

      // Apply filter
      const filterSelect = screen.getByLabelText(/filter repositories/i);
      fireEvent.change(filterSelect, { target: { value: 'active' } });

      // All should be visible in star order
      const cards = screen.getAllByTestId(/repo-card-/);
      expect(cards[0]).toHaveAttribute('data-testid', 'repo-card-2');
      expect(cards[1]).toHaveAttribute('data-testid', 'repo-card-3');
      expect(cards[2]).toHaveAttribute('data-testid', 'repo-card-1');
    });
  });
});
