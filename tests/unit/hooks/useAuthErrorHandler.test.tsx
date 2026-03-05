import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuthErrorHandler } from '@/hooks/useAuthErrorHandler';

// Mock dependencies
const mockSignOut = vi.fn().mockResolvedValue(undefined);
const mockNavigate = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    signOut: mockSignOut,
  }),
}));

vi.mock('@/hooks/routing', () => ({
  useAppRouter: () => ({
    navigate: mockNavigate,
  }),
}));

vi.mock('@/demo/is-demo-mode-active', () => ({
  isDemoModeActive: () => false,
}));

describe('useAuthErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('should not call signOut or navigate when error is null', () => {
    renderHook(() => useAuthErrorHandler(null, 'testHook'));

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should not call signOut or navigate for non-auth errors', () => {
    const error = new Error('Some random error');
    renderHook(() => useAuthErrorHandler(error, 'testHook'));

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should call signOut and navigate exactly once for GitHub auth error', async () => {
    const error = new Error('GitHub authentication failed (401)');

    renderHook(() => useAuthErrorHandler(error, 'testHook'));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('should set session_expired flag in sessionStorage', async () => {
    const error = new Error('GitHub authentication failed (401)');

    renderHook(() => useAuthErrorHandler(error, 'testHook'));

    await waitFor(() => {
      expect(sessionStorage.getItem('session_expired')).toBe('true');
    });
  });

  it('should handle GitHubReauthRequiredError by name', async () => {
    const error = new Error('No token available');
    error.name = 'GitHubReauthRequiredError';

    renderHook(() => useAuthErrorHandler(error, 'testHook'));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });
  });

  it('should not cause infinite re-renders when dependencies are stable', async () => {
    // This test ensures the navigate function reference is stable
    // If navigate changes on every render, the useEffect would fire repeatedly
    const error = new Error('GitHub authentication failed (401)');

    const { rerender } = renderHook(() => useAuthErrorHandler(error, 'testHook'));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    // Rerender with the same error - should not trigger again
    rerender();
    rerender();
    rerender();

    // Still only called once despite multiple re-renders
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });
});
