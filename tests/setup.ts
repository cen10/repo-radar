import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { configMocks, mockAnimationsApi } from 'jsdom-testing-mocks';
import { mockSupabaseClient } from './mocks/supabase';
import { mockLogger } from './mocks/logger';

// jsdom-testing-mocks requires afterEach and afterAll to mock
// the Web Animations API.
configMocks({ afterEach, afterAll });

// Mock Web Animations API for Headless UI components (prevents polyfill warnings)
mockAnimationsApi();

// Mock ResizeObserver for Headless UI components
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = ResizeObserverMock;

// Mock matchMedia for responsive hooks (defaults to desktop)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false, // Default to desktop (not mobile)
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock Supabase client globally for all tests
vi.mock('@/services/supabase', () => ({
  supabase: mockSupabaseClient,
}));

// Mock logger globally to silence console output in tests
vi.mock('@/utils/logger', () => ({
  logger: mockLogger,
}));

afterEach(() => {
  cleanup();
});
