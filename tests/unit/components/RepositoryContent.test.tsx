import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { RepositoryContent } from '@/components/RepositoryContent';
import { createMockRepository } from '../../mocks/factories';

// Mock the intersection observer hook
vi.mock('@/hooks/useIntersectionObserver', () => ({
  useIntersectionObserver: () => ({
    ref: vi.fn(),
    isIntersecting: false,
  }),
}));

// Mock RepoCard component
vi.mock('@/components/RepoCard', () => ({
  RepoCard: ({ repository }: { repository: { id: number; name: string } }) => (
    <div data-testid={`repo-card-${repository.id}`}>
      <h3>{repository.name}</h3>
    </div>
  ),
}));

// Mock demo mode hook used by NoSearchResultsState
vi.mock('@/demo/use-demo-mode', () => ({
  useDemoMode: () => ({ isDemoMode: false }),
}));

const defaultProps = {
  repositories: [],
  isLoading: false,
  error: null,
  hasActiveSearch: false,
  onClearSearch: vi.fn(),
  sortBy: 'updated',
};

describe('RepositoryContent', () => {
  describe('Loading state', () => {
    it('shows loading spinner during initial load', () => {
      render(<RepositoryContent {...defaultProps} isLoading={true} />);

      const loadingContainer = screen.getByRole('status');
      expect(loadingContainer).toBeInTheDocument();
      expect(loadingContainer).toHaveTextContent(/loading/i);
    });

    it('does not show loading spinner when already have repositories', () => {
      const repos = [createMockRepository({ id: 1, name: 'repo-1' })];
      render(<RepositoryContent {...defaultProps} repositories={repos} isLoading={true} />);

      // Should show repos, not spinner
      expect(screen.getByTestId('repo-card-1')).toBeInTheDocument();
      expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
    });

    it('shows "Searching..." when loading with active search', () => {
      render(<RepositoryContent {...defaultProps} isLoading={true} hasActiveSearch={true} />);

      expect(screen.getByText(/searching/i)).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('displays error message when error is provided', () => {
      const error = new Error('Failed to fetch repositories');
      render(<RepositoryContent {...defaultProps} error={error} />);

      expect(screen.getByText(/error loading repositories/i)).toBeInTheDocument();
      expect(screen.getByText(error.message)).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('displays custom empty state when no repositories and not searching', () => {
      const customEmptyState = <div data-testid="custom-empty">No repos here</div>;
      render(<RepositoryContent {...defaultProps} emptyState={customEmptyState} />);

      expect(screen.getByTestId('custom-empty')).toBeInTheDocument();
    });

    it('shows NoSearchResultsState when search returns no results', () => {
      render(<RepositoryContent {...defaultProps} hasActiveSearch={true} />);

      expect(screen.getByText(/no repos found/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument();
    });

    it('calls onClearSearch when clear search button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnClearSearch = vi.fn();

      render(
        <RepositoryContent
          {...defaultProps}
          hasActiveSearch={true}
          onClearSearch={mockOnClearSearch}
        />
      );

      await user.click(screen.getByRole('button', { name: /clear search/i }));
      expect(mockOnClearSearch).toHaveBeenCalled();
    });
  });

  describe('Pre-search state', () => {
    it('shows pre-search state when provided and no active search', () => {
      const preSearchState = <div data-testid="pre-search">Search to discover</div>;
      render(<RepositoryContent {...defaultProps} preSearchState={preSearchState} />);

      expect(screen.getByTestId('pre-search')).toBeInTheDocument();
    });

    it('does not show pre-search state when there is an active search', () => {
      const preSearchState = <div data-testid="pre-search">Search to discover</div>;
      render(
        <RepositoryContent
          {...defaultProps}
          preSearchState={preSearchState}
          hasActiveSearch={true}
        />
      );

      expect(screen.queryByTestId('pre-search')).not.toBeInTheDocument();
    });
  });

  describe('Repository display', () => {
    it('renders repository cards for provided repositories', () => {
      const repos = [
        createMockRepository({ id: 1, name: 'repo-1' }),
        createMockRepository({ id: 2, name: 'repo-2' }),
        createMockRepository({ id: 3, name: 'repo-3' }),
      ];

      render(<RepositoryContent {...defaultProps} repositories={repos} />);

      expect(screen.getByTestId('repo-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('repo-card-2')).toBeInTheDocument();
      expect(screen.getByTestId('repo-card-3')).toBeInTheDocument();
    });

    it('renders footer when provided and has repositories', () => {
      const repos = [createMockRepository({ id: 1 })];
      const footer = <p>3 repositories</p>;

      render(<RepositoryContent {...defaultProps} repositories={repos} footer={footer} />);

      expect(screen.getByText('3 repositories')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('includes aria-live region for screen reader announcements', () => {
      const repos = [createMockRepository({ id: 1 })];
      render(<RepositoryContent {...defaultProps} repositories={repos} />);

      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
    });
  });
});
