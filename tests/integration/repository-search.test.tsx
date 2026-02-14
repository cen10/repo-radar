import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
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

      // Two repos with different star counts
      const lowStarsRepo = createMockRepository({
        id: 1,
        name: 'low-stars-repo',
        stargazers_count: 10,
      });
      const highStarsRepo = createMockRepository({
        id: 2,
        name: 'high-stars-repo',
        stargazers_count: 1000,
      });

      // Mock returns different order based on sort param
      mockSearchRepositories.mockImplementation(async (_token, _query, _page, _perPage, sort) => {
        const repos =
          sort === 'stars'
            ? [highStarsRepo, lowStarsRepo] // sorted by stars desc
            : [lowStarsRepo, highStarsRepo]; // default order (best-match)
        return { repositories: repos, totalCount: 2, apiSearchResultTotal: 2 };
      });

      renderForIntegration(<ExplorePage />, {
        authState: { user: mockUser, providerToken: mockToken },
      });

      // First search (default sort: best-match)
      const searchInput = screen.getByPlaceholderText(/search all github/i);
      await user.type(searchInput, 'test');
      await user.click(screen.getByRole('button', { name: /search/i }));

      // Verify initial order: low-stars first (best-match order)
      await waitFor(() => {
        const headings = screen.getAllByRole('heading', { level: 3 });
        expect(headings[0]).toHaveTextContent('low-stars-repo');
        expect(headings[1]).toHaveTextContent('high-stars-repo');
      });

      // Change sort to "Most Stars"
      const sortButton = screen.getByRole('button', { name: /sort repositories/i });
      await user.click(sortButton);
      await user.click(screen.getByRole('option', { name: /most stars/i }));

      // Verify API called with correct sort param
      await waitFor(() => {
        expect(mockSearchRepositories).toHaveBeenLastCalledWith(
          mockToken,
          'test',
          1,
          30,
          'stars',
          expect.any(AbortSignal),
          expect.anything()
        );
      });

      // Verify UI updated: high-stars now first
      await waitFor(() => {
        const headings = screen.getAllByRole('heading', { level: 3 });
        expect(headings[0]).toHaveTextContent('high-stars-repo');
        expect(headings[1]).toHaveTextContent('low-stars-repo');
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

      await waitFor(
        () => {
          expect(screen.getByText(/no repos found/i)).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

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

      const searchInput = screen.getByPlaceholderText(/search all github/i);
      await user.type(searchInput, 'repo');
      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(
        () => {
          expect(screen.getByRole('heading', { name: 'starred-repo' })).toBeInTheDocument();
          expect(screen.getByRole('heading', { name: 'unstarred-repo' })).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      // Find each repo card by its heading, then check for badge within
      const starredCard = screen.getByRole('heading', { name: 'starred-repo' }).closest('article')!;
      const unstarredCard = screen
        .getByRole('heading', { name: 'unstarred-repo' })
        .closest('article')!;

      // Starred repo should have the badge
      expect(
        within(starredCard).getByRole('status', { name: /starred repository/i })
      ).toBeInTheDocument();

      // Unstarred repo should NOT have the badge
      expect(
        within(unstarredCard).queryByRole('status', { name: /starred repository/i })
      ).not.toBeInTheDocument();
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

      const lowStarsRepo = createMockRepository({
        id: 1,
        name: 'low-stars-repo',
        stargazers_count: 10,
      });
      const highStarsRepo = createMockRepository({
        id: 2,
        name: 'high-stars-repo',
        stargazers_count: 1000,
      });

      mockSearchRepositories.mockImplementation(async (_token, _query, _page, _perPage, sort) => {
        const repos =
          sort === 'stars'
            ? [highStarsRepo, lowStarsRepo] // sorted by stars desc
            : [lowStarsRepo, highStarsRepo]; // sorted by best-match (default)
        return { repositories: repos, totalCount: 2, apiSearchResultTotal: 2 };
      });

      renderForIntegration(<ExplorePage />, {
        authState: { user: mockUser, providerToken: mockToken },
      });

      const searchInput = screen.getByPlaceholderText(/search all github/i);
      await user.type(searchInput, 'test');
      await user.click(screen.getByRole('button', { name: /search/i }));

      // Verify initial order: low-stars first (best-match order)
      await waitFor(() => {
        const headings = screen.getAllByRole('heading', { level: 3 });
        expect(headings[0]).toHaveTextContent('low-stars-repo');
        expect(headings[1]).toHaveTextContent('high-stars-repo');
      });

      const sortButton = screen.getByRole('button', { name: /sort repositories/i });
      await user.click(sortButton);
      await user.click(screen.getByRole('option', { name: /most stars/i }));

      // Verify sort changed: high-stars now first
      await waitFor(() => {
        const headings = screen.getAllByRole('heading', { level: 3 });
        expect(headings[0]).toHaveTextContent('high-stars-repo');
      });

      await user.clear(searchInput);
      await user.type(searchInput, 'another');
      await user.click(screen.getByRole('button', { name: /search/i }));

      // Verify sort dropdown still shows "Most Stars"
      await waitFor(() => {
        expect(sortButton).toHaveTextContent(/most stars/i);
      });

      // Verify API called with preserved sort param
      // searchRepositories(token, query, page, perPage, sort, signal, starredIds)
      const lastCall = mockSearchRepositories.mock.calls.at(-1);
      const [, query, , , sort] = lastCall ?? [];
      expect(query).toBe('another');
      expect(sort).toBe('stars');

      // Verify results still render in star-sorted order
      await waitFor(() => {
        const headings = screen.getAllByRole('heading', { level: 3 });
        expect(headings[0]).toHaveTextContent('high-stars-repo');
        expect(headings[1]).toHaveTextContent('low-stars-repo');
      });
    });
  });
});
