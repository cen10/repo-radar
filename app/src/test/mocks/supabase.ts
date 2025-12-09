import { vi } from 'vitest';
import type { Session, User } from '@supabase/supabase-js';

export const mockSession: Session = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
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

export const mockSupabaseClient = {
  auth: {
    getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    onAuthStateChange: vi.fn((callback: any) => {
      const unsubscribe = vi.fn();
      return { data: { subscription: { unsubscribe } }, error: null };
    }),
    signInWithOAuth: vi.fn(() =>
      Promise.resolve({ data: {}, error: null })
    ),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
  },
};

vi.mock('../../services/supabase', () => ({
  supabase: mockSupabaseClient,
}));