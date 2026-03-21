import { NextRequest, NextResponse } from 'next/server';
import { upstoxAdapter } from '../../../../../lib/integrations/adapters/upstox-adapter';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');

  if (!code || !state) {
    return NextResponse.redirect(new URL('/integrations?error=missing_params', request.url));
  }

  try {
    const { userId } = JSON.parse(Buffer.from(state, 'base64url').toString());

    if (!userId) {
      return NextResponse.redirect(new URL('/integrations?error=invalid_state', request.url));
    }

    await upstoxAdapter.handleCallback(code, userId);
    return NextResponse.redirect(new URL('/integrations?connected=upstox', request.url));
  } catch (error) {
    console.error('Upstox callback error:', error);
    return NextResponse.redirect(new URL('/integrations?error=callback_failed', request.url));
  }
}
