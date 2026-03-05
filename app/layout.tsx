import type { ReactNode } from 'react';
import { Providers } from './providers';
import '@/src/index.css';

export const metadata = {
  title: 'Repo Radar',
  description: 'GitHub repository momentum dashboard',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
