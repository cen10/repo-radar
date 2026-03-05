import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load E2E environment variables from .env.e2e.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env.e2e.local') });

/**
 * Playwright E2E test configuration for Next.js app
 * Run with: npx playwright test --config=playwright.nextjs.config.ts
 *
 * This is separate from the main playwright.config.ts to avoid starting
 * both dev servers when only one is needed. See:
 * https://github.com/microsoft/playwright/issues/29273
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /nextjs.*\.spec\.ts/,

  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Limit parallel workers on CI
  workers: process.env.CI ? 2 : undefined,

  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'nextjs-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev:next',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  outputDir: 'tests/e2e/test-results',

  timeout: 30 * 1000,

  expect: {
    timeout: 5 * 1000,
  },
});
