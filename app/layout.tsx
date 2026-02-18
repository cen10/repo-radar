export const metadata = {
  title: 'Repo Radar',
  description: 'GitHub repository momentum dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
