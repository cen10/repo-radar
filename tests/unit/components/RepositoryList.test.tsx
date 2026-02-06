import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import RepositoryList from '@/components/RepositoryList';
import type { Repository } from '@/types';
import { createMockRepository } from '../../mocks/factories';

// Mock the intersection observer hook
vi.mock('@/hooks/useIntersectionObserver', () => ({
  useIntersectionObserver: () => ({
    ref: vi.fn(),
    isIntersecting: false,
  }),
}));

interface MockRepoCardProps {
  repository: Repository & { is_following?: boolean };
}

// Mock RepoCard component
vi.mock('@/components/RepoCard', () => ({
  RepoCard: ({ repository }: MockRepoCardProps) => (
    <div data-testid={`repo-card-${repository.id}`}>
      <h3>{repository.name}</h3>
      <p>{repository.description}</p>
      <span>{repository.stargazers_count} stars</span>
      <span>{repository.open_issues_count} issues</span>
    </div>
  ),
}));

const defaultSortOptions = [
  { value: 'updated' as const, label: 'Recently Updated' },
  { value: 'created' as const, label: 'Recently Starred' },
];

const MockEmptyState = () => <div data-testid="custom-empty-state">No starred repos yet</div>;

const defaultProps = {
  repositories: [] as Repository[],
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
  emptyState: <MockEmptyState />,
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
    it('displays custom empty state when no repositories and not searching', () => {
      render(<RepositoryList {...defaultProps} />);

      expect(screen.getByTestId('custom-empty-state')).toBeInTheDocument();
    });

    it('shows NoSearchResultsState when search returns no results', () => {
      render(<RepositoryList {...defaultProps} repositories={[]} hasActiveSearch={true} />);

      expect(screen.getByText(/no repos found/i)).toBeInTheDocument();
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
    it('calls onSortChange when sort is changed', async () => {
      const user = userEvent.setup();
      const mockOnSortChange = vi.fn();
      const repos = [createMockRepository({ id: 1 })];

      render(
        <RepositoryList {...defaultProps} repositories={repos} onSortChange={mockOnSortChange} />
      );

      // Click the sort dropdown button to open options
      await user.click(screen.getByRole('button', { name: /sort repositories/i }));
      // Click the "Recently Starred" option
      await user.click(screen.getByRole('option', { name: /recently starred/i }));

      expect(mockOnSortChange).toHaveBeenCalledWith('created');
    });

    it('shows correct sort options from props', async () => {
      const user = userEvent.setup();
      const repos = [createMockRepository({ id: 1 })];

      render(<RepositoryList {...defaultProps} repositories={repos} />);

      // Click button to open options
      await user.click(screen.getByRole('button', { name: /sort repositories/i }));

      expect(screen.getByRole('option', { name: /recently updated/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /recently starred/i })).toBeInTheDocument();
    });

    it('shows correct sort value', () => {
      const repos = [createMockRepository({ id: 1 })];

      render(<RepositoryList {...defaultProps} repositories={repos} sortBy="created" />);

      // Button displays the selected value as text content
      const sortButton = screen.getByRole('button', { name: /sort repositories/i });
      expect(sortButton).toHaveTextContent(/recently starred/i);
    });

    it('renders custom sort options', async () => {
      const user = userEvent.setup();
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

      // Click button to open options
      await user.click(screen.getByRole('button', { name: /sort repositories/i }));

      expect(screen.getByRole('option', { name: /best match/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /most stars/i })).toBeInTheDocument();
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

  describe('Pre-search state', () => {
    it('shows pre-search state when repositories is null', () => {
      render(<RepositoryList {...defaultProps} repositories={null} />);

      expect(screen.getByText(/discover repositories/i)).toBeInTheDocument();
    });

    it('shows custom pre-search message when provided', () => {
      render(
        <RepositoryList
          {...defaultProps}
          repositories={null}
          preSearchMessage="Search to begin"
          preSearchHint="Find something interesting"
        />
      );

      expect(screen.getByText(/search to begin/i)).toBeInTheDocument();
      expect(screen.getByText(/find something interesting/i)).toBeInTheDocument();
    });
  });
});
