import { vi } from 'vitest';
import type {
  Session,
  User,
  AuthChangeEvent,
  SignInWithOAuthCredentials,
} from '@supabase/supabase-js';

/**
 * Type-safe Supabase mock
 *
 * Why comprehensive typing matters here:
 * If Supabase updates their API (e.g., getSession adds a new required field),
 * these mocks will break at compile time instead of tests mysteriously failing at runtime.
 * You'll know exactly what needs updating, making maintenance much easier.
 *
 * This ensures our test mocks stay in sync with the actual Supabase client API.
 */

export const mockSession: Session = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  provider_token: 'mock-github-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: {
    id: 'user-123',
    email: 'test@example.com',
    user_metadata: {
      user_name: 'testuser',
      full_name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg',
    },
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
  } as User,
};

export type GetSessionResponse =
  | { data: { session: Session | null }; error: null }
  | { data: { session: null }; error: Error };
export type SignInWithOAuthResponse =
  | { data: { provider?: string; url?: string }; error: null }
  | { data: null; error: Error };
export type SignOutResponse = { error: null } | { error: Error };
export type OnAuthStateChangeResponse = {
  data: {
    subscription: {
      unsubscribe: () => void;
    };
  };
  error: null;
};

// Store the auth state change callback so tests can trigger auth events
let authStateChangeCallback: ((event: AuthChangeEvent, session: Session | null) => void) | null =
  null;

// Store the initial session to fire with INITIAL_SESSION event
let initialSessionForAuthChange: Session | null = null;

// Helper to set the initial session for onAuthStateChange
export const setInitialSession = (session: Session | null) => {
  initialSessionForAuthChange = session;
};

// Reset mock state between tests
export const resetAuthMockState = () => {
  authStateChangeCallback = null;
  initialSessionForAuthChange = null;
};

// Helper to trigger auth state changes in tests
export const triggerAuthStateChange = (event: AuthChangeEvent, session: Session | null) => {
  if (authStateChangeCallback) {
    authStateChangeCallback(event, session);
  }
};

export const mockSupabaseClient = {
  auth: {
    getSession: vi.fn<() => Promise<GetSessionResponse>>(() =>
      Promise.resolve({ data: { session: null }, error: null })
    ),
    onAuthStateChange: vi.fn<
      (
        callback: (event: AuthChangeEvent, session: Session | null) => void
      ) => OnAuthStateChangeResponse
    >((callback) => {
      // Store callback for later use
      authStateChangeCallback = callback;
      // Fire INITIAL_SESSION with the configured session (set via setInitialSession)
      setTimeout(() => callback('INITIAL_SESSION', initialSessionForAuthChange), 0);
      const unsubscribe = vi.fn(() => {
        authStateChangeCallback = null;
      });
      return { data: { subscription: { unsubscribe } }, error: null };
    }),
    signInWithOAuth: vi.fn<
      (credentials: SignInWithOAuthCredentials) => Promise<SignInWithOAuthResponse>
    >(() => Promise.resolve({ data: {}, error: null })),
    signOut: vi.fn<
      (options?: { scope?: 'global' | 'local' | 'others' }) => Promise<SignOutResponse>
    >(() => Promise.resolve({ error: null })),
  },
};
