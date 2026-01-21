import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const type = searchParams.get('type') || 'quick';

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol is required' },
      { status: 400 }
    );
  }

  // For now, return a mock response
  // In production, this would call the actual analysis functions
  return NextResponse.json({
    symbol: symbol.toUpperCase(),
    market: symbol.includes('.NS') || symbol.includes('.BO') ? 'INDIA' : 'US',
    timestamp: new Date().toISOString(),
    type,
    message: 'This is a demo response. To enable full analysis, configure ANTHROPIC_API_KEY in Vercel environment variables.',
    note: 'The backend analysis functions are available in the parent directory.',
    price: {
      currentPrice: 1394.00,
      change: -19.60,
      changePercent: -1.39,
      high: 1416.00,
      low: 1390.00,
      volume: 13186044,
      previousClose: 1413.60,
      marketCap: 1886496000000,
      fiftyTwoWeekHigh: 1611.80,
      fiftyTwoWeekLow: 1114.85
    },
    fundamentals: {
      peRatio: 22.67,
      priceToBook: 2.15,
      debtToEquity: 35.65,
      roe: 12.5,
      dividendYield: 0.39
    },
    technicals: {
      rsi: 23.5,
      macd: {
        value: -31.74,
        signal: -18.12,
        histogram: -13.61
      },
      movingAverages: {
        sma20: 1507.71,
        sma50: 1529.22,
        ema12: 1465.09,
        ema26: 1496.83
      }
    },
    indiaSpecific: {
      promoterHolding: {
        promoterPercentage: 50.0,
        pledgedPercentage: 0.0,
        publicPercentage: 50.0,
        fiiPercentage: 15.5,
        diiPercentage: 12.3,
        lastUpdated: new Date().toISOString()
      }
    },
    dataQuality: {
      priceDataAvailable: true,
      fundamentalsAvailable: true,
      technicalsAvailable: true,
      sentimentAvailable: false
    }
  });
}
