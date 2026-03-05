import { http, HttpResponse } from 'msw';
import { mockSupabaseUser, createMockSession } from '../../fixtures/auth';

/**
 * MSW handlers for Supabase auth endpoints.
 * These intercept both client-side and server-side (middleware) API calls
 * when using Next.js experimental testProxy.
 */

// Get Supabase URL from environment (either VITE_ or NEXT_PUBLIC_ prefix)
const supabaseUrl = (
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ''
).replace(/\/+$/, '');

export const supabaseAuthHandlers = [
  // Mock getUser() - called by middleware to check authentication
  http.get(`${supabaseUrl}/auth/v1/user`, () => {
    return HttpResponse.json(mockSupabaseUser);
  }),

  // Mock token refresh endpoint
  http.post(`${supabaseUrl}/auth/v1/token`, () => {
    return HttpResponse.json(createMockSession('mock-github-token'));
  }),
];

export const supabaseDataHandlers = [
  // Mock radars endpoint - return empty array for authenticated user
  http.get(`${supabaseUrl}/rest/v1/radars`, () => {
    return HttpResponse.json([]);
  }),

  // Mock radar_repos endpoint - return empty array
  http.get(`${supabaseUrl}/rest/v1/radar_repos`, () => {
    return HttpResponse.json([]);
  }),
];

export const allSupabaseHandlers = [...supabaseAuthHandlers, ...supabaseDataHandlers];
