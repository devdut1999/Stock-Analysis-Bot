/**
 * Market detection and symbol normalization service
 * Auto-detects whether a stock belongs to US or Indian markets
 */

import { Market, Exchange } from '../types/markets';

export interface DetectedMarket {
  market: Market;
  exchange?: Exchange;
  normalizedSymbol: string;
  rawSymbol: string;
}

/**
 * Detect which market a stock symbol belongs to
 */
export function detectMarket(symbol: string): DetectedMarket {
  const rawSymbol = symbol.trim().toUpperCase();

  // Check for Indian exchange suffixes
  if (rawSymbol.endsWith('.NS') || rawSymbol.endsWith('.NSE')) {
    return {
      market: 'INDIA',
      exchange: 'NSE',
      normalizedSymbol: rawSymbol.replace(/\.(NS|NSE)$/, ''),
      rawSymbol
    };
  }

  if (rawSymbol.endsWith('.BO') || rawSymbol.endsWith('.BSE')) {
    return {
      market: 'INDIA',
      exchange: 'BSE',
      normalizedSymbol: rawSymbol.replace(/\.(BO|BSE)$/, ''),
      rawSymbol
    };
  }

  // Check for explicit Indian exchange prefix patterns
  if (/^(NSE|BSE|MCX|NCDEX):/i.test(rawSymbol)) {
    const [exchange, ticker] = rawSymbol.split(':');
    return {
      market: 'INDIA',
      exchange: exchange.toUpperCase() as Exchange,
      normalizedSymbol: ticker,
      rawSymbol
    };
  }

  // List of known Indian tickers for disambiguation
  // This is a comprehensive list of major NSE/BSE stocks
  const knownIndianTickers = new Set([
    // Nifty 50
    'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN',
    'BHARTIARTL', 'ITC', 'KOTAKBANK', 'LT', 'HINDUNILVR', 'BAJFINANCE',
    'ASIANPAINT', 'MARUTI', 'TITAN', 'ULTRACEMCO', 'WIPRO', 'NESTLEIND',
    'AXISBANK', 'SUNPHARMA', 'TATASTEEL', 'TATAMOTORS', 'POWERGRID',
    'ONGC', 'NTPC', 'COALINDIA', 'INDUSINDBK', 'TECHM', 'HCLTECH',
    'MM', 'BAJAJFINSV', 'ADANIENT', 'ADANIGREEN', 'JSWSTEEL',
    // Additional popular stocks
    'HDFC', 'BAJAJ-AUTO', 'DRREDDY', 'DIVISLAB', 'CIPLA', 'EICHERMOT',
    'GRASIM', 'HEROMOTOCO', 'HINDALCO', 'BRITANNIA', 'APOLLOHOSP',
    'TATACONSUM', 'ADANIPORTS', 'BPCL', 'SBILIFE', 'HDFCLIFE',
    'DABUR', 'GODREJCP', 'MARICO', 'PIDILITIND', 'BERGEPAINT',
    'HAVELLS', 'VOLTAS', 'TRENT', 'ZOMATO', 'PAYTM', 'NYKAA',
    'DMART', 'IRCTC', 'HAL', 'BEL', 'BHEL', 'GAIL', 'IOC',
    'PNB', 'BANKBARODA', 'CANBK', 'UNIONBANK', 'IDFCFIRSTB',
    'BANDHANBNK', 'FEDERALBNK', 'RBLBANK', 'YESBANK', 'AUBANK',
    'TATAPOWER', 'ADANIPOWER', 'NTPC', 'NHPC', 'SJVN', 'TATAELXSI',
    'PERSISTENT', 'LTIM', 'MPHASIS', 'COFORGE', 'MINDTREE',
    'ZEEL', 'PVR', 'INOX', 'PVRINOX', 'SUNTV', 'NETWORK18',
    'JUBLFOOD', 'DEVYANI', 'WESTLIFE', 'TATACOMM', 'IDEA', 'VBL',
    // Common variations with special characters
    'M&M', 'L&TFH', 'M&MFIN'
  ]);

  if (knownIndianTickers.has(rawSymbol)) {
    return {
      market: 'INDIA',
      exchange: 'NSE',  // Default to NSE for known Indian stocks
      normalizedSymbol: rawSymbol,
      rawSymbol
    };
  }

  // Check for common Indian stock patterns
  // Indian stocks are typically 3-15 chars, alphanumeric, without dots
  // If it looks like an Indian stock pattern and US market isn't supported yet,
  // default to Indian market to provide better UX
  const looksLikeIndianTicker =
    rawSymbol.length >= 3 &&
    rawSymbol.length <= 15 &&
    /^[A-Z0-9&-]+$/.test(rawSymbol) &&
    !rawSymbol.includes('.');

  // Since US market isn't supported yet (Phase 7), treat ambiguous tickers as Indian
  // This provides better UX - users can try any Indian stock without knowing the exact list
  if (looksLikeIndianTicker) {
    return {
      market: 'INDIA',
      exchange: 'NSE',  // Default to NSE
      normalizedSymbol: rawSymbol,
      rawSymbol
    };
  }

  // Default to US market for standard ticker formats with dots (e.g., BRK.A, BRK.B)
  // This will show the "US market coming soon" message
  return {
    market: 'US',
    normalizedSymbol: rawSymbol,
    rawSymbol
  };
}

/**
 * Normalize symbol for specific API providers
 */
export function normalizeSymbolForAPI(
  detectedMarket: DetectedMarket,
  apiProvider: string
): string {
  const { market, normalizedSymbol, exchange } = detectedMarket;

  if (market === 'US') {
    // Most US APIs use the standard ticker format
    switch (apiProvider.toLowerCase()) {
      case 'polygon':
      case 'alphaVantage':
      case 'twelvedata':
      case 'fmp':
      default:
        return normalizedSymbol;
    }
  }

  if (market === 'INDIA') {
    switch (apiProvider.toLowerCase()) {
      case 'truedata':
        // TrueData format: RELIANCE-EQ (for equity)
        return `${normalizedSymbol}-EQ`;

      case 'breeze':
        // Breeze uses plain ticker: RELIANCE
        return normalizedSymbol;

      case 'twelvedata':
        // Twelve Data format: RELIANCE.NSE or RELIANCE.BSE
        return `${normalizedSymbol}.${exchange || 'NSE'}`;

      case 'yahoofinance':
        // Yahoo Finance format: RELIANCE.NS or RELIANCE.BO
        const suffix = exchange === 'BSE' ? 'BO' : 'NS';
        return `${normalizedSymbol}.${suffix}`;

      case 'indianapi':
        // Free Indian Stock API uses plain ticker
        return normalizedSymbol;

      case 'nseindia':
        // NSE India official website format
        return normalizedSymbol;

      default:
        return normalizedSymbol;
    }
  }

  return normalizedSymbol;
}

/**
 * Get display name for a symbol (user-friendly format)
 */
export function getDisplayName(detectedMarket: DetectedMarket): string {
  const { market, normalizedSymbol, exchange } = detectedMarket;

  if (market === 'INDIA' && exchange) {
    return `${normalizedSymbol} (${exchange})`;
  }

  return normalizedSymbol;
}

/**
 * Validate if a symbol is likely valid
 */
export function validateSymbol(symbol: string): {
  valid: boolean;
  reason?: string;
} {
  const trimmed = symbol.trim();

  if (!trimmed) {
    return { valid: false, reason: 'Symbol cannot be empty' };
  }

  if (trimmed.length > 20) {
    return { valid: false, reason: 'Symbol too long' };
  }

  // Check for invalid characters
  if (!/^[A-Za-z0-9.\-:&]+$/.test(trimmed)) {
    return { valid: false, reason: 'Symbol contains invalid characters' };
  }

  return { valid: true };
}

/**
 * Get market-specific info for logging/debugging
 */
export function getMarketInfo(detectedMarket: DetectedMarket): string {
  const { market, exchange, normalizedSymbol, rawSymbol } = detectedMarket;

  const parts = [
    `Symbol: ${rawSymbol}`,
    `Market: ${market}`,
    exchange && `Exchange: ${exchange}`,
    rawSymbol !== normalizedSymbol && `Normalized: ${normalizedSymbol}`
  ].filter(Boolean);

  return parts.join(' | ');
}
