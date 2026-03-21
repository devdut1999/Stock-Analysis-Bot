import { NextRequest, NextResponse } from 'next/server';
import YahooFinanceClass from 'yahoo-finance2';
import { analyzeVCP, PriceBar } from '../../../../lib/skills/vcp-screener';
import { INDIAN_STOCKS } from '../../../../lib/data/indian-stocks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const yahooFinance = new YahooFinanceClass();

// Default: scan Nifty 50
const DEFAULT_SYMBOLS = INDIAN_STOCKS.slice(0, 50).map(s => s.symbol);

export async function GET(request: NextRequest) {
  const symbolsParam = request.nextUrl.searchParams.get('symbols');
  const symbols = symbolsParam ? symbolsParam.split(',') : DEFAULT_SYMBOLS;
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');

  try {
    const results: any[] = [];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 365); // 1 year of data

    // Process in batches of 5
    for (let i = 0; i < symbols.length; i += 5) {
      const batch = symbols.slice(i, i + 5);
      const batchResults = await Promise.allSettled(
        batch.map(async (symbol) => {
          const yahooSymbol = `${symbol}.NS`;
          const historical: any[] = await yahooFinance.historical(yahooSymbol, {
            period1: startDate,
            period2: endDate,
            interval: '1d',
          });

          if (historical.length < 200) return null;

          const bars: PriceBar[] = historical.map((h: any) => ({
            date: h.date?.toISOString?.() || '',
            open: h.open ?? 0,
            high: h.high ?? 0,
            low: h.low ?? 0,
            close: h.close ?? 0,
            volume: h.volume ?? 0,
          }));

          const analysis = analyzeVCP(bars);
          const stockInfo = INDIAN_STOCKS.find(s => s.symbol === symbol);

          return {
            symbol,
            name: stockInfo?.name || symbol,
            sector: stockInfo?.sector,
            currentPrice: bars[bars.length - 1].close,
            ...analysis,
          };
        })
      );

      results.push(
        ...batchResults
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
          .map(r => r.value)
      );
    }

    // Sort by composite score descending, filter to VCP candidates
    const sorted = results
      .sort((a, b) => b.compositeScore - a.compositeScore)
      .slice(0, limit);

    const vcpCandidates = sorted.filter(r => r.vcp?.isVcp);

    return NextResponse.json({
      success: true,
      totalScanned: symbols.length,
      vcpCandidates: vcpCandidates.length,
      results: sorted,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('VCP screener error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Screener failed',
      results: [],
    }, { status: 200 });
  }
}
