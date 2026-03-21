import { NextRequest, NextResponse } from 'next/server';
import { fetchAllNews, getAvailableSources } from '../../../lib/services/news-aggregator';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || '';
  const limit = parseInt(searchParams.get('limit') || '25', 10);
  const sourcesParam = searchParams.get('sources'); // comma-separated: "rss,reddit"

  const sources = sourcesParam ? sourcesParam.split(',').map(s => s.trim()) : undefined;

  try {
    const result = await fetchAllNews(symbol, { limit, sources });
    return NextResponse.json(result);
  } catch (error) {
    console.error('News feed error:', error);
    return NextResponse.json({
      items: [],
      sources: getAvailableSources().map(s => s.name),
      sentiment: { bullish: 0, bearish: 0, neutral: 0, overall: 'Neutral' },
    });
  }
}
