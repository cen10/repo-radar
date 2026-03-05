import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    tsconfigPath: './tsconfig.next.json',
  },
  experimental: {
    // Enables MSW to intercept server-side fetch calls (e.g., Supabase auth
    // in middleware) during Playwright E2E tests. Playwright's page.route()
    // only intercepts client-side requests.
    // See: https://nextjs.org/docs/app/building-your-application/testing/playwright
    testProxy: true,
  },
};

export default nextConfig;
