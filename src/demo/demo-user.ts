/**
 * Demo user constant - intentionally in a separate file.
 *
 * This is imported by AuthProvider and radar.ts which are in the main bundle.
 * Keeping it separate from demo-data.ts (1600+ lines of mock repos) ensures
 * only this tiny constant is included in the main chunk. The full mock data
 * is only loaded when demo mode starts via dynamic import in browser.ts.
 */

import type { User } from '../types';

export const DEMO_USER: User = {
  id: 'demo-user-id',
  login: 'demo-user',
  name: 'Demo User',
  avatar_url: '', // Empty to show generic person icon
  email: 'demo@example.com',
};
