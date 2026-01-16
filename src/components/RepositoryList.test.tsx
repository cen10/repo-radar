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

// Mock the intersection observer hook
vi.mock('../hooks/useIntersectionObserver', () => ({
  useIntersectionObserver: () => ({
    ref: vi.fn(),
    isIntersecting: false,
  }),
}));

interface MockRepoCardProps {
  repository: Repository & { is_following?: boolean };
}

// Mock RepoCard component
vi.mock('./RepoCard', () => ({
  RepoCard: ({ repository }: MockRepoCardProps) => (
    <div data-testid={`repo-card-${repository.id}`}>
      <h3>{repository.name}</h3>
      <p>{repository.description}</p>
      <span>{repository.stargazers_count} stars</span>
      <span>{repository.open_issues_count} issues</span>
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
  isLoading: false,
  isFetchingMore: false,
  hasMore: false,
  error: null,
  searchQuery: '',
  onSearchChange: vi.fn(),
  onSearchSubmit: vi.fn(),
  isSearching: false,
  hasActiveSearch: false,
  viewMode: 'starred' as const,
  onViewChange: vi.fn(),
  sortBy: 'updated' as const,
  onSortChange: vi.fn(),
  onLoadMore: vi.fn(),
};

describe('RepositoryList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading state', () => {
    it('displays loading spinner when isLoading is true', () => {
      render(<RepositoryList {...defaultProps} isLoading={true} />);
      const loadingContainer = screen.getByRole('status');
      expect(loadingContainer).toBeInTheDocument();
      expect(loadingContainer).toHaveTextContent(/loading/i);
    });

    it('does not show loading spinner when there are already repositories', () => {
      // changing sort, infinite scroll, etc
      const repos = [createMockRepository({ id: 1, name: 'repo-1' })];
      render(<RepositoryList {...defaultProps} repositories={repos} isLoading={true} />);

      // Should show repos, not spinner
      expect(screen.getByTestId('repo-card-1')).toBeInTheDocument();
      expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
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

      // Text appears in both visible UI and aria-live region for screen readers
      expect(screen.getAllByText(/no repositories found/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/star some repositories/i).length).toBeGreaterThan(0);
    });

    it('shows clear search button when search returns no results', () => {
      render(<RepositoryList {...defaultProps} repositories={[]} hasActiveSearch={true} />);

      expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument();
    });

    it('clears both search input and active search when clear search button is clicked', () => {
      const mockOnSearchChange = vi.fn();
      const mockOnSearchSubmit = vi.fn();

      render(
        <RepositoryList
          {...defaultProps}
          searchQuery="test query"
          hasActiveSearch={true}
          onSearchChange={mockOnSearchChange}
          onSearchSubmit={mockOnSearchSubmit}
        />
      );

      const clearButton = screen.getByRole('button', { name: /clear search/i });
      fireEvent.click(clearButton);

      // Should call both handlers to clear input value and trigger search reset
      expect(mockOnSearchChange).toHaveBeenCalledWith('');
      expect(mockOnSearchSubmit).toHaveBeenCalledWith('');
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
  });

  describe('Search functionality', () => {
    it('shows search input with correct value', () => {
      const repos = [createMockRepository({ id: 1, name: 'test-repo' })];
      render(<RepositoryList {...defaultProps} repositories={repos} searchQuery="test" />);

      const searchInput = screen.getByPlaceholderText(/search your stars/i);
      expect(searchInput).toHaveValue('test');
    });

    it('calls onSearchChange when search input changes', () => {
      const mockOnSearchChange = vi.fn();
      const repos = [createMockRepository({ id: 1, name: 'test-repo' })];
      render(
        <RepositoryList
          {...defaultProps}
          repositories={repos}
          onSearchChange={mockOnSearchChange}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search your stars/i);
      fireEvent.change(searchInput, { target: { value: 'new search' } });

      expect(mockOnSearchChange).toHaveBeenCalledWith('new search');
    });

    it('calls onSearchSubmit when form is submitted', () => {
      const mockOnSearchSubmit = vi.fn();
      const repos = [createMockRepository({ id: 1, name: 'test-repo' })];
      render(
        <RepositoryList
          {...defaultProps}
          repositories={repos}
          searchQuery="test"
          onSearchSubmit={mockOnSearchSubmit}
        />
      );

      // Click the search button to submit the form
      const searchButton = screen.getByRole('button', { name: /search/i });
      fireEvent.click(searchButton);

      expect(mockOnSearchSubmit).toHaveBeenCalledWith('test');
    });

    it('shows searching indicator when isSearching is true and no repos', () => {
      render(<RepositoryList {...defaultProps} repositories={[]} isSearching={true} />);

      expect(screen.getByText('Searching GitHub...')).toBeInTheDocument();
    });

    it('shows different search placeholders based on active tab', () => {
      const repos = [createMockRepository({ id: 1, name: 'test-repo' })];

      // Starred tab shows "Search your stars..."
      const { rerender } = render(
        <RepositoryList {...defaultProps} repositories={repos} viewMode="starred" />
      );
      expect(screen.getByPlaceholderText('Search your stars...')).toBeInTheDocument();

      // All tab shows "Search all GitHub repositories..."
      rerender(<RepositoryList {...defaultProps} repositories={repos} viewMode="all" />);
      expect(screen.getByPlaceholderText('Search all GitHub repositories...')).toBeInTheDocument();
    });
  });

  describe('Tab navigation', () => {
    it('calls onViewChange when tab is clicked', () => {
      const mockOnViewChange = vi.fn();
      const repos = [createMockRepository({ id: 1 })];

      render(
        <RepositoryList {...defaultProps} repositories={repos} onViewChange={mockOnViewChange} />
      );

      // Click "Explore All" tab
      const allTab = screen.getByRole('button', { name: /explore all/i });
      fireEvent.click(allTab);

      expect(mockOnViewChange).toHaveBeenCalledWith('all');
    });

    it('shows correct active tab', () => {
      const repos = [createMockRepository({ id: 1 })];

      // Starred tab is active by default
      const { rerender } = render(
        <RepositoryList {...defaultProps} repositories={repos} viewMode="starred" />
      );
      expect(screen.getByRole('button', { name: /my stars/i })).toHaveAttribute(
        'aria-current',
        'page'
      );

      // All tab is active
      rerender(<RepositoryList {...defaultProps} repositories={repos} viewMode="all" />);
      expect(screen.getByRole('button', { name: /explore all/i })).toHaveAttribute(
        'aria-current',
        'page'
      );
    });
  });

  describe('Sort functionality', () => {
    it('calls onSortChange when sort is changed', () => {
      const mockOnSortChange = vi.fn();
      const repos = [createMockRepository({ id: 1 })];

      render(
        <RepositoryList {...defaultProps} repositories={repos} onSortChange={mockOnSortChange} />
      );

      const sortSelect = screen.getByLabelText(/sort repositories/i);
      fireEvent.change(sortSelect, { target: { value: 'stars' } });

      expect(mockOnSortChange).toHaveBeenCalledWith('stars');
    });

    it('shows correct sort options', () => {
      const repos = [createMockRepository({ id: 1 })];

      render(<RepositoryList {...defaultProps} repositories={repos} />);

      const sortSelect = screen.getByLabelText(/sort repositories/i);
      expect(sortSelect).toContainElement(screen.getByText('Recently Updated'));
      expect(sortSelect).toContainElement(screen.getByText('Recently Starred'));
      expect(sortSelect).toContainElement(screen.getByText('Most Stars'));
    });

    it('shows correct sort value', () => {
      const repos = [createMockRepository({ id: 1 })];

      render(<RepositoryList {...defaultProps} repositories={repos} sortBy="stars" />);

      const sortSelect = screen.getByLabelText(/sort repositories/i);
      expect(sortSelect).toHaveValue('stars');
    });
  });

  describe('Infinite scroll', () => {
    it('shows loading indicator when fetching more', () => {
      const repos = [createMockRepository({ id: 1 })];

      render(<RepositoryList {...defaultProps} repositories={repos} isFetchingMore={true} />);

      expect(screen.getByText(/loading more repositories/i)).toBeInTheDocument();
    });

    it('renders infinite scroll trigger when hasMore is true', () => {
      const repos = [createMockRepository({ id: 1 })];

      render(<RepositoryList {...defaultProps} repositories={repos} hasMore={true} />);

      expect(screen.getByTestId('load-more-sentinel')).toBeInTheDocument();
    });

    it('does not render infinite scroll trigger when hasMore is false', () => {
      const repos = [createMockRepository({ id: 1 })];

      render(<RepositoryList {...defaultProps} repositories={repos} hasMore={false} />);

      expect(screen.queryByTestId('load-more-sentinel')).not.toBeInTheDocument();
    });

    it('shows end of results message when all repos loaded', () => {
      const repos = [createMockRepository({ id: 1 }), createMockRepository({ id: 2 })];

      render(<RepositoryList {...defaultProps} repositories={repos} hasMore={false} />);

      expect(screen.getByText('2 repositories')).toBeInTheDocument();
    });

    it('shows singular form for single repository', () => {
      const repos = [createMockRepository({ id: 1 })];

      render(<RepositoryList {...defaultProps} repositories={repos} hasMore={false} />);

      expect(screen.getByText('1 repository')).toBeInTheDocument();
    });
  });

  describe('Combined functionality', () => {
    it('calls appropriate handlers when both search and tab are changed', () => {
      const mockOnSearchChange = vi.fn();
      const mockOnViewChange = vi.fn();
      const repos = [createMockRepository({ id: 1, name: 'react-app' })];

      render(
        <RepositoryList
          {...defaultProps}
          repositories={repos}
          searchQuery="react"
          viewMode="starred"
          onSearchChange={mockOnSearchChange}
          onViewChange={mockOnViewChange}
        />
      );

      // Change search
      const searchInput = screen.getByLabelText(/search your starred repositories/i);
      fireEvent.change(searchInput, { target: { value: 'vue' } });
      expect(mockOnSearchChange).toHaveBeenCalledWith('vue');

      // Change tab
      const allTab = screen.getByRole('button', { name: /explore all/i });
      fireEvent.click(allTab);
      expect(mockOnViewChange).toHaveBeenCalledWith('all');

      // Repository should still be displayed
      expect(screen.getByTestId('repo-card-1')).toBeInTheDocument();
    });
  });
});
