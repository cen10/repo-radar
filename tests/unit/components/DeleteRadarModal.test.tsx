import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactElement } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeleteRadarModal } from '@/components/DeleteRadarModal';
import * as radarService from '@/services/radar';
import type { Radar } from '@/types/database';

// Mock the radar service
vi.mock('@/services/radar', () => ({
  deleteRadar: vi.fn(),
}));

// Helper to create a test QueryClient
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

// Helper to create a mock radar
const createMockRadar = (overrides?: Partial<Radar>): Radar => ({
  id: 'radar-123',
  user_id: 'user-123',
  name: 'Frontend Tools',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

const defaultProps = {
  radar: createMockRadar(),
  onClose: vi.fn(),
  onDeleted: vi.fn(),
};

describe('DeleteRadarModal', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  const renderWithProviders = (ui: ReactElement, customQueryClient?: QueryClient) => {
    const client = customQueryClient ?? queryClient;
    return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  };

  describe('Rendering', () => {
    it('renders modal with confirmation message', () => {
      renderWithProviders(<DeleteRadarModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/delete radar/i)).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
      expect(screen.getByText(/frontend tools/i)).toBeInTheDocument();
      expect(screen.getByText(/this cannot be undone/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('Cancel action', () => {
    it('calls onClose when Cancel is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithProviders(<DeleteRadarModal {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Delete action', () => {
    it('calls deleteRadar and onDeleted on successful delete', async () => {
      const user = userEvent.setup();
      const onDeleted = vi.fn();
      vi.mocked(radarService.deleteRadar).mockResolvedValue(undefined);

      renderWithProviders(<DeleteRadarModal {...defaultProps} onDeleted={onDeleted} />);

      await user.click(screen.getByRole('button', { name: /delete/i }));

      await waitFor(() => {
        expect(radarService.deleteRadar).toHaveBeenCalledWith('radar-123');
        expect(onDeleted).toHaveBeenCalledTimes(1);
      });
    });

    it('shows loading spinner during deletion', async () => {
      const user = userEvent.setup();
      // Create a promise that doesn't resolve immediately
      let resolveDelete!: () => void;
      const deletePromise = new Promise<void>((resolve) => {
        resolveDelete = resolve;
      });
      vi.mocked(radarService.deleteRadar).mockReturnValue(deletePromise);

      renderWithProviders(<DeleteRadarModal {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /delete/i }));

      // Check that buttons are disabled during deletion
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();

      // Resolve the promise
      resolveDelete();
    });

    it('shows error message on delete failure', async () => {
      const user = userEvent.setup();
      vi.mocked(radarService.deleteRadar).mockRejectedValue(new Error('Network error'));

      renderWithProviders(<DeleteRadarModal {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /delete/i }));

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('invalidates radars list, specific radar, and radar repositories queries on success', async () => {
      const user = userEvent.setup();
      const testQueryClient = createTestQueryClient();
      const invalidateQueriesSpy = vi.spyOn(testQueryClient, 'invalidateQueries');
      vi.mocked(radarService.deleteRadar).mockResolvedValue(undefined);

      renderWithProviders(<DeleteRadarModal {...defaultProps} />, testQueryClient);

      await user.click(screen.getByRole('button', { name: /delete/i }));

      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['radars'] });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['radar', 'radar-123'] });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({
          queryKey: ['radarRepositories', 'radar-123'],
        });
      });
    });
  });

  describe('Modal closing behavior', () => {
    it('does not close modal during deletion, but does after success', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onDeleted = vi.fn();
      // Create a promise that doesn't resolve immediately
      let resolveDelete!: () => void;
      const deletePromise = new Promise<void>((resolve) => {
        resolveDelete = resolve;
      });
      vi.mocked(radarService.deleteRadar).mockReturnValue(deletePromise);

      renderWithProviders(
        <DeleteRadarModal {...defaultProps} onClose={onClose} onDeleted={onDeleted} />
      );

      await user.click(screen.getByRole('button', { name: /delete/i }));

      // Try to click cancel while deleting
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      // onClose should not have been called during deletion
      expect(onClose).not.toHaveBeenCalled();
      expect(onDeleted).not.toHaveBeenCalled();

      // Resolve the promise
      resolveDelete();

      // Now onDeleted should be called
      await waitFor(() => {
        expect(onDeleted).toHaveBeenCalledTimes(1);
      });
    });
  });
});
