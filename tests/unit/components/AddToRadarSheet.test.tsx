import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactElement } from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AddToRadarSheet } from '@/components/AddToRadarSheet';
import { OnboardingProvider } from '@/contexts/onboarding-context';
import * as radarService from '@/services/radar';
import { createTestQueryClient } from '../../helpers/query-client';
import { createMockRadar } from '../../mocks/factories';

// Mock the radar service
vi.mock('@/services/radar', () => ({
  getRadars: vi.fn(),
  getRadarsContainingRepo: vi.fn(),
  addRepoToRadar: vi.fn(),
  removeRepoFromRadar: vi.fn(),
  RADAR_LIMITS: {
    MAX_RADARS_PER_USER: 5,
    MAX_REPOS_PER_RADAR: 25,
    MAX_TOTAL_REPOS: 50,
  },
}));

const TEST_REPO_ID = 12345;

const defaultProps = {
  githubRepoId: TEST_REPO_ID,
  open: true,
  onClose: vi.fn(),
};

const renderWithProviders = (ui: ReactElement, queryClient?: QueryClient) => {
  const client = queryClient ?? createTestQueryClient();
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <OnboardingProvider>{ui}</OnboardingProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe('AddToRadarSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders bottom sheet with title', async () => {
      vi.mocked(radarService.getRadars).mockResolvedValue([]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(<AddToRadarSheet {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/add to radar/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      vi.mocked(radarService.getRadars).mockResolvedValue([]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(<AddToRadarSheet {...defaultProps} open={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('radar list', () => {
    it('shows all radars with correct checked states', async () => {
      const radars = [
        createMockRadar({ id: 'radar-1', name: 'Frontend' }),
        createMockRadar({ id: 'radar-2', name: 'Backend' }),
        createMockRadar({ id: 'radar-3', name: 'Tools' }),
      ];
      vi.mocked(radarService.getRadars).mockResolvedValue(radars);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue(['radar-1', 'radar-3']);

      renderWithProviders(<AddToRadarSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Frontend')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).toBeChecked(); // Frontend
      expect(checkboxes[1]).not.toBeChecked(); // Backend
      expect(checkboxes[2]).toBeChecked(); // Tools
    });

    it('shows empty message when no radars', async () => {
      vi.mocked(radarService.getRadars).mockResolvedValue([]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(<AddToRadarSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/no radars yet/i)).toBeInTheDocument();
      });
    });

    it('shows loading state', () => {
      vi.mocked(radarService.getRadars).mockImplementation(() => new Promise(() => {}));
      vi.mocked(radarService.getRadarsContainingRepo).mockImplementation(
        () => new Promise(() => {})
      );

      renderWithProviders(<AddToRadarSheet {...defaultProps} />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('checkbox toggling (batch save)', () => {
    it('does not call API immediately when toggling checkbox', async () => {
      const user = userEvent.setup();
      vi.mocked(radarService.getRadars).mockResolvedValue([
        createMockRadar({ id: 'radar-1', name: 'Frontend' }),
      ]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(<AddToRadarSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Frontend')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('checkbox'));

      // Checkbox should be checked immediately (local state)
      expect(screen.getByRole('checkbox')).toBeChecked();

      // But no API call yet
      expect(radarService.addRepoToRadar).not.toHaveBeenCalled();
    });

    it('calls addRepoToRadar when clicking Done after checking', async () => {
      const user = userEvent.setup();
      const queryClient = createTestQueryClient();
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      vi.mocked(radarService.getRadars).mockResolvedValue([
        createMockRadar({ id: 'radar-1', name: 'Frontend' }),
      ]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);
      vi.mocked(radarService.addRepoToRadar).mockResolvedValue({
        id: 'repo-1',
        radar_id: 'radar-1',
        github_repo_id: TEST_REPO_ID,
        added_at: '2024-01-15T10:00:00Z',
      });

      renderWithProviders(<AddToRadarSheet {...defaultProps} />, queryClient);

      await waitFor(() => {
        expect(screen.getByText('Frontend')).toBeInTheDocument();
      });

      // Toggle checkbox (local state only)
      await user.click(screen.getByRole('checkbox'));
      expect(radarService.addRepoToRadar).not.toHaveBeenCalled();

      // Click Done to save
      await user.click(screen.getByRole('button', { name: /done/i }));

      await waitFor(() => {
        expect(radarService.addRepoToRadar).toHaveBeenCalledWith('radar-1', TEST_REPO_ID);
      });

      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['radars'] });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({
          queryKey: ['repo-radars', TEST_REPO_ID],
        });
      });
    });

    it('calls removeRepoFromRadar when clicking Done after unchecking', async () => {
      const user = userEvent.setup();
      vi.mocked(radarService.getRadars).mockResolvedValue([
        createMockRadar({ id: 'radar-1', name: 'Frontend' }),
      ]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue(['radar-1']);
      vi.mocked(radarService.removeRepoFromRadar).mockResolvedValue();

      renderWithProviders(<AddToRadarSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeChecked();
      });

      // Uncheck (local state only)
      await user.click(screen.getByRole('checkbox'));
      expect(screen.getByRole('checkbox')).not.toBeChecked();
      expect(radarService.removeRepoFromRadar).not.toHaveBeenCalled();

      // Click Done to save
      await user.click(screen.getByRole('button', { name: /done/i }));

      await waitFor(() => {
        expect(radarService.removeRepoFromRadar).toHaveBeenCalledWith('radar-1', TEST_REPO_ID);
      });
    });

    it('updates checkbox state immediately on toggle', async () => {
      const user = userEvent.setup();
      vi.mocked(radarService.getRadars).mockResolvedValue([
        createMockRadar({ id: 'radar-1', name: 'Frontend' }),
      ]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(<AddToRadarSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).not.toBeChecked();
      });

      await user.click(screen.getByRole('checkbox'));

      // Should be checked immediately (local state)
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('shows error when save fails and keeps sheet open', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      vi.mocked(radarService.getRadars).mockResolvedValue([
        createMockRadar({ id: 'radar-1', name: 'Frontend' }),
      ]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);
      vi.mocked(radarService.addRepoToRadar).mockRejectedValue(new Error('Failed to add'));

      renderWithProviders(<AddToRadarSheet {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).not.toBeChecked();
      });

      // Toggle checkbox
      await user.click(screen.getByRole('checkbox'));
      expect(screen.getByRole('checkbox')).toBeChecked();

      // Click Done - should fail and show error
      await user.click(screen.getByRole('button', { name: /done/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/failed to add/i);
      });

      // Sheet should stay open
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('limit handling', () => {
    it('disables checkbox when radar at 25 repo limit', async () => {
      vi.mocked(radarService.getRadars).mockResolvedValue([
        createMockRadar({ id: 'radar-1', name: 'Full Radar', repo_count: 25 }),
      ]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(<AddToRadarSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeDisabled();
      });
    });

    it('disables all unchecked when at 50 total repo limit', async () => {
      vi.mocked(radarService.getRadars).mockResolvedValue([
        createMockRadar({ id: 'radar-1', name: 'Checked', repo_count: 25 }),
        createMockRadar({ id: 'radar-2', name: 'Unchecked', repo_count: 25 }),
      ]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue(['radar-1']);

      renderWithProviders(<AddToRadarSheet {...defaultProps} />);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        // Checked radar should be enabled (can uncheck)
        expect(checkboxes[0]).not.toBeDisabled();
        // Unchecked radar should be disabled (at limit)
        expect(checkboxes[1]).toBeDisabled();
      });
    });
  });

  describe('closing behavior', () => {
    it('calls onClose when Done button is clicked with no changes', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      vi.mocked(radarService.getRadars).mockResolvedValue([]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(<AddToRadarSheet {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /done/i }));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when Escape is pressed with no changes', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      vi.mocked(radarService.getRadars).mockResolvedValue([]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(<AddToRadarSheet {...defaultProps} onClose={onClose} />);

      await user.keyboard('{Escape}');

      expect(onClose).toHaveBeenCalled();
    });

    it('shows confirmation dialog when closing with unsaved changes', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      vi.mocked(radarService.getRadars).mockResolvedValue([
        createMockRadar({ id: 'radar-1', name: 'Frontend' }),
      ]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(<AddToRadarSheet {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).not.toBeChecked();
      });

      // Make a change
      await user.click(screen.getByRole('checkbox'));

      // Try to close with Escape
      await user.keyboard('{Escape}');

      // Should show confirmation dialog, not close immediately
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByText(/discard changes/i)).toBeInTheDocument();
    });

    it('discards changes and closes when confirming discard', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      vi.mocked(radarService.getRadars).mockResolvedValue([
        createMockRadar({ id: 'radar-1', name: 'Frontend' }),
      ]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(<AddToRadarSheet {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).not.toBeChecked();
      });

      // Make a change
      await user.click(screen.getByRole('checkbox'));

      // Try to close
      await user.keyboard('{Escape}');

      // Confirm discard
      await user.click(screen.getByRole('button', { name: /discard/i }));

      expect(onClose).toHaveBeenCalled();
      // API should not have been called
      expect(radarService.addRepoToRadar).not.toHaveBeenCalled();
    });

    it('keeps sheet open when canceling discard confirmation', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      vi.mocked(radarService.getRadars).mockResolvedValue([
        createMockRadar({ id: 'radar-1', name: 'Frontend' }),
      ]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(<AddToRadarSheet {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).not.toBeChecked();
      });

      // Make a change
      await user.click(screen.getByRole('checkbox'));

      // Try to close
      await user.keyboard('{Escape}');

      // Click "Keep editing" to go back
      await user.click(screen.getByRole('button', { name: /keep editing/i }));

      // Sheet should still be open with changes preserved
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByRole('checkbox')).toBeChecked();
    });
  });

  describe('swipe gesture', () => {
    const createTouchEvent = (clientY: number) => ({
      touches: [{ clientX: 100, clientY, identifier: 0 }],
      changedTouches: [{ clientX: 100, clientY, identifier: 0 }],
    });

    it('closes when swiped down past threshold with no unsaved changes', () => {
      vi.useFakeTimers();
      const onClose = vi.fn();
      vi.mocked(radarService.getRadars).mockResolvedValue([]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(<AddToRadarSheet {...defaultProps} onClose={onClose} />);

      const panel = screen.getByTestId('bottom-sheet-panel');

      fireEvent.touchStart(panel, createTouchEvent(100));
      fireEvent.touchMove(panel, createTouchEvent(250)); // 150px down, past threshold
      fireEvent.touchEnd(panel, createTouchEvent(250));

      // onClose is called after transition animation completes
      expect(onClose).not.toHaveBeenCalled();
      vi.advanceTimersByTime(300);
      expect(onClose).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('does not close when swipe is below threshold', () => {
      const onClose = vi.fn();
      vi.mocked(radarService.getRadars).mockResolvedValue([]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(<AddToRadarSheet {...defaultProps} onClose={onClose} />);

      const panel = screen.getByTestId('bottom-sheet-panel');

      fireEvent.touchStart(panel, createTouchEvent(100));
      fireEvent.touchMove(panel, createTouchEvent(150)); // 50px down, below threshold
      fireEvent.touchEnd(panel, createTouchEvent(150));

      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not allow upward swipe', () => {
      const onClose = vi.fn();
      vi.mocked(radarService.getRadars).mockResolvedValue([]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(<AddToRadarSheet {...defaultProps} onClose={onClose} />);

      const panel = screen.getByTestId('bottom-sheet-panel');

      fireEvent.touchStart(panel, createTouchEvent(200));
      fireEvent.touchMove(panel, createTouchEvent(50)); // swiping up
      fireEvent.touchEnd(panel, createTouchEvent(50));

      expect(onClose).not.toHaveBeenCalled();
    });

    it('snaps back when swipe does not pass threshold', () => {
      const onClose = vi.fn();
      vi.mocked(radarService.getRadars).mockResolvedValue([]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(<AddToRadarSheet {...defaultProps} onClose={onClose} />);

      const panel = screen.getByTestId('bottom-sheet-panel');

      fireEvent.touchStart(panel, createTouchEvent(100));
      fireEvent.touchMove(panel, createTouchEvent(140)); // 40px down
      fireEvent.touchEnd(panel, createTouchEvent(140));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('shows confirmation dialog when swiped down with unsaved changes', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      vi.mocked(radarService.getRadars).mockResolvedValue([
        createMockRadar({ id: 'radar-1', name: 'Frontend' }),
      ]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(<AddToRadarSheet {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).not.toBeChecked();
      });

      // Make a change to trigger unsaved state
      await user.click(screen.getByRole('checkbox'));

      const panel = screen.getByTestId('bottom-sheet-panel');

      // Swipe down past threshold
      fireEvent.touchStart(panel, createTouchEvent(100));
      fireEvent.touchMove(panel, createTouchEvent(250));
      fireEvent.touchEnd(panel, createTouchEvent(250));

      // Should show confirmation dialog instead of closing
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByText(/discard changes/i)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has accessible dialog role', () => {
      vi.mocked(radarService.getRadars).mockResolvedValue([]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(<AddToRadarSheet {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
