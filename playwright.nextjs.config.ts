import { devices } from '@playwright/test';
import nextTestMode from 'next/experimental/testmode/playwright.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Destructure from default export (CJS module doesn't support named ESM exports)
const { defineConfig } = nextTestMode;

// Load E2E environment variables from .env.e2e.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env.e2e.local') });

/**
 * Playwright E2E test configuration for Next.js app with testProxy
 * Run with: npm run test:e2e:nextjs
 *
 * Uses Next.js experimental testProxy for server-side fetch interception,
 * enabling MSW handlers to mock Supabase auth calls in middleware.
 *
 * NOTE: testMatch is required due to a known bug in Next.js 15 testmode
 * where tests aren't discovered automatically.
 * See: https://github.com/vercel/next.js/issues/71773
 *
 * @see https://nextjs.org/docs/app/building-your-application/testing/playwright
 */
export default defineConfig({
  testDir: './tests/e2e/nextjs',
  // Workaround for testmode test discovery bug (GitHub #71773)
  testMatch: '**/*.spec.ts',

  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Limit parallel workers on CI
  workers: process.env.CI ? 2 : undefined,

  reporter: [['html', { open: 'never', outputFolder: 'playwright-report-nextjs' }], ['list']],

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

  outputDir: 'tests/e2e/test-results-nextjs',

  timeout: 30 * 1000,

  expect: {
    timeout: 5 * 1000,
  },
});
