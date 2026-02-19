import { describe, it, expect } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { AuthProvider } from '@/components/AuthProvider';
import '../../mocks/supabase';
import { createTestQueryClient } from '../../helpers/query-client';

describe('useAuth', () => {
  it('should throw error when used outside AuthProvider', () => {
    const consoleError = console.error;
    console.error = () => {};

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within AuthProvider');

    console.error = consoleError;
  });

  it('should return auth context when used within AuthProvider', () => {
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current).toHaveProperty('user');
    expect(result.current).toHaveProperty('providerToken');
    expect(result.current).toHaveProperty('authLoading');
    expect(result.current).toHaveProperty('signInWithGitHub');
    expect(result.current).toHaveProperty('signOut');
  });

  it('should provide signInWithGitHub function', () => {
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(typeof result.current.signInWithGitHub).toBe('function');
  });

  it('should provide signOut function', () => {
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(typeof result.current.signOut).toBe('function');
  });
});
