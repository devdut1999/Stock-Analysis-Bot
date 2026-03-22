import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle OAuth errors from provider
  if (errorParam) {
    console.error('Auth callback error from provider:', {
      error: errorParam,
      description: errorDescription,
    });
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription || errorParam)}`
    );
  }

  if (!code) {
    console.error('Auth callback missing code parameter');
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Auth code exchange failed:', {
        error: error.message,
        code: error.code,
        status: error.status,
      });
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }

    if (!data.session) {
      console.error('Auth code exchange returned no session');
      return NextResponse.redirect(`${origin}/login?error=no_session`);
    }

    // Successfully authenticated
    return NextResponse.redirect(`${origin}${next}`);
  } catch (error) {
    console.error('Auth callback unexpected error:', error);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }
}
