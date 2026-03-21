import { NextResponse } from 'next/server';
import YahooFinanceClass from 'yahoo-finance2';
import { INDIAN_STOCKS } from '../../../lib/data/indian-stocks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 300; // 5 min cache

const yahooFinance = new YahooFinanceClass();

// Use Nifty 50 stocks (first 50 in our list)
const NIFTY50_SYMBOLS = INDIAN_STOCKS.slice(0, 50).map(s => `${s.symbol}.NS`);
const STOCK_INFO_MAP = new Map(INDIAN_STOCKS.map(s => [`${s.symbol}.NS`, s]));

export async function GET() {
  try {
    // Fetch in batches of 10 to avoid rate limiting
    const batchSize = 10;
    const allResults: any[] = [];

    for (let i = 0; i < NIFTY50_SYMBOLS.length; i += batchSize) {
      const batch = NIFTY50_SYMBOLS.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(async (sym) => {
          const quote: any = await yahooFinance.quote(sym);
          const info = STOCK_INFO_MAP.get(sym);
          return {
            symbol: info?.symbol || sym.replace('.NS', ''),
            name: info?.name || sym,
            sector: info?.sector,
            price: quote.regularMarketPrice ?? 0,
            change: quote.regularMarketChange ?? 0,
            changePercent: quote.regularMarketChangePercent ?? 0,
          };
        })
      );

      allResults.push(
        ...batchResults
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
          .map(r => r.value)
          .filter(r => r.price > 0)
      );
    }

    // Sort by change percent
    const sorted = [...allResults].sort((a, b) => b.changePercent - a.changePercent);

    return NextResponse.json({
      gainers: sorted.slice(0, 5),
      losers: sorted.slice(-5).reverse(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Market movers error:', error);
    return NextResponse.json({ gainers: [], losers: [] }, { status: 200 });
  }
}
