import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { mockSupabaseClient } from './mocks/supabase';
import { mockLogger } from './mocks/logger';

// Mock ResizeObserver for Headless UI components
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = ResizeObserverMock;

// Mock Supabase client globally for all tests
vi.mock('../services/supabase', () => ({
  supabase: mockSupabaseClient,
}));

// Mock logger globally to silence console output in tests
vi.mock('../utils/logger', () => ({
  logger: mockLogger,
}));

afterEach(() => {
  cleanup();
});
