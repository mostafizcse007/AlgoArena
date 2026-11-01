import { createClient } from '@/lib/supabase/server';
import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/';
  const error = searchParams.get('error');
  const error_description = searchParams.get('error_description');

  if (error || error_description) {
    const errorParam = encodeURIComponent(error_description || error || 'auth_failed');
    return NextResponse.redirect(`${origin}/login?error=${errorParam}`);
  }

  const supabase = await createClient();

  // 1. PKCE flow authorization code exchange
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error('exchangeCodeForSession error:', exchangeError);
  }

  // 2. Email confirmation link with token_hash and type
  if (token_hash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });
    if (!verifyError) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error('verifyOtp token_hash error:', verifyError);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
