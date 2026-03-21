import { NextRequest, NextResponse } from 'next/server';
import { fetchNews, getSentimentSummary, getSectorBreakdown } from '../../../lib/skills/news-tracker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol') || undefined;
  const sector = request.nextUrl.searchParams.get('sector') || undefined;
  const minImpact = parseInt(request.nextUrl.searchParams.get('minImpact') || '1');
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '30');

  try {
    const items = await fetchNews({
      stockFilter: symbol,
      sectorFilter: sector,
      minImpact,
      limit,
    });

    const sentiment = getSentimentSummary(items);
    const sectors = getSectorBreakdown(items);

    return NextResponse.json({
      success: true,
      totalItems: items.length,
      sentiment,
      sectors,
      items,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('News fetch error:', error);
    return NextResponse.json({
      success: false,
      totalItems: 0,
      sentiment: { bullish: 0, bearish: 0, neutral: 0, overall: 'Neutral' },
      sectors: {},
      items: [],
      error: error instanceof Error ? error.message : 'Failed to fetch news',
    }, { status: 200 }); // Return 200 with empty data for graceful degradation
  }
}
