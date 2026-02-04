import { vi } from 'vitest';

// Shared mock instance - exported so tests can assert on calls
export const mockLogger = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

// Reset helper for tests that need a clean slate
export const resetLoggerMock = () => {
  mockLogger.error.mockClear();
  mockLogger.warn.mockClear();
  mockLogger.info.mockClear();
  mockLogger.debug.mockClear();
};
