import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/stars';

  // Validate redirect path to prevent open redirect attacks
  // Only allow relative paths starting with / (not // which could be protocol-relative)
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/stars';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth_callback_failed`);
}
