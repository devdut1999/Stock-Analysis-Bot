import { NextRequest, NextResponse } from 'next/server';
import { collectStockData } from '../../../../lib/services/intelligence-hub';
import { evaluateSEPA } from '../../../../lib/tools/technical/minervini';
import type { PricePoint } from '../../../../lib/tools/technical/indicators';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * GET /api/screener/minervini?symbol=JSWSTEEL
 * GET /api/screener/minervini?scan=nifty50
 *
 * Returns Minervini SEPA analysis:
 * - Trend Template (8 criteria)
 * - VCP pattern detection
 * - Entry/exit recommendations
 */
export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol');
  const scan = request.nextUrl.searchParams.get('scan');

  if (!symbol && !scan) {
    return NextResponse.json({ error: 'Provide ?symbol=X or ?scan=nifty50' }, { status: 400 });
  }

  try {
    if (symbol) {
      // Single stock SEPA analysis
      const result = await analyzeSingleStock(symbol);
      return NextResponse.json(result);
    }

    // Batch scan not implemented yet
    return NextResponse.json({ error: 'Batch scan coming soon. Use ?symbol=X for now.' }, { status: 501 });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Analysis failed',
    }, { status: 500 });
  }
}

async function analyzeSingleStock(symbol: string) {
  // Need 1 year of data for 200-day SMA
  const marketData = await collectStockData(symbol, {
    includeTechnicals: true,
    includeFundamentals: false,
    includeIndiaSpecific: false,
    historicalDays: 365,
  });

  if (!marketData.historical || marketData.historical.length < 50) {
    throw new Error(`Insufficient historical data for ${symbol} (need 200+ days, got ${marketData.historical?.length ?? 0})`);
  }

  const pricePoints: PricePoint[] = marketData.historical.map((p: any) => ({
    date: new Date(p.date),
    open: p.open,
    high: p.high,
    low: p.low,
    close: p.close,
    volume: p.volume,
  }));

  const sepa = evaluateSEPA(pricePoints);

  return {
    symbol: marketData.symbol,
    currentPrice: marketData.price.currentPrice,
    sepa: {
      valid: sepa.valid,
      score: sepa.score,
      summary: sepa.summary,
      trendTemplate: {
        passes: sepa.trendTemplate.passes,
        score: sepa.trendTemplate.score,
        stage: sepa.trendTemplate.stage,
        criteria: sepa.trendTemplate.criteria,
      },
      vcp: {
        detected: sepa.vcp.detected,
        confidence: sepa.vcp.confidence,
        contractions: sepa.vcp.contractions,
        pivotPrice: sepa.vcp.pivotPrice,
        volumeDeclining: sepa.vcp.volumeDeclining,
        description: sepa.vcp.description,
      },
      entry: sepa.valid ? {
        entryPrice: sepa.entryPrice,
        stopLoss: sepa.stopLoss,
        riskPercent: sepa.riskPercent,
        targets: sepa.targets,
      } : null,
    },
  };
}
