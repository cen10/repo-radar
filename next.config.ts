import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: '..',
  },
  typescript: {
    tsconfigPath: './tsconfig.next.json',
  },
};

export default nextConfig;
