import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    tsconfigPath: './tsconfig.next.json',
  },
  experimental: {
    // Enables MSW to intercept server-side fetch calls (e.g., Supabase auth
    // in middleware) during Playwright E2E tests. Playwright's page.route()
    // only intercepts client-side requests. Only enabled in non-production
    // for defense-in-depth (the proxy is a no-op in production regardless).
    // See: https://nextjs.org/docs/app/building-your-application/testing/playwright
    testProxy: process.env.NODE_ENV !== 'production',
  },
};

export default nextConfig;
