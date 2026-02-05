import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

import { renderForIntegration } from '../helpers/integration-render';
import { createMockRepository, createMockUser } from '../mocks/factories';
import ExplorePage from '@/pages/ExplorePage';
import StarsPage from '@/pages/StarsPage';
import type { AllStarredData } from '@/types';

// Mock GitHub service
const mockSearchRepositories = vi.fn();
const mockSearchStarredRepositories = vi.fn();
const mockFetchAllStarredRepositories = vi.fn<(...args: unknown[]) => Promise<AllStarredData>>();
const mockFetchStarredRepositories = vi.fn();
const mockFetchStarredRepoCount = vi.fn();

vi.mock('@/services/github', () => ({
  searchRepositories: (...args: unknown[]) => mockSearchRepositories(...args),
  searchStarredRepositories: (...args: unknown[]) => mockSearchStarredRepositories(...args),
  fetchAllStarredRepositories: (...args: unknown[]) => mockFetchAllStarredRepositories(...args),
  fetchStarredRepositories: (...args: unknown[]) => mockFetchStarredRepositories(...args),
  fetchStarredRepoCount: (...args: unknown[]) => mockFetchStarredRepoCount(...args),
  MAX_STARRED_REPOS: 500,
}));

// Mock github-token service
vi.mock('@/services/github-token', () => ({
  getValidGitHubToken: (token: string | null) => token ?? 'fallback-token',
  hasFallbackToken: () => false,
}));

// Mock radar service (needed by RepoCard)
vi.mock('@/services/radar', () => ({
  getRadars: vi.fn().mockResolvedValue([]),
  getRadarsContainingRepo: vi.fn().mockResolvedValue([]),
  getAllRadarRepoIds: vi.fn().mockResolvedValue(new Set()),
  RADAR_LIMITS: {
    MAX_RADARS_PER_USER: 5,
    MAX_REPOS_PER_RADAR: 25,
    MAX_TOTAL_REPOS: 50,
  },
}));

// Mock intersection observer for infinite scroll
vi.mock('@/hooks/useIntersectionObserver', () => ({
  useIntersectionObserver: () => ({
    ref: vi.fn(),
    isIntersecting: false,
  }),
}));

describe('Repository Search Integration', () => {
  const mockUser = createMockUser({ login: 'testuser' });
  const mockToken = 'test-github-token';

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: no results
    mockSearchRepositories.mockResolvedValue({
      repositories: [],
      totalCount: 0,
      apiSearchResultTotal: 0,
    });
    mockSearchStarredRepositories.mockResolvedValue({
      repositories: [],
      totalCount: 0,
      apiSearchResultTotal: 0,
    });
    mockFetchAllStarredRepositories.mockResolvedValue({
      repositories: [],
      totalFetched: 0,
      totalStarred: 0,
    });
    mockFetchStarredRepositories.mockResolvedValue([]);
    mockFetchStarredRepoCount.mockResolvedValue(0);
  });

  describe('Explore Page', () => {
    it('shows pre-search state initially', () => {
      renderForIntegration(<ExplorePage />, {
        authState: { user: mockUser, providerToken: mockToken },
      });

      expect(screen.getByText(/discover repositories/i)).toBeInTheDocument();
      expect(screen.getByText(/search across all of github/i)).toBeInTheDocument();
    });

    it('searches and displays results', async () => {
      const user = userEvent.setup();
      const mockRepos = [
        createMockRepository({ id: 1, name: 'react', full_name: 'facebook/react' }),
        createMockRepository({ id: 2, name: 'vue', full_name: 'vuejs/vue' }),
      ];

      mockSearchRepositories.mockResolvedValue({
        repositories: mockRepos,
        totalCount: 2,
        apiSearchResultTotal: 2,
      });

      renderForIntegration(<ExplorePage />, {
        authState: { user: mockUser, providerToken: mockToken },
      });

      const searchInput = screen.getByPlaceholderText(/search all github/i);
      await user.type(searchInput, 'react');

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      await waitFor(
        () => {
          expect(screen.getByRole('heading', { name: 'react' })).toBeInTheDocument();
          expect(screen.getByRole('heading', { name: 'vue' })).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      expect(mockSearchRepositories).toHaveBeenCalledWith(
        mockToken,
        'react',
        1,
        30,
        'best-match',
        expect.any(AbortSignal),
        expect.anything()
      );
    });

    it('shows no results message when search returns empty', async () => {
      const user = userEvent.setup();

      mockSearchRepositories.mockResolvedValue({
        repositories: [],
        totalCount: 0,
        apiSearchResultTotal: 0,
      });

      renderForIntegration(<ExplorePage />, {
        authState: { user: mockUser, providerToken: mockToken },
      });

      const searchInput = screen.getByPlaceholderText(/search all github/i);
      await user.type(searchInput, 'xyznonexistent123');

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText(/no repos found/i)).toBeInTheDocument();
      });
    });

    it('changes sort and re-fetches', async () => {
      const user = userEvent.setup();
      const mockRepos = [createMockRepository({ id: 1, name: 'test-repo' })];

      mockSearchRepositories.mockResolvedValue({
        repositories: mockRepos,
        totalCount: 1,
        apiSearchResultTotal: 1,
      });

      renderForIntegration(<ExplorePage />, {
        authState: { user: mockUser, providerToken: mockToken },
      });

      // First search
      const searchInput = screen.getByPlaceholderText(/search all github/i);
      await user.type(searchInput, 'test');
      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(screen.getByText('test-repo')).toBeInTheDocument();
      });

      // Change sort (button has aria-label="Sort repositories")
      const sortButton = screen.getByRole('button', { name: /sort repositories/i });
      await user.click(sortButton);
      await user.click(screen.getByRole('option', { name: /most stars/i }));

      // Should re-fetch with new sort
      await waitFor(() => {
        expect(mockSearchRepositories).toHaveBeenLastCalledWith(
          mockToken,
          'test',
          1,
          30,
          'stars', // new sort
          expect.any(AbortSignal),
          expect.anything()
        );
      });
    });

    it('handles search API error', async () => {
      const user = userEvent.setup();

      mockSearchRepositories.mockRejectedValue(new Error('API rate limit exceeded'));

      renderForIntegration(<ExplorePage />, {
        authState: { user: mockUser, providerToken: mockToken },
      });

      const searchInput = screen.getByPlaceholderText(/search all github/i);
      await user.type(searchInput, 'test');
      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(screen.getByText(/error loading repositories/i)).toBeInTheDocument();
      });
    });
  });

  describe('Stars Page', () => {
    it('displays starred repos in browse mode', async () => {
      const starredRepos = [
        createMockRepository({ id: 1, name: 'starred-1', full_name: 'user/starred-1' }),
        createMockRepository({ id: 2, name: 'starred-2', full_name: 'user/starred-2' }),
      ];

      mockFetchStarredRepositories.mockResolvedValue(starredRepos);
      mockFetchStarredRepoCount.mockResolvedValue(2);

      renderForIntegration(<StarsPage />, {
        authState: { user: mockUser, providerToken: mockToken },
      });

      await waitFor(
        () => {
          expect(screen.getByRole('heading', { name: 'starred-1' })).toBeInTheDocument();
          expect(screen.getByRole('heading', { name: 'starred-2' })).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('switches to search mode when query submitted', async () => {
      const user = userEvent.setup();

      const starredRepos = [
        createMockRepository({ id: 1, name: 'react-app', full_name: 'user/react-app' }),
        createMockRepository({ id: 2, name: 'vue-app', full_name: 'user/vue-app' }),
      ];

      mockFetchStarredRepositories.mockResolvedValue(starredRepos);
      mockFetchStarredRepoCount.mockResolvedValue(2);
      mockFetchAllStarredRepositories.mockResolvedValue({
        repositories: starredRepos,
        totalFetched: 2,
        totalStarred: 2,
      });
      mockSearchStarredRepositories.mockResolvedValue({
        repositories: [starredRepos[0]], // Only react-app matches
        totalCount: 1,
        apiSearchResultTotal: 1,
      });

      renderForIntegration(<StarsPage />, {
        authState: { user: mockUser, providerToken: mockToken },
      });

      // Wait for browse mode to load
      await waitFor(
        () => {
          expect(screen.getByRole('heading', { name: 'react-app' })).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      // Open collapsed search and enter query
      await user.click(screen.getByRole('button', { name: /open search/i }));
      const searchInput = screen.getByPlaceholderText(/search your starred/i);
      await user.type(searchInput, 'react');
      // Submit the search form
      await user.keyboard('{Enter}');

      // Should show filtered results
      await waitFor(
        () => {
          expect(screen.getByRole('heading', { name: 'react-app' })).toBeInTheDocument();
          expect(screen.queryByRole('heading', { name: 'vue-app' })).not.toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('shows empty state for users with no starred repos', async () => {
      mockFetchStarredRepositories.mockResolvedValue([]);
      mockFetchStarredRepoCount.mockResolvedValue(0);

      renderForIntegration(<StarsPage />, {
        authState: { user: mockUser, providerToken: mockToken },
      });

      await waitFor(() => {
        expect(screen.getByText(/no starred repos yet/i)).toBeInTheDocument();
      });
    });

    it('clears search returns to browse mode', async () => {
      const user = userEvent.setup();

      const starredRepos = [
        createMockRepository({ id: 1, name: 'repo-1', full_name: 'user/repo-1' }),
        createMockRepository({ id: 2, name: 'repo-2', full_name: 'user/repo-2' }),
      ];

      mockFetchStarredRepositories.mockResolvedValue(starredRepos);
      mockFetchStarredRepoCount.mockResolvedValue(2);
      mockFetchAllStarredRepositories.mockResolvedValue({
        repositories: starredRepos,
        totalFetched: 2,
        totalStarred: 2,
      });
      // Return empty results for search to trigger "No repos found" state
      mockSearchStarredRepositories.mockResolvedValue({
        repositories: [],
        totalCount: 0,
        apiSearchResultTotal: 0,
      });

      renderForIntegration(<StarsPage />, {
        authState: { user: mockUser, providerToken: mockToken },
      });

      // Wait for browse mode
      await waitFor(
        () => {
          expect(screen.getByRole('heading', { name: 'repo-1' })).toBeInTheDocument();
          expect(screen.getByRole('heading', { name: 'repo-2' })).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      // Open collapsed search and enter query that returns no results
      await user.click(screen.getByRole('button', { name: /open search/i }));
      const searchInput = screen.getByPlaceholderText(/search your starred/i);
      await user.type(searchInput, 'nonexistent');
      await user.keyboard('{Enter}');

      // Should show no results state with clear button
      await waitFor(
        () => {
          expect(screen.getByText(/no repos found/i)).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      // Click "Clear search" button to return to browse mode
      await user.click(screen.getByRole('button', { name: /clear search/i }));

      // Should return to browse mode showing all repos
      await waitFor(
        () => {
          expect(screen.getByRole('heading', { name: 'repo-1' })).toBeInTheDocument();
          expect(screen.getByRole('heading', { name: 'repo-2' })).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });

  describe('Search Result Badges', () => {
    it('marks starred repos with badge in explore results', async () => {
      const user = userEvent.setup();

      // User has starred repo-1 but not repo-2
      const starredRepo = createMockRepository({
        id: 1,
        name: 'starred-repo',
        full_name: 'owner/starred-repo',
        is_starred: true,
      });
      const unstarredRepo = createMockRepository({
        id: 2,
        name: 'unstarred-repo',
        full_name: 'owner/unstarred-repo',
        is_starred: false,
      });

      mockSearchRepositories.mockResolvedValue({
        repositories: [starredRepo, unstarredRepo],
        totalCount: 2,
        apiSearchResultTotal: 2,
      });

      renderForIntegration(<ExplorePage />, {
        authState: { user: mockUser, providerToken: mockToken },
      });

      // Search
      const searchInput = screen.getByPlaceholderText(/search all github/i);
      await user.type(searchInput, 'repo');
      await user.click(screen.getByRole('button', { name: /search/i }));

      // Wait for results
      await waitFor(
        () => {
          expect(screen.getByRole('heading', { name: 'starred-repo' })).toBeInTheDocument();
          expect(screen.getByRole('heading', { name: 'unstarred-repo' })).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      // The starred repo should have a star badge
      const starredBadge = screen.getByRole('status', { name: /starred repository/i });
      expect(starredBadge).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading indicator while searching', async () => {
      const user = userEvent.setup();

      // Never resolve the search
      mockSearchRepositories.mockImplementation(() => new Promise(() => {}));

      renderForIntegration(<ExplorePage />, {
        authState: { user: mockUser, providerToken: mockToken },
      });

      const searchInput = screen.getByPlaceholderText(/search all github/i);
      await user.type(searchInput, 'test');
      await user.click(screen.getByRole('button', { name: /search/i }));

      // Should show searching indicator
      await waitFor(() => {
        expect(screen.getByText(/searching/i)).toBeInTheDocument();
      });
    });
  });

  describe('Sort Persistence', () => {
    it('maintains sort selection when clearing and re-searching', async () => {
      const user = userEvent.setup();
      const mockRepos = [createMockRepository({ id: 1, name: 'test-repo' })];

      mockSearchRepositories.mockResolvedValue({
        repositories: mockRepos,
        totalCount: 1,
        apiSearchResultTotal: 1,
      });

      renderForIntegration(<ExplorePage />, {
        authState: { user: mockUser, providerToken: mockToken },
      });

      // Search
      const searchInput = screen.getByPlaceholderText(/search all github/i);
      await user.type(searchInput, 'test');
      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(screen.getByText('test-repo')).toBeInTheDocument();
      });

      // Change sort to "Most Stars" (button has aria-label="Sort repositories")
      await user.click(screen.getByRole('button', { name: /sort repositories/i }));
      await user.click(screen.getByRole('option', { name: /most stars/i }));

      // Clear and search again
      await user.clear(searchInput);
      await user.type(searchInput, 'another');
      await user.click(screen.getByRole('button', { name: /search/i }));

      // Sort should still be "Most Stars"
      await waitFor(() => {
        expect(mockSearchRepositories).toHaveBeenLastCalledWith(
          expect.anything(),
          'another',
          expect.anything(),
          expect.anything(),
          'stars', // Sort should be preserved
          expect.anything(),
          expect.anything()
        );
      });
    });
  });
});
