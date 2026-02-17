import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { RepositoryGrid } from '@/components/RepositoryGrid';
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

const defaultProps = {
  repositories: [],
  sortBy: 'updated',
};

describe('RepositoryGrid', () => {
  describe('Repository display', () => {
    it('renders repository cards for provided repositories', () => {
      const repos = [
        createMockRepository({ id: 1, name: 'repo-1' }),
        createMockRepository({ id: 2, name: 'repo-2' }),
        createMockRepository({ id: 3, name: 'repo-3' }),
      ];

      render(<RepositoryGrid {...defaultProps} repositories={repos} />);

      expect(screen.getByTestId('repo-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('repo-card-2')).toBeInTheDocument();
      expect(screen.getByTestId('repo-card-3')).toBeInTheDocument();
    });

    it('renders empty grid when no repositories', () => {
      render(<RepositoryGrid {...defaultProps} />);

      expect(screen.queryByTestId(/repo-card/)).not.toBeInTheDocument();
    });
  });

  describe('Searching state', () => {
    it('shows searching indicator when isSearching is true and no repos', () => {
      render(<RepositoryGrid {...defaultProps} isSearching={true} />);

      expect(screen.getByText(/searching/i)).toBeInTheDocument();
    });

    it('does not show searching indicator when there are repos', () => {
      const repos = [createMockRepository({ id: 1 })];
      render(<RepositoryGrid {...defaultProps} repositories={repos} isSearching={true} />);

      expect(screen.queryByText(/searching/i)).not.toBeInTheDocument();
      expect(screen.getByTestId('repo-card-1')).toBeInTheDocument();
    });
  });

  describe('Infinite scroll', () => {
    it('shows loading indicator when fetching more', () => {
      const repos = [createMockRepository({ id: 1 })];
      render(<RepositoryGrid {...defaultProps} repositories={repos} isFetchingMore={true} />);

      expect(screen.getByText(/loading more repositories/i)).toBeInTheDocument();
    });

    it('renders infinite scroll sentinel when hasMore is true', () => {
      const repos = [createMockRepository({ id: 1 })];
      render(<RepositoryGrid {...defaultProps} repositories={repos} hasMore={true} />);

      expect(screen.getByTestId('load-more-sentinel')).toBeInTheDocument();
    });

    it('does not render sentinel when hasMore is false', () => {
      const repos = [createMockRepository({ id: 1 })];
      render(<RepositoryGrid {...defaultProps} repositories={repos} hasMore={false} />);

      expect(screen.queryByTestId('load-more-sentinel')).not.toBeInTheDocument();
    });

    it('does not render sentinel while fetching more', () => {
      const repos = [createMockRepository({ id: 1 })];
      render(
        <RepositoryGrid
          {...defaultProps}
          repositories={repos}
          hasMore={true}
          isFetchingMore={true}
        />
      );

      expect(screen.queryByTestId('load-more-sentinel')).not.toBeInTheDocument();
    });
  });

  describe('Footer', () => {
    it('renders footer when provided and has repositories', () => {
      const repos = [createMockRepository({ id: 1 }), createMockRepository({ id: 2 })];
      const footer = <p>2 repositories</p>;

      render(<RepositoryGrid {...defaultProps} repositories={repos} footer={footer} />);

      expect(screen.getByText('2 repositories')).toBeInTheDocument();
    });

    it('renders singular form for single repository', () => {
      const repos = [createMockRepository({ id: 1 })];
      const footer = <p>1 repository</p>;

      render(<RepositoryGrid {...defaultProps} repositories={repos} footer={footer} />);

      expect(screen.getByText('1 repository')).toBeInTheDocument();
    });

    it('does not render footer when hasMore is true', () => {
      const repos = [createMockRepository({ id: 1 })];
      const footer = <p>End of results</p>;

      render(
        <RepositoryGrid {...defaultProps} repositories={repos} hasMore={true} footer={footer} />
      );

      expect(screen.queryByText('End of results')).not.toBeInTheDocument();
    });

    it('does not render footer when no repositories', () => {
      const footer = <p>0 repositories</p>;

      render(<RepositoryGrid {...defaultProps} footer={footer} />);

      expect(screen.queryByText('0 repositories')).not.toBeInTheDocument();
    });

    it('does not render footer while searching', () => {
      const repos = [createMockRepository({ id: 1 })];
      const footer = <p>1 repository</p>;

      render(
        <RepositoryGrid {...defaultProps} repositories={repos} isSearching={true} footer={footer} />
      );

      expect(screen.queryByText('1 repository')).not.toBeInTheDocument();
    });
  });
});
