import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import RepositoryListPage from './RepositoryListPage';
import { useAuth } from '../hooks/useAuth';
import type { AuthContextType } from '../contexts/auth-context';
import type { Repository } from '../types';

// Mock useAuth hook
vi.mock('../hooks/useAuth');

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock RepositoryList to keep tests focused on RepositoryListPage behavior
vi.mock('./RepositoryList', () => ({
  default: ({ title, repositories }: { title: string; repositories: Repository[] }) => (
    <div data-testid="repository-list">
      <h1>{title}</h1>
      <span data-testid="repo-count">{repositories.length} repositories</span>
    </div>
  ),
}));

const mockUser = {
  id: '123',
  email: 'test@example.com',
  login: 'testuser',
  name: 'Test User',
  avatar_url: 'https://example.com/avatar.jpg',
};

const createMockAuthContext = (overrides: Partial<AuthContextType> = {}): AuthContextType => ({
  user: mockUser,
  providerToken: 'test-github-token',
  authLoading: false,
  connectionError: null,
  signInWithGitHub: vi.fn(),
  signOut: vi.fn(),
  retryAuth: vi.fn(),
  ...overrides,
});

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

const defaultResult = {
  repositories: [],
  isLoading: false,
  isFetchingNextPage: false,
  hasNextPage: false,
  fetchNextPage: vi.fn(),
  error: null,
};

const defaultProps = {
  title: 'My Stars',
  searchPlaceholder: 'Search your starred repositories...',
  emptyStateMessage: 'No repositories found',
  emptyStateHint: 'Star some repositories on GitHub to see them here',
  result: defaultResult,
  sortOptions: defaultSortOptions,
  sortBy: 'updated' as const,
  onSortChange: vi.fn(),
  searchQuery: '',
  onSearchChange: vi.fn(),
  onSearchSubmit: vi.fn(),
  hasActiveSearch: false,
  isSearching: false,
};

describe('RepositoryListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  describe('Auth loading state', () => {
    it('shows loading spinner when auth is loading', () => {
      vi.mocked(useAuth).mockReturnValue(createMockAuthContext({ authLoading: true, user: null }));

      render(<RepositoryListPage {...defaultProps} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
      expect(screen.queryByTestId('repository-list')).not.toBeInTheDocument();
    });

    it('does not show loading spinner when auth is complete', () => {
      vi.mocked(useAuth).mockReturnValue(createMockAuthContext());

      render(<RepositoryListPage {...defaultProps} />);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.getByTestId('repository-list')).toBeInTheDocument();
    });
  });

  describe('Auth redirect', () => {
    it('redirects to home when user is not authenticated', async () => {
      vi.mocked(useAuth).mockReturnValue(createMockAuthContext({ user: null, authLoading: false }));

      render(<RepositoryListPage {...defaultProps} />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('does not redirect when user is authenticated', () => {
      vi.mocked(useAuth).mockReturnValue(createMockAuthContext());

      render(<RepositoryListPage {...defaultProps} />);

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('renders nothing while redirecting (no user)', () => {
      vi.mocked(useAuth).mockReturnValue(createMockAuthContext({ user: null, authLoading: false }));

      const { container } = render(<RepositoryListPage {...defaultProps} />);

      // Should render nothing (null) while redirecting
      expect(container.firstChild).toBeNull();
    });
  });

  describe('GitHub auth error handling', () => {
    it('calls signOut when GitHub auth error occurs', async () => {
      const mockSignOut = vi.fn();
      vi.mocked(useAuth).mockReturnValue(createMockAuthContext({ signOut: mockSignOut }));

      const githubAuthError = new Error('GitHub authentication failed. Please sign in again.');

      render(
        <RepositoryListPage
          {...defaultProps}
          result={{ ...defaultResult, error: githubAuthError }}
        />
      );

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
      });
    });

    it('sets session_expired flag when GitHub auth error occurs', async () => {
      const mockSignOut = vi.fn();
      vi.mocked(useAuth).mockReturnValue(createMockAuthContext({ signOut: mockSignOut }));

      const githubAuthError = new Error('GitHub authentication failed. Please sign in again.');

      render(
        <RepositoryListPage
          {...defaultProps}
          result={{ ...defaultResult, error: githubAuthError }}
        />
      );

      await waitFor(() => {
        expect(sessionStorage.getItem('session_expired')).toBe('true');
      });
    });

    it('does not call signOut for non-auth errors', () => {
      const mockSignOut = vi.fn();
      vi.mocked(useAuth).mockReturnValue(createMockAuthContext({ signOut: mockSignOut }));

      const genericError = new Error('Something went wrong');

      render(
        <RepositoryListPage {...defaultProps} result={{ ...defaultResult, error: genericError }} />
      );

      expect(mockSignOut).not.toHaveBeenCalled();
    });
  });

  describe('renderPreSearch', () => {
    it('renders custom pre-search UI when provided and no active search', () => {
      vi.mocked(useAuth).mockReturnValue(createMockAuthContext());

      const renderPreSearch = () => (
        <div data-testid="custom-pre-search">Custom pre-search content</div>
      );

      render(
        <RepositoryListPage
          {...defaultProps}
          hasActiveSearch={false}
          renderPreSearch={renderPreSearch}
        />
      );

      expect(screen.getByTestId('custom-pre-search')).toBeInTheDocument();
      expect(screen.getByText('Custom pre-search content')).toBeInTheDocument();
      expect(screen.queryByTestId('repository-list')).not.toBeInTheDocument();
    });

    it('renders RepositoryList when hasActiveSearch is true even with renderPreSearch', () => {
      vi.mocked(useAuth).mockReturnValue(createMockAuthContext());

      const renderPreSearch = () => (
        <div data-testid="custom-pre-search">Custom pre-search content</div>
      );

      render(
        <RepositoryListPage
          {...defaultProps}
          hasActiveSearch={true}
          renderPreSearch={renderPreSearch}
        />
      );

      expect(screen.queryByTestId('custom-pre-search')).not.toBeInTheDocument();
      expect(screen.getByTestId('repository-list')).toBeInTheDocument();
    });

    it('renders RepositoryList when renderPreSearch is not provided', () => {
      vi.mocked(useAuth).mockReturnValue(createMockAuthContext());

      render(<RepositoryListPage {...defaultProps} hasActiveSearch={false} />);

      expect(screen.getByTestId('repository-list')).toBeInTheDocument();
    });
  });

  describe('RepositoryList rendering', () => {
    it('passes title to RepositoryList', () => {
      vi.mocked(useAuth).mockReturnValue(createMockAuthContext());

      render(<RepositoryListPage {...defaultProps} title="Explore" />);

      expect(screen.getByText('Explore')).toBeInTheDocument();
    });

    it('passes repositories to RepositoryList', () => {
      vi.mocked(useAuth).mockReturnValue(createMockAuthContext());

      const repos = [
        createMockRepository({ id: 1 }),
        createMockRepository({ id: 2 }),
        createMockRepository({ id: 3 }),
      ];

      render(
        <RepositoryListPage {...defaultProps} result={{ ...defaultResult, repositories: repos }} />
      );

      expect(screen.getByTestId('repo-count')).toHaveTextContent('3 repositories');
    });
  });

  describe('Page layout', () => {
    it('renders with consistent max-width container', () => {
      vi.mocked(useAuth).mockReturnValue(createMockAuthContext());

      const { container } = render(<RepositoryListPage {...defaultProps} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('max-w-7xl');
    });

    it('renders pre-search UI with same container styling', () => {
      vi.mocked(useAuth).mockReturnValue(createMockAuthContext());

      const renderPreSearch = () => <div>Pre-search</div>;

      const { container } = render(
        <RepositoryListPage
          {...defaultProps}
          hasActiveSearch={false}
          renderPreSearch={renderPreSearch}
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('max-w-7xl');
    });
  });
});
