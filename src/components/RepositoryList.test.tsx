import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import RepositoryList from './RepositoryList';
import type { Repository } from '../types';

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

const defaultSortOptions = [
  { value: 'updated' as const, label: 'Recently Updated' },
  { value: 'created' as const, label: 'Recently Starred' },
];

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
  sortBy: 'updated' as const,
  onSortChange: vi.fn(),
  onLoadMore: vi.fn(),
  title: 'My Stars',
  titleIcon: <span data-testid="title-icon">★</span>,
  searchPlaceholder: 'Search your starred repositories...',
  sortOptions: defaultSortOptions,
  emptyMessage: 'No repositories found',
  emptyHint: 'Star some repositories on GitHub to see them here',
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

    it('displays the provided title', () => {
      const repos = [createMockRepository({ id: 1 })];
      render(<RepositoryList {...defaultProps} repositories={repos} title="Custom Title" />);

      expect(screen.getByRole('heading', { name: /custom title/i })).toBeInTheDocument();
    });
  });

  describe('Search functionality', () => {
    it('shows search input with correct value', () => {
      const repos = [createMockRepository({ id: 1, name: 'test-repo' })];
      render(<RepositoryList {...defaultProps} repositories={repos} searchQuery="test" />);

      const searchInput = screen.getByPlaceholderText(/search your starred/i);
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

      const searchInput = screen.getByPlaceholderText(/search your starred/i);
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

      expect(screen.getByText('Searching...')).toBeInTheDocument();
    });

    it('uses custom search placeholder', () => {
      const repos = [createMockRepository({ id: 1, name: 'test-repo' })];
      render(
        <RepositoryList
          {...defaultProps}
          repositories={repos}
          searchPlaceholder="Custom placeholder..."
        />
      );

      expect(screen.getByPlaceholderText('Custom placeholder...')).toBeInTheDocument();
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
      fireEvent.change(sortSelect, { target: { value: 'created' } });

      expect(mockOnSortChange).toHaveBeenCalledWith('created');
    });

    it('shows correct sort options from props', () => {
      const repos = [createMockRepository({ id: 1 })];

      render(<RepositoryList {...defaultProps} repositories={repos} />);

      const sortSelect = screen.getByLabelText(/sort repositories/i);
      expect(sortSelect).toContainElement(screen.getByText('Recently Updated'));
      expect(sortSelect).toContainElement(screen.getByText('Recently Starred'));
    });

    it('shows correct sort value', () => {
      const repos = [createMockRepository({ id: 1 })];

      render(<RepositoryList {...defaultProps} repositories={repos} sortBy="created" />);

      const sortSelect = screen.getByLabelText(/sort repositories/i);
      expect(sortSelect).toHaveValue('created');
    });

    it('renders custom sort options', () => {
      const repos = [createMockRepository({ id: 1 })];
      const customSortOptions = [
        { value: 'best-match' as const, label: 'Best Match' },
        { value: 'stars' as const, label: 'Most Stars' },
      ];

      render(
        <RepositoryList
          {...defaultProps}
          repositories={repos}
          sortOptions={customSortOptions}
          sortBy="best-match"
        />
      );

      const sortSelect = screen.getByLabelText(/sort repositories/i);
      expect(sortSelect).toContainElement(screen.getByText('Best Match'));
      expect(sortSelect).toContainElement(screen.getByText('Most Stars'));
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

  describe('Empty state customization', () => {
    it('shows custom empty state message', () => {
      render(
        <RepositoryList
          {...defaultProps}
          emptyMessage="Custom empty message"
          emptyHint="Custom hint"
        />
      );

      expect(screen.getAllByText(/custom empty message/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/custom hint/i).length).toBeGreaterThan(0);
    });
  });
});
