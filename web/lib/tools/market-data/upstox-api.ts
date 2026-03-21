/**
 * Upstox API v2 — Market data functions
 * Requires user's access token from OAuth flow
 * Rate limit: 25 req/sec
 */

import { PriceData } from '../../types/stock-data';
import { rateLimiter } from '../../services/rate-limiter';

const BASE_URL = 'https://api.upstox.com/v2';

/**
 * Convert plain symbol to Upstox instrument key format
 * e.g., RELIANCE → NSE_EQ|RELIANCE
 */
export function toUpstoxInstrumentKey(symbol: string, exchange: string = 'NSE'): string {
  const cleanSymbol = symbol.replace('.NS', '').replace('.BO', '').toUpperCase();
  const prefix = exchange === 'BSE' ? 'BSE_EQ' : 'NSE_EQ';
  return `${prefix}|${cleanSymbol}`;
}

async function upstoxFetch(endpoint: string, accessToken: string): Promise<any> {
  await rateLimiter.waitForSlot('upstox');

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Upstox API error (${response.status}): ${error}`);
  }

  return response.json();
}

/**
 * Get real-time quote for a stock
 */
export async function getUpstoxQuote(
  symbol: string,
  accessToken: string,
  exchange: string = 'NSE'
): Promise<PriceData | null> {
  try {
    const instrumentKey = toUpstoxInstrumentKey(symbol, exchange);
    const data = await upstoxFetch(
      `/market-quote/quotes?instrument_key=${encodeURIComponent(instrumentKey)}`,
      accessToken
    );

    const quote = data?.data?.[instrumentKey];
    if (!quote) return null;

    const ohlc = quote.ohlc || {};
    return {
      symbol: symbol.toUpperCase(),
      currentPrice: quote.last_price || ohlc.close || 0,
      open: ohlc.open || 0,
      high: ohlc.high || 0,
      low: ohlc.low || 0,
      close: ohlc.close || 0,
      volume: quote.volume || 0,
      previousClose: quote.previous_close || ohlc.close || 0,
      change: quote.net_change || 0,
      changePercent: quote.percentage_change || 0,
      timestamp: new Date(),
      fiftyTwoWeekHigh: quote.upper_circuit_limit,
      fiftyTwoWeekLow: quote.lower_circuit_limit,
    };
  } catch (error) {
    console.error(`[Upstox] Quote error for ${symbol}:`, error);
    return null;
  }
}

/**
 * Get historical candle data
 */
export async function getUpstoxHistoricalData(
  symbol: string,
  accessToken: string,
  days: number = 90,
  exchange: string = 'NSE'
): Promise<Array<{ date: Date; open: number; high: number; low: number; close: number; volume: number }>> {
  try {
    const instrumentKey = toUpstoxInstrumentKey(symbol, exchange);
    const toDate = new Date().toISOString().split('T')[0];
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const data = await upstoxFetch(
      `/historical-candle/${encodeURIComponent(instrumentKey)}/day/${toDate}/${fromDate}`,
      accessToken
    );

    const candles = data?.data?.candles || [];

    return candles.map((c: any[]) => ({
      date: new Date(c[0]),
      open: c[1],
      high: c[2],
      low: c[3],
      close: c[4],
      volume: c[5],
    }));
  } catch (error) {
    console.error(`[Upstox] Historical data error for ${symbol}:`, error);
    return [];
  }
}

/**
 * Get option chain data for F&O analysis
 */
export async function getUpstoxOptionChain(
  symbol: string,
  accessToken: string
): Promise<{
  openInterest: number;
  putCallRatio: number;
  maxPain: number;
  expiryDates: string[];
} | null> {
  try {
    const instrumentKey = toUpstoxInstrumentKey(symbol);
    const data = await upstoxFetch(
      `/option/chain?instrument_key=${encodeURIComponent(instrumentKey)}`,
      accessToken
    );

    const chain = data?.data || [];
    if (!chain.length) return null;

    let totalCallOI = 0;
    let totalPutOI = 0;
    const expirySet = new Set<string>();

    for (const item of chain) {
      if (item.call_options?.market_data?.oi) {
        totalCallOI += item.call_options.market_data.oi;
      }
      if (item.put_options?.market_data?.oi) {
        totalPutOI += item.put_options.market_data.oi;
      }
      if (item.expiry) {
        expirySet.add(item.expiry);
      }
    }

    return {
      openInterest: totalCallOI + totalPutOI,
      putCallRatio: totalCallOI > 0 ? totalPutOI / totalCallOI : 0,
      maxPain: calculateMaxPain(chain),
      expiryDates: Array.from(expirySet).sort(),
    };
  } catch (error) {
    console.error(`[Upstox] Option chain error for ${symbol}:`, error);
    return null;
  }
}

function calculateMaxPain(chain: any[]): number {
  // Simplified max pain: strike with highest combined OI
  let maxOI = 0;
  let maxPainStrike = 0;

  for (const item of chain) {
    const callOI = item.call_options?.market_data?.oi || 0;
    const putOI = item.put_options?.market_data?.oi || 0;
    const totalOI = callOI + putOI;
    if (totalOI > maxOI) {
      maxOI = totalOI;
      maxPainStrike = item.strike_price || 0;
    }
  }

  return maxPainStrike;
}

/**
 * Get user's portfolio holdings from Upstox
 */
export async function getUpstoxHoldings(
  accessToken: string
): Promise<Array<{
  symbol: string;
  quantity: number;
  averagePrice: number;
  lastPrice: number;
  pnl: number;
}>> {
  try {
    const data = await upstoxFetch('/portfolio/long-term-holdings', accessToken);
    const holdings = data?.data || [];

    return holdings.map((h: any) => ({
      symbol: h.tradingsymbol || h.trading_symbol || '',
      quantity: h.quantity || 0,
      averagePrice: h.average_price || 0,
      lastPrice: h.last_price || 0,
      pnl: h.pnl || 0,
    }));
  } catch (error) {
    console.error('[Upstox] Holdings error:', error);
    return [];
  }
}
