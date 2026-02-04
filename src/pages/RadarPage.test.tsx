import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RadarPage from './RadarPage';
import * as useRadarHook from '../hooks/useRadar';
import * as useRadarRepositoriesHook from '../hooks/useRadarRepositories';
import * as useAuthHook from '../hooks/useAuth';
import { createTestQueryClient } from '../../tests/helpers/query-client';
import { createMockRepository } from '../../tests/mocks/factories';
import type { Radar } from '../types/database';

// Mock the hooks
vi.mock('../hooks/useRadar');
vi.mock('../hooks/useRadarRepositories');
vi.mock('../hooks/useAuth');

// Local factory for Radar type (without repo_count) - useRadar returns Radar, not RadarWithCount
const createMockRadar = (overrides?: Partial<Radar>): Radar => ({
  id: 'radar-123',
  user_id: 'user-123',
  name: 'Frontend Tools',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('RadarPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();

    // Default auth mock
    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      providerToken: 'test-token',
      user: { id: 'user-1', login: 'testuser', name: 'Test User', avatar_url: '', email: null },
      authLoading: false,
      connectionError: null,
      signInWithGitHub: vi.fn(),
      signOut: vi.fn(),
      retryAuth: vi.fn(),
    });
  });

  const renderWithProviders = (radarId: string = 'radar-123') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/radar/${radarId}`]}>
          <Routes>
            <Route path="/radar/:id" element={<RadarPage />} />
            <Route path="/stars" element={<div>Stars Page</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  describe('Loading state', () => {
    it('shows loading spinner while fetching radar', () => {
      vi.mocked(useRadarHook.useRadar).mockReturnValue({
        radar: null,
        isLoading: true,
        error: null,
        isNotFound: false,
        refetch: vi.fn(),
      });
      vi.mocked(useRadarRepositoriesHook.useRadarRepositories).mockReturnValue({
        repositories: [],
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      renderWithProviders();

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/loading radar/i)).toBeInTheDocument();
    });
  });

  describe('Not found state', () => {
    it('shows not found message when radar does not exist', () => {
      vi.mocked(useRadarHook.useRadar).mockReturnValue({
        radar: null,
        isLoading: false,
        error: null,
        isNotFound: true,
        refetch: vi.fn(),
      });
      vi.mocked(useRadarRepositoriesHook.useRadarRepositories).mockReturnValue({
        repositories: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithProviders();

      expect(screen.getByText(/radar not found/i)).toBeInTheDocument();
      expect(screen.getByText(/back to my stars/i)).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('shows error message when fetch fails', () => {
      vi.mocked(useRadarHook.useRadar).mockReturnValue({
        radar: null,
        isLoading: false,
        error: new Error('Failed to load'),
        isNotFound: false,
        refetch: vi.fn(),
      });
      vi.mocked(useRadarRepositoriesHook.useRadarRepositories).mockReturnValue({
        repositories: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithProviders();

      expect(screen.getByText(/error loading radar/i)).toBeInTheDocument();
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });

  describe('Empty radar state', () => {
    it('shows empty message when radar has no repositories', () => {
      vi.mocked(useRadarHook.useRadar).mockReturnValue({
        radar: createMockRadar(),
        isLoading: false,
        error: null,
        isNotFound: false,
        refetch: vi.fn(),
      });
      vi.mocked(useRadarRepositoriesHook.useRadarRepositories).mockReturnValue({
        repositories: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithProviders();

      expect(screen.getByText(/no repos on this radar yet/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /go to my stars/i })).toBeInTheDocument();
    });
  });

  describe('Success state with repositories', () => {
    beforeEach(() => {
      vi.mocked(useRadarHook.useRadar).mockReturnValue({
        radar: createMockRadar({ name: 'Frontend Tools' }),
        isLoading: false,
        error: null,
        isNotFound: false,
        refetch: vi.fn(),
      });
      vi.mocked(useRadarRepositoriesHook.useRadarRepositories).mockReturnValue({
        repositories: [
          createMockRepository({ id: 1, name: 'repo-one', stargazers_count: 500 }),
          createMockRepository({ id: 2, name: 'repo-two', stargazers_count: 100 }),
        ],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });
    });

    it('displays radar name and repository count', () => {
      renderWithProviders();

      expect(screen.getByRole('heading', { name: /frontend tools/i })).toBeInTheDocument();
      // "2 repositories" appears in both header and footer, so use getAllByText
      const repoCountElements = screen.getAllByText(/2 repositories/i);
      expect(repoCountElements.length).toBeGreaterThan(0);
    });

    it('displays repository cards', () => {
      renderWithProviders();

      expect(screen.getByText('repo-one')).toBeInTheDocument();
      expect(screen.getByText('repo-two')).toBeInTheDocument();
    });

    it('shows search and sort controls', () => {
      renderWithProviders();

      // Sort dropdown button (Headless UI Listbox)
      expect(screen.getByRole('button', { name: /recently updated/i })).toBeInTheDocument();
      // Search is collapsible - look for the toggle button instead of the input
      expect(screen.getByRole('button', { name: /open search/i })).toBeInTheDocument();
    });

    it('shows kebab menu button', () => {
      renderWithProviders();

      expect(screen.getByRole('button', { name: /open radar menu/i })).toBeInTheDocument();
    });
  });

  describe('Search functionality', () => {
    beforeEach(() => {
      vi.mocked(useRadarHook.useRadar).mockReturnValue({
        radar: createMockRadar(),
        isLoading: false,
        error: null,
        isNotFound: false,
        refetch: vi.fn(),
      });
      vi.mocked(useRadarRepositoriesHook.useRadarRepositories).mockReturnValue({
        repositories: [
          createMockRepository({
            id: 1,
            name: 'react-query',
            description: 'Data fetching',
            topics: ['data'],
          }),
          createMockRepository({
            id: 2,
            name: 'tailwind',
            description: 'CSS framework',
            topics: ['css'],
          }),
        ],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });
    });

    it('filters repositories by search query', async () => {
      const user = userEvent.setup();
      renderWithProviders();

      // Expand the collapsible search first
      await user.click(screen.getByRole('button', { name: /open search/i }));

      const searchInput = screen.getByPlaceholderText(/search repositories/i);
      await user.type(searchInput, 'react');
      await user.click(screen.getByRole('button', { name: /^search$/i }));

      expect(screen.getByText('react-query')).toBeInTheDocument();
      expect(screen.queryByText('tailwind')).not.toBeInTheDocument();
    });

    it('shows no results message when search has no matches', async () => {
      const user = userEvent.setup();
      renderWithProviders();

      // Expand the collapsible search first
      await user.click(screen.getByRole('button', { name: /open search/i }));

      const searchInput = screen.getByPlaceholderText(/search repositories/i);
      await user.type(searchInput, 'nonexistent');
      await user.click(screen.getByRole('button', { name: /^search$/i }));

      expect(screen.getByText(/no repos found/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument();
    });
  });

  describe('Sort functionality', () => {
    beforeEach(() => {
      vi.mocked(useRadarHook.useRadar).mockReturnValue({
        radar: createMockRadar(),
        isLoading: false,
        error: null,
        isNotFound: false,
        refetch: vi.fn(),
      });
      vi.mocked(useRadarRepositoriesHook.useRadarRepositories).mockReturnValue({
        repositories: [
          createMockRepository({
            id: 1,
            name: 'fewer-stars',
            stargazers_count: 50,
            updated_at: '2024-01-01T00:00:00Z',
          }),
          createMockRepository({
            id: 2,
            name: 'more-stars',
            stargazers_count: 500,
            updated_at: '2024-01-15T00:00:00Z',
          }),
        ],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });
    });

    it('sorts by recently updated by default', () => {
      renderWithProviders();

      const cards = screen.getAllByRole('article');
      expect(cards[0]).toHaveTextContent('more-stars'); // More recently updated
    });

    it('sorts by most stars when selected', async () => {
      const user = userEvent.setup();
      renderWithProviders();

      // Click sort dropdown to open it
      await user.click(screen.getByRole('button', { name: /recently updated/i }));
      // Select "Most Stars" option
      await user.click(screen.getByRole('option', { name: /most stars/i }));

      const cards = screen.getAllByRole('article');
      expect(cards[0]).toHaveTextContent('more-stars'); // Has more stars
    });
  });

  describe('Delete modal', () => {
    beforeEach(() => {
      vi.mocked(useRadarHook.useRadar).mockReturnValue({
        radar: createMockRadar(),
        isLoading: false,
        error: null,
        isNotFound: false,
        refetch: vi.fn(),
      });
      vi.mocked(useRadarRepositoriesHook.useRadarRepositories).mockReturnValue({
        repositories: [createMockRepository()],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });
    });

    it('opens delete modal when Delete is clicked in menu', async () => {
      const user = userEvent.setup();
      renderWithProviders();

      // Open the kebab menu
      await user.click(screen.getByRole('button', { name: /open radar menu/i }));

      // Click Delete
      await user.click(screen.getByRole('menuitem', { name: /delete/i }));

      // Check modal is open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
      });
    });
  });
});
