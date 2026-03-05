import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    tsconfigPath: './tsconfig.next.json',
  },
  experimental: {
    testProxy: true,
  },
};

export default nextConfig;
