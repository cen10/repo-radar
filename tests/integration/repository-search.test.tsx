import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

import { renderForIntegration } from '../helpers/integration-render';
import { createMockRepository, createMockUser } from '../mocks/factories';
import ExplorePage from '../../src/pages/ExplorePage';
import StarsPage from '../../src/pages/StarsPage';
import type { Repository, AllStarredData } from '../../src/types';

// Mock GitHub service
const mockSearchRepositories = vi.fn();
const mockSearchStarredRepositories = vi.fn();
const mockFetchAllStarredRepositories = vi.fn<() => Promise<AllStarredData>>();
const mockFetchStarredRepositories = vi.fn();
const mockFetchStarredRepoCount = vi.fn();

vi.mock('../../src/services/github', () => ({
  searchRepositories: (...args: unknown[]) => mockSearchRepositories(...args),
  searchStarredRepositories: (...args: unknown[]) => mockSearchStarredRepositories(...args),
  fetchAllStarredRepositories: (token: string) => mockFetchAllStarredRepositories(token),
  fetchStarredRepositories: (...args: unknown[]) => mockFetchStarredRepositories(...args),
  fetchStarredRepoCount: (token: string) => mockFetchStarredRepoCount(token),
  MAX_STARRED_REPOS: 500,
}));

// Mock github-token service
vi.mock('../../src/services/github-token', () => ({
  getValidGitHubToken: (token: string | null) => token ?? 'fallback-token',
  hasFallbackToken: () => false,
}));

// Mock radar service (needed by RepoCard)
vi.mock('../../src/services/radar', () => ({
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
vi.mock('../../src/hooks/useIntersectionObserver', () => ({
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
      totalStarred: 0,
    });
    mockFetchStarredRepositories.mockResolvedValue({
      repositories: [],
      totalCount: 0,
      hasNextPage: false,
    });
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

      // Enter search query
      const searchInput = screen.getByPlaceholderText(/search all github/i);
      await user.type(searchInput, 'react');

      // Submit search
      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      // Wait for results
      await waitFor(() => {
        expect(screen.getByText('facebook/react')).toBeInTheDocument();
        expect(screen.getByText('vuejs/vue')).toBeInTheDocument();
      });

      // Verify service was called with correct params
      expect(mockSearchRepositories).toHaveBeenCalledWith(
        mockToken,
        'react',
        1, // page
        30, // items per page
        'best-match', // default sort
        expect.any(AbortSignal),
        expect.anything() // starredIds
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

      // Change sort
      const sortButton = screen.getByRole('button', { name: /best match/i });
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

      mockFetchStarredRepositories.mockResolvedValue({
        repositories: starredRepos,
        totalCount: 2,
        hasNextPage: false,
      });
      mockFetchStarredRepoCount.mockResolvedValue(2);

      renderForIntegration(<StarsPage />, {
        authState: { user: mockUser, providerToken: mockToken },
      });

      await waitFor(() => {
        expect(screen.getByText('user/starred-1')).toBeInTheDocument();
        expect(screen.getByText('user/starred-2')).toBeInTheDocument();
      });
    });

    it('switches to search mode when query submitted', async () => {
      const user = userEvent.setup();

      const starredRepos = [
        createMockRepository({ id: 1, name: 'react-app', full_name: 'user/react-app' }),
        createMockRepository({ id: 2, name: 'vue-app', full_name: 'user/vue-app' }),
      ];

      mockFetchStarredRepositories.mockResolvedValue({
        repositories: starredRepos,
        totalCount: 2,
        hasNextPage: false,
      });
      mockFetchStarredRepoCount.mockResolvedValue(2);
      mockFetchAllStarredRepositories.mockResolvedValue({
        repositories: starredRepos,
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
      await waitFor(() => {
        expect(screen.getByText('user/react-app')).toBeInTheDocument();
      });

      // Enter search
      const searchInput = screen.getByPlaceholderText(/search your starred/i);
      await user.type(searchInput, 'react');
      await user.click(screen.getByRole('button', { name: /search/i }));

      // Should show filtered results
      await waitFor(() => {
        expect(screen.getByText('user/react-app')).toBeInTheDocument();
        expect(screen.queryByText('user/vue-app')).not.toBeInTheDocument();
      });
    });

    it('shows empty state for users with no starred repos', async () => {
      mockFetchStarredRepositories.mockResolvedValue({
        repositories: [],
        totalCount: 0,
        hasNextPage: false,
      });
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

      mockFetchStarredRepositories.mockResolvedValue({
        repositories: starredRepos,
        totalCount: 2,
        hasNextPage: false,
      });
      mockFetchStarredRepoCount.mockResolvedValue(2);
      mockFetchAllStarredRepositories.mockResolvedValue({
        repositories: starredRepos,
        totalStarred: 2,
      });
      mockSearchStarredRepositories.mockResolvedValue({
        repositories: [starredRepos[0]],
        totalCount: 1,
        apiSearchResultTotal: 1,
      });

      renderForIntegration(<StarsPage />, {
        authState: { user: mockUser, providerToken: mockToken },
      });

      // Wait for browse mode
      await waitFor(() => {
        expect(screen.getByText('user/repo-1')).toBeInTheDocument();
        expect(screen.getByText('user/repo-2')).toBeInTheDocument();
      });

      // Search
      const searchInput = screen.getByPlaceholderText(/search your starred/i);
      await user.type(searchInput, 'repo-1');
      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(screen.queryByText('user/repo-2')).not.toBeInTheDocument();
      });

      // Clear search using the clear button (in CollapsibleSearch)
      const clearButton = screen.getByRole('button', { name: /clear/i });
      await user.click(clearButton);

      // Should return to browse mode showing all repos
      await waitFor(() => {
        expect(screen.getByText('user/repo-1')).toBeInTheDocument();
        expect(screen.getByText('user/repo-2')).toBeInTheDocument();
      });
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
      await waitFor(() => {
        expect(screen.getByText('owner/starred-repo')).toBeInTheDocument();
        expect(screen.getByText('owner/unstarred-repo')).toBeInTheDocument();
      });

      // The starred repo should have a star badge
      // Find the starred badge by looking for it near the starred repo
      const starredCard = screen.getByText('owner/starred-repo').closest('article');
      expect(starredCard).toBeInTheDocument();
      // Check for starred badge within the card
      const badge = starredCard?.querySelector('[data-testid="starred-badge"]');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading indicator while searching', async () => {
      const user = userEvent.setup();

      // Never resolve the search
      mockSearchRepositories.mockImplementation(
        () => new Promise(() => {})
      );

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

      // Change sort to "Most Stars"
      await user.click(screen.getByRole('button', { name: /best match/i }));
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
