import type { Page } from '@playwright/test';
import { createMockSession } from '../../fixtures/auth';

/**
 * Extracts Supabase project ref from URL.
 * Example: https://pyxtbahcnzwfenddabcz.supabase.co -> pyxtbahcnzwfenddabcz
 */
function getSupabaseProjectRef(): string {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  try {
    const url = new URL(supabaseUrl);
    return url.hostname.split('.')[0];
  } catch {
    return 'localhost';
  }
}

/**
 * Sets up authentication cookies for Next.js app.
 * The @supabase/ssr client reads auth state from cookies.
 */
export async function setupAuthCookie(page: Page, githubToken = 'mock-github-token') {
  const session = createMockSession(githubToken);
  const projectRef = getSupabaseProjectRef();
  const cookieName = `sb-${projectRef}-auth-token`;
  const cookieValue = encodeURIComponent(JSON.stringify(session));

  await page.context().addCookies([
    {
      name: cookieName,
      value: cookieValue,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
}
