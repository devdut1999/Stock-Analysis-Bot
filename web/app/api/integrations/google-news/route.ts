import { NextRequest, NextResponse } from 'next/server';
import { googleNewsAdapter } from '../../../../lib/integrations/adapters/google-news';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || undefined;
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  try {
    const items = await googleNewsAdapter.fetch({
      config: {},
      symbol,
      limit,
    });

    return NextResponse.json({ items, source: 'google_news' });
  } catch (error) {
    console.error('Google News fetch error:', error);
    return NextResponse.json({ items: [], error: 'Failed to fetch news' }, { status: 200 });
  }
}
