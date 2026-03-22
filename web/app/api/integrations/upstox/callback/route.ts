import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';
import { upstoxAdapter } from '../../../../../lib/integrations/adapters/upstox-adapter';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const errorParam = request.nextUrl.searchParams.get('error');
  const errorDescription = request.nextUrl.searchParams.get('error_description');

  // Handle OAuth errors from Upstox
  if (errorParam) {
    console.error('Upstox OAuth error:', errorParam, errorDescription);
    return NextResponse.redirect(
      new URL(`/integrations?error=${encodeURIComponent(errorDescription || errorParam)}`, request.url)
    );
  }

  if (!code || !state) {
    console.error('Upstox callback missing params:', { code: !!code, state: !!state });
    return NextResponse.redirect(new URL('/integrations?error=missing_params', request.url));
  }

  try {
    // Verify state and exchange code for tokens
    const { userId } = await upstoxAdapter.handleCallback(code, state);

    // Verify the callback is for the currently logged-in user (if any)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user && user.id !== userId) {
      console.error('Upstox callback user mismatch:', { 
        callbackUserId: userId, 
        sessionUserId: user.id 
      });
      return NextResponse.redirect(new URL('/integrations?error=user_mismatch', request.url));
    }

    return NextResponse.redirect(new URL('/integrations?connected=upstox', request.url));
  } catch (error) {
    console.error('Upstox callback error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'callback_failed';
    const isStateError = errorMessage.includes('state') || errorMessage.includes('signature');
    
    return NextResponse.redirect(
      new URL(`/integrations?error=${isStateError ? 'invalid_state' : 'callback_failed'}`, request.url)
    );
  }
}
