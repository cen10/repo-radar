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
  onToggleStar: () => void;
}

// Mock RepoCard component
vi.mock('./RepoCard', () => ({
  RepoCard: ({ repository, onToggleStar }: MockRepoCardProps) => (
    <div data-testid={`repo-card-${repository.id}`}>
      <h3>{repository.name}</h3>
      <p>{repository.description}</p>
      <span>{repository.stargazers_count} stars</span>
      <span>{repository.open_issues_count} issues</span>
      <span>{repository.is_starred ? 'Starred' : 'Not starred'}</span>
      {onToggleStar && (
        <button onClick={onToggleStar}>{repository.is_starred ? 'Unstar' : 'Star'}</button>
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
  is_starred: false,
  ...overrides,
});

const defaultProps = {
  repositories: [],
  onStar: vi.fn(),
  onUnstar: vi.fn(),
  searchQuery: '',
  onSearchChange: vi.fn(),
  onSearchSubmit: vi.fn(),
  filterBy: 'all' as const,
  onFilterChange: vi.fn(),
  onPrepaginatedPageChange: vi.fn(),
  dataIsPrepaginated: false,
};

describe('RepositoryList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading state', () => {
    it('displays loading spinner when isLoading is true', () => {
      render(<RepositoryList {...defaultProps} isLoading={true} />);
      const spinner = screen.getByRole('status', { hidden: true });
      expect(spinner).toHaveClass('animate-spin');
    });
  });

  describe('Error state', () => {
    it('displays error message when error is provided', () => {
      const error = new Error('Failed to fetch repositories');
      render(<RepositoryList {...defaultProps} error={error} />);

      expect(screen.getByText(/error loading repositories/i)).toBeInTheDocument();
      expect(screen.getByText(error.message)).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('displays empty state when no repositories are provided', () => {
      render(<RepositoryList {...defaultProps} />);

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

      render(<RepositoryList {...defaultProps} repositories={repos} />);

      expect(screen.getByTestId('repo-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('repo-card-2')).toBeInTheDocument();
      expect(screen.getByTestId('repo-card-3')).toBeInTheDocument();
    });

    it('passes follow state correctly to repo cards', () => {
      const repos = [
        createMockRepository({ id: 1, name: 'repo-1', is_starred: true }),
        createMockRepository({ id: 2, name: 'repo-2', is_starred: false }),
      ];

      render(<RepositoryList {...defaultProps} repositories={repos} />);

      const card1 = screen.getByTestId('repo-card-1');
      const card2 = screen.getByTestId('repo-card-2');

      expect(card1).toHaveTextContent('Starred');
      expect(card2).toHaveTextContent('Not starred');
    });

    it('calls onStar when star button is clicked', () => {
      const onStar = vi.fn();
      const onUnstar = vi.fn();
      const repos = [createMockRepository({ id: 1, name: 'repo-1' })];

      render(
        <RepositoryList
          {...defaultProps}
          repositories={repos}
          onStar={onStar}
          onUnstar={onUnstar}
        />
      );

      const starButton = screen.getByRole('button', { name: /star/i });
      fireEvent.click(starButton);

      expect(onStar).toHaveBeenCalledWith(1);
    });

    it('calls onUnstar when unstar button is clicked', () => {
      const onStar = vi.fn();
      const onUnstar = vi.fn();
      const repos = [createMockRepository({ id: 1, name: 'repo-1', is_starred: true })];

      render(
        <RepositoryList
          {...defaultProps}
          repositories={repos}
          onStar={onStar}
          onUnstar={onUnstar}
        />
      );

      const unstarButton = screen.getByRole('button', { name: /unstar/i });
      fireEvent.click(unstarButton);

      expect(onUnstar).toHaveBeenCalledWith(1);
    });
  });

  describe('Search functionality', () => {
    it('uses external search when provided', () => {
      const mockOnSearchChange = vi.fn();
      const repos = [createMockRepository({ id: 1, name: 'test-repo' })];
      render(
        <RepositoryList
          {...defaultProps}
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
          {...defaultProps}
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
      render(<RepositoryList {...defaultProps} repositories={repos} />);

      const searchInput = screen.getByPlaceholderText(/search repositories/i);
      expect(searchInput).toHaveAttribute(
        'placeholder',
        'Search repositories... (use "quotes" for exact name match)'
      );
    });

    it('calls onSearchChange when search input changes', () => {
      const mockOnSearchChange = vi.fn();
      const repos = [
        createMockRepository({ id: 1, name: 'react-app', topics: [] }),
        createMockRepository({ id: 2, name: 'vue-app', topics: [] }),
        createMockRepository({ id: 3, name: 'angular-app', topics: [] }),
      ];

      render(
        <RepositoryList
          {...defaultProps}
          repositories={repos}
          onSearchChange={mockOnSearchChange}
        />
      );

      const searchInput = screen.getByLabelText(/search repositories/i);
      fireEvent.change(searchInput, { target: { value: 'react' } });

      expect(mockOnSearchChange).toHaveBeenCalledWith('react');
      // All repositories should still be visible since filtering is done by Dashboard
      expect(screen.getByTestId('repo-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('repo-card-2')).toBeInTheDocument();
      expect(screen.getByTestId('repo-card-3')).toBeInTheDocument();
    });

    it('displays pre-filtered repositories without client-side filtering', () => {
      // Simulate Dashboard passing already filtered repositories
      const filteredRepos = [
        createMockRepository({ id: 2, name: 'repo-2', description: 'Vue framework' }),
      ];

      render(<RepositoryList {...defaultProps} repositories={filteredRepos} searchQuery="vue" />);

      // Only the pre-filtered repository should be displayed
      expect(screen.queryByTestId('repo-card-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('repo-card-2')).toBeInTheDocument();
    });

    it('displays all repositories when no external search is provided', () => {
      const repos = [
        createMockRepository({ id: 1, language: 'Python' }),
        createMockRepository({ id: 2, language: 'JavaScript' }),
      ];

      render(<RepositoryList {...defaultProps} repositories={repos} />);

      const searchInput = screen.getByLabelText(/search repositories/i);
      fireEvent.change(searchInput, { target: { value: 'python' } });

      // Both repositories should be visible since no filtering is done locally
      expect(screen.getByTestId('repo-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('repo-card-2')).toBeInTheDocument();
    });

    it('uses external search value when provided', () => {
      const repos = [
        createMockRepository({ id: 1, topics: ['react', 'frontend'] }),
        createMockRepository({ id: 2, topics: ['backend', 'api'] }),
      ];

      render(<RepositoryList {...defaultProps} repositories={repos} searchQuery="backend" />);

      const searchInput = screen.getByLabelText(/search repositories/i);
      expect(searchInput).toHaveValue('backend');

      // Both repositories should be visible since filtering is done externally
      expect(screen.getByTestId('repo-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('repo-card-2')).toBeInTheDocument();
    });

    it('shows no results message when no repositories are provided', () => {
      // Dashboard would pass empty array when no results found
      const repos: Repository[] = [];

      render(<RepositoryList {...defaultProps} repositories={repos} searchQuery="nonexistent" />);

      // When no repositories at all, shows basic empty state
      expect(screen.getByText(/no repositories found/i)).toBeInTheDocument();
    });

    it('displays repositories when provided even with search query', () => {
      const mockOnSearchChange = vi.fn();
      const mockOnFilterChange = vi.fn();
      // In the new architecture, repositories are pre-filtered by Dashboard
      const repos = [createMockRepository({ id: 1, name: 'test-repo' })];

      render(
        <RepositoryList
          {...defaultProps}
          repositories={repos}
          searchQuery="test"
          filterBy="starred"
          onSearchChange={mockOnSearchChange}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Since filtering is done by Dashboard, repositories should always be displayed
      expect(screen.getByTestId('repo-card-1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test')).toBeInTheDocument();

      // Check that the filter shows the correct value
      const filterSelect = screen.getByLabelText(/filter repositories/i);
      expect(filterSelect).toHaveValue('starred');
    });
  });

  describe('Filter functionality', () => {
    it('calls onFilterChange when filter is changed', () => {
      const mockOnFilterChange = vi.fn();
      const repos = [
        createMockRepository({ id: 1, is_starred: true }),
        createMockRepository({ id: 2, is_starred: false }),
      ];

      render(
        <RepositoryList
          {...defaultProps}
          repositories={repos}
          onFilterChange={mockOnFilterChange}
        />
      );

      const filterSelect = screen.getByLabelText(/filter repositories/i);
      fireEvent.change(filterSelect, { target: { value: 'starred' } });

      expect(mockOnFilterChange).toHaveBeenCalledWith('starred');
      // Both repositories should still be visible since filtering is done by Dashboard
      expect(screen.getByTestId('repo-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('repo-card-2')).toBeInTheDocument();
    });

    it('shows all repositories when filter is set to all', () => {
      const repos = [createMockRepository({ id: 1 }), createMockRepository({ id: 2 })];

      render(<RepositoryList {...defaultProps} repositories={repos} />);

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

      render(<RepositoryList {...defaultProps} repositories={repos} />);

      const sortSelect = screen.getByLabelText(/sort repositories/i);
      fireEvent.change(sortSelect, { target: { value: 'stars-desc' } });

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

      render(<RepositoryList {...defaultProps} repositories={repos} />);

      const sortSelect = screen.getByLabelText(/sort repositories/i);
      fireEvent.change(sortSelect, { target: { value: 'name-asc' } });

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

      render(<RepositoryList {...defaultProps} repositories={repos} />);

      const sortSelect = screen.getByLabelText(/sort repositories/i);
      fireEvent.change(sortSelect, { target: { value: 'issues-desc' } });

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

      render(<RepositoryList {...defaultProps} repositories={repos} />);

      const sortSelect = screen.getByLabelText(/sort repositories/i);
      fireEvent.change(sortSelect, { target: { value: 'activity-desc' } });

      const cards = screen.getAllByTestId(/repo-card-/);
      expect(cards[0]).toHaveAttribute('data-testid', 'repo-card-2');
      expect(cards[1]).toHaveAttribute('data-testid', 'repo-card-3');
      expect(cards[2]).toHaveAttribute('data-testid', 'repo-card-1');
    });
  });

  describe('Pagination (RepositoryList slices repositories array internally)', () => {
    it('displays correct number of items per page', () => {
      const repos = Array.from({ length: 15 }, (_, i) =>
        createMockRepository({ id: i + 1, name: `repo-${i + 1}` })
      );

      render(<RepositoryList {...defaultProps} repositories={repos} itemsPerPage={5} />);

      const cards = screen.getAllByTestId(/repo-card-/);
      expect(cards).toHaveLength(5);
    });

    it('shows pagination controls when there are multiple pages', () => {
      const repos = Array.from({ length: 15 }, (_, i) =>
        createMockRepository({ id: i + 1, name: `repo-${i + 1}` })
      );

      render(<RepositoryList {...defaultProps} repositories={repos} itemsPerPage={5} />);

      // Check for page number buttons instead of text
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
    });

    it('navigates to next page', () => {
      const repos = Array.from({ length: 10 }, (_, i) =>
        createMockRepository({ id: i + 1, name: `repo-${i + 1}` })
      );

      render(<RepositoryList {...defaultProps} repositories={repos} itemsPerPage={5} />);

      // Should show repo-1 to repo-5 on page 1
      expect(screen.getByTestId('repo-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('repo-card-5')).toBeInTheDocument();
      expect(screen.queryByTestId('repo-card-6')).not.toBeInTheDocument();

      // Find and click the Next button (use the page number approach instead)
      const page2Button = screen.getByRole('button', { name: '2' });
      fireEvent.click(page2Button);

      // Should now show repo-6 to repo-10 on page 2
      expect(screen.getByTestId('repo-card-6')).toBeInTheDocument();
      expect(screen.getByTestId('repo-card-10')).toBeInTheDocument();
      expect(screen.queryByTestId('repo-card-1')).not.toBeInTheDocument();
    });

    it('navigates to previous page', () => {
      const repos = Array.from({ length: 10 }, (_, i) =>
        createMockRepository({ id: i + 1, name: `repo-${i + 1}` })
      );

      render(<RepositoryList {...defaultProps} repositories={repos} itemsPerPage={5} />);

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

      render(<RepositoryList {...defaultProps} repositories={repos} itemsPerPage={5} />);

      const page3Button = screen.getByRole('button', { name: '3' });
      fireEvent.click(page3Button);

      expect(screen.getByTestId('repo-card-11')).toBeInTheDocument();
      expect(screen.queryByTestId('repo-card-1')).not.toBeInTheDocument();
    });

    it('disables previous button on first page', () => {
      const repos = Array.from({ length: 10 }, (_, i) =>
        createMockRepository({ id: i + 1, name: `repo-${i + 1}` })
      );

      render(<RepositoryList {...defaultProps} repositories={repos} itemsPerPage={5} />);

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

      render(<RepositoryList {...defaultProps} repositories={repos} itemsPerPage={5} />);

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

      render(<RepositoryList {...defaultProps} repositories={repos} itemsPerPage={5} />);

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

  describe('Pagination (Dashboard provides pre-paginated data)', () => {
    it('uses totalSearchPages for pagination instead of calculating from array length', () => {
      const repos = Array.from({ length: 5 }, (_, i) =>
        createMockRepository({ id: i + 1, name: `repo-${i + 1}` })
      );

      render(
        <RepositoryList
          {...defaultProps}
          repositories={repos}
          dataIsPrepaginated={true}
          totalPages={10}
          currentPage={1}
        />
      );

      // Should show page 10 button (from totalPages), not just 1 page
      expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument();
    });

    it('calls onPrepaginatedPageChange when navigating to a specific page', () => {
      const mockOnPrepaginatedPageChange = vi.fn();
      const repos = Array.from({ length: 5 }, (_, i) =>
        createMockRepository({ id: i + 1, name: `repo-${i + 1}` })
      );

      render(
        <RepositoryList
          {...defaultProps}
          repositories={repos}
          dataIsPrepaginated={true}
          totalPages={3}
          currentPage={1}
          onPrepaginatedPageChange={mockOnPrepaginatedPageChange}
        />
      );

      const page2Button = screen.getByRole('button', { name: '2' });
      fireEvent.click(page2Button);

      expect(mockOnPrepaginatedPageChange).toHaveBeenCalledWith(2);
    });

    it('calls onPrepaginatedPageChange when clicking next button', () => {
      const mockOnPrepaginatedPageChange = vi.fn();
      const repos = Array.from({ length: 5 }, (_, i) =>
        createMockRepository({ id: i + 1, name: `repo-${i + 1}` })
      );

      render(
        <RepositoryList
          {...defaultProps}
          repositories={repos}
          dataIsPrepaginated={true}
          totalPages={3}
          currentPage={1}
          hasMoreResults={true}
          onPrepaginatedPageChange={mockOnPrepaginatedPageChange}
        />
      );

      // Find the desktop next button (the one with sr-only "Next" text)
      const nextButtons = screen.getAllByRole('button').filter((btn) => {
        const srOnly = btn.querySelector('.sr-only');
        return srOnly?.textContent === 'Next';
      });
      fireEvent.click(nextButtons[0]);

      expect(mockOnPrepaginatedPageChange).toHaveBeenCalledWith(2);
    });

    it('calls onPrepaginatedPageChange when clicking previous button', () => {
      const mockOnPrepaginatedPageChange = vi.fn();
      const repos = Array.from({ length: 5 }, (_, i) =>
        createMockRepository({ id: i + 1, name: `repo-${i + 1}` })
      );

      render(
        <RepositoryList
          {...defaultProps}
          repositories={repos}
          dataIsPrepaginated={true}
          totalPages={3}
          currentPage={2}
          onPrepaginatedPageChange={mockOnPrepaginatedPageChange}
        />
      );

      // Find the desktop previous button
      const prevButtons = screen.getAllByRole('button').filter((btn) => {
        const srOnly = btn.querySelector('.sr-only');
        return srOnly?.textContent === 'Previous';
      });
      fireEvent.click(prevButtons[0]);

      expect(mockOnPrepaginatedPageChange).toHaveBeenCalledWith(1);
    });

    it('displays all provided repositories without slicing', () => {
      // With dataIsPrepaginated, all repos should display (Dashboard already sliced)
      const repos = Array.from({ length: 30 }, (_, i) =>
        createMockRepository({ id: i + 1, name: `repo-${i + 1}` })
      );

      render(
        <RepositoryList
          {...defaultProps}
          repositories={repos}
          dataIsPrepaginated={true}
          totalPages={5}
          currentPage={1}
          itemsPerPage={10}
        />
      );

      // All 30 should be visible, not just 10
      expect(screen.getAllByTestId(/repo-card-/)).toHaveLength(30);
    });

    it('highlights current page from currentPage prop', () => {
      const repos = Array.from({ length: 5 }, (_, i) =>
        createMockRepository({ id: i + 1, name: `repo-${i + 1}` })
      );

      render(
        <RepositoryList
          {...defaultProps}
          repositories={repos}
          dataIsPrepaginated={true}
          totalPages={5}
          currentPage={3}
        />
      );

      const page3Button = screen.getByRole('button', { name: '3' });
      expect(page3Button).toHaveClass('bg-indigo-600');
    });

    it('disables next button when hasMoreResults is false and on last page', () => {
      const repos = Array.from({ length: 5 }, (_, i) =>
        createMockRepository({ id: i + 1, name: `repo-${i + 1}` })
      );

      render(
        <RepositoryList
          {...defaultProps}
          repositories={repos}
          dataIsPrepaginated={true}
          totalPages={3}
          currentPage={3}
          hasMoreResults={false}
        />
      );

      const nextButtons = screen.getAllByRole('button').filter((btn) => {
        const srOnly = btn.querySelector('.sr-only');
        return srOnly?.textContent === 'Next';
      });

      nextButtons.forEach((btn) => {
        expect(btn).toBeDisabled();
      });
    });

    it('enables next button when hasMoreResults is true even on calculated last page', () => {
      const repos = Array.from({ length: 5 }, (_, i) =>
        createMockRepository({ id: i + 1, name: `repo-${i + 1}` })
      );

      render(
        <RepositoryList
          {...defaultProps}
          repositories={repos}
          dataIsPrepaginated={true}
          totalPages={3}
          currentPage={3}
          hasMoreResults={true}
        />
      );

      const nextButtons = screen.getAllByRole('button').filter((btn) => {
        const srOnly = btn.querySelector('.sr-only');
        return srOnly?.textContent === 'Next';
      });

      nextButtons.forEach((btn) => {
        expect(btn).not.toBeDisabled();
      });
    });

    it('calculates totalPages from apiSearchResultTotal when totalPages is 0', () => {
      const repos = Array.from({ length: 5 }, (_, i) =>
        createMockRepository({ id: i + 1, name: `repo-${i + 1}` })
      );

      render(
        <RepositoryList
          {...defaultProps}
          repositories={repos}
          dataIsPrepaginated={true}
          totalPages={0}
          apiSearchResultTotal={50}
          itemsPerPage={10}
          currentPage={1}
        />
      );

      // Should calculate 5 pages from 50 results / 10 per page
      expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument();
    });
  });

  describe('Combined functionality', () => {
    it('calls appropriate handlers when both search and filter are changed', () => {
      const mockOnSearchChange = vi.fn();
      const mockOnFilterChange = vi.fn();
      // Simulate Dashboard passing pre-filtered repositories (only starred react repos)
      const filteredRepos = [
        createMockRepository({
          id: 1,
          name: 'react-app',
          is_starred: true,
          topics: ['react', 'frontend'],
        }),
      ];

      render(
        <RepositoryList
          {...defaultProps}
          repositories={filteredRepos}
          searchQuery="react"
          filterBy="starred"
          onSearchChange={mockOnSearchChange}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Apply search
      const searchInput = screen.getByLabelText(/search repositories/i);
      fireEvent.change(searchInput, { target: { value: 'vue' } });
      expect(mockOnSearchChange).toHaveBeenCalledWith('vue');

      // Apply filter
      const filterSelect = screen.getByLabelText(/filter repositories/i);
      fireEvent.change(filterSelect, { target: { value: 'all' } });
      expect(mockOnFilterChange).toHaveBeenCalledWith('all');

      // Should show the pre-filtered repository
      expect(screen.getByTestId('repo-card-1')).toBeInTheDocument();
    });

    it('maintains sort order after filtering', () => {
      const repos = [
        createMockRepository({
          id: 1,
          stargazers_count: 50,
          is_starred: true,
        }),
        createMockRepository({
          id: 2,
          stargazers_count: 200,
          is_starred: true,
        }),
        createMockRepository({
          id: 3,
          stargazers_count: 100,
          is_starred: true,
        }),
      ];

      render(<RepositoryList {...defaultProps} repositories={repos} />);

      // Apply sort
      const sortSelect = screen.getByLabelText(/sort repositories/i);
      fireEvent.change(sortSelect, { target: { value: 'stars-desc' } });

      // Apply filter
      const filterSelect = screen.getByLabelText(/filter repositories/i);
      fireEvent.change(filterSelect, { target: { value: 'starred' } });

      // All should be visible in star order
      const cards = screen.getAllByTestId(/repo-card-/);
      expect(cards[0]).toHaveAttribute('data-testid', 'repo-card-2');
      expect(cards[1]).toHaveAttribute('data-testid', 'repo-card-3');
      expect(cards[2]).toHaveAttribute('data-testid', 'repo-card-1');
    });
  });
});
