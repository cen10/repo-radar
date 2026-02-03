import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load E2E environment variables from .env.e2e.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env.e2e.local') });

/**
 * Playwright E2E test configuration for Repo Radar
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',

  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Limit parallel workers on CI
  workers: process.env.CI ? 1 : undefined,

  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: 'http://localhost:5173',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  outputDir: 'e2e/test-results',

  timeout: 30 * 1000,

  expect: {
    timeout: 5 * 1000,
  },
});
