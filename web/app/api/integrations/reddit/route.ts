import { NextRequest, NextResponse } from 'next/server';
import { redditAdapter } from '../../../../lib/integrations/adapters/reddit-adapter';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || undefined;
  const limit = parseInt(searchParams.get('limit') || '15', 10);

  try {
    const items = await redditAdapter.fetch({
      config: {},
      symbol,
      limit,
    });

    return NextResponse.json({ items, source: 'reddit' });
  } catch (error) {
    console.error('Reddit fetch error:', error);
    return NextResponse.json({ items: [], error: 'Failed to fetch Reddit posts' }, { status: 200 });
  }
}
