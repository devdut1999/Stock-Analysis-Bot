import { NextResponse } from 'next/server';
import YahooFinanceClass from 'yahoo-finance2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 300; // 5 min cache

const yahooFinance = new YahooFinanceClass();

const INDICES = [
  { symbol: '^NSEI', name: 'Nifty 50' },
  { symbol: '^BSESN', name: 'Sensex' },
  { symbol: '^NSEBANK', name: 'Bank Nifty' },
];

export async function GET() {
  try {
    const results = await Promise.allSettled(
      INDICES.map(async (idx) => {
        const quote: any = await yahooFinance.quote(idx.symbol);
        return {
          symbol: idx.symbol,
          name: idx.name,
          price: quote.regularMarketPrice ?? 0,
          change: quote.regularMarketChange ?? 0,
          changePercent: quote.regularMarketChangePercent ?? 0,
        };
      })
    );

    const indices = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => r.value);

    return NextResponse.json({ indices });
  } catch (error) {
    console.error('Market overview error:', error);
    return NextResponse.json({ indices: [] }, { status: 200 });
  }
}
