import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { mockSupabaseClient } from './mocks/supabase';

// Mock Supabase client globally for all tests
vi.mock('../services/supabase', () => ({
  supabase: mockSupabaseClient,
}));

afterEach(() => {
  cleanup();
});
