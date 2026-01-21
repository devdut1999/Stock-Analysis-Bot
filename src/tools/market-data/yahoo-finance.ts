/**
 * Yahoo Finance API Integration
 * Free, unofficial API for stock market data
 * Supports both US and Indian markets
 */

import YahooFinanceClass from 'yahoo-finance2';
import { rateLimiter } from '../../services/rate-limiter.js';
import { PriceData, FundamentalData } from '../../types/stock-data.js';

// Create Yahoo Finance instance
const yahooFinance = new YahooFinanceClass();

/**
 * Convert symbol to Yahoo Finance format
 */
function toYahooSymbol(symbol: string, exchange?: 'NSE' | 'BSE'): string {
  // If already has suffix, return as is
  if (symbol.includes('.')) {
    return symbol;
  }

  // Add appropriate suffix for Indian stocks
  if (exchange === 'BSE') {
    return `${symbol}.BO`;
  } else if (exchange === 'NSE' || exchange) {
    return `${symbol}.NS`;
  }

  // Default: assume NSE for Indian stocks
  return `${symbol}.NS`;
}

/**
 * Get real-time stock quote from Yahoo Finance
 */
export async function getYahooQuote(
  symbol: string,
  exchange?: 'NSE' | 'BSE'
): Promise<PriceData> {
  await rateLimiter.waitForSlot('yahooFinance');

  try {
    const yahooSymbol = toYahooSymbol(symbol, exchange);

    const quote: any = await yahooFinance.quote(yahooSymbol, {
      fields: [
        'symbol',
        'regularMarketPrice',
        'regularMarketOpen',
        'regularMarketDayHigh',
        'regularMarketDayLow',
        'regularMarketPreviousClose',
        'regularMarketVolume',
        'regularMarketChange',
        'regularMarketChangePercent',
        'marketCap',
        'fiftyTwoWeekHigh',
        'fiftyTwoWeekLow'
      ]
    });

    return {
      symbol: symbol.toUpperCase(),
      currentPrice: quote.regularMarketPrice || 0,
      open: quote.regularMarketOpen || 0,
      high: quote.regularMarketDayHigh || 0,
      low: quote.regularMarketDayLow || 0,
      close: quote.regularMarketPrice || 0,
      volume: quote.regularMarketVolume || 0,
      previousClose: quote.regularMarketPreviousClose || 0,
      change: quote.regularMarketChange || 0,
      changePercent: quote.regularMarketChangePercent || 0,
      timestamp: new Date(),
      marketCap: quote.marketCap,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow
    };
  } catch (error) {
    if (error instanceof Error) {
      console.warn(`[Yahoo Finance] Failed to fetch quote for ${symbol}: ${error.message}`);
    }
    throw new Error(`Yahoo Finance: Unable to fetch quote for ${symbol}`);
  }
}

/**
 * Get historical price data from Yahoo Finance
 */
export async function getYahooHistoricalData(
  symbol: string,
  exchange?: 'NSE' | 'BSE',
  days: number = 90
): Promise<Array<{
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}>> {
  await rateLimiter.waitForSlot('yahooFinance');

  try {
    const yahooSymbol = toYahooSymbol(symbol, exchange);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result: any = await yahooFinance.historical(yahooSymbol, {
      period1: startDate,
      period2: endDate,
      interval: '1d'
    });

    return result.map((candle: any) => ({
      date: candle.date,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume
    }));
  } catch (error) {
    if (error instanceof Error) {
      console.warn(`[Yahoo Finance] Failed to fetch historical data for ${symbol}: ${error.message}`);
    }
    throw new Error(`Yahoo Finance: Unable to fetch historical data for ${symbol}`);
  }
}

/**
 * Get fundamental data from Yahoo Finance
 */
export async function getYahooFundamentals(
  symbol: string,
  exchange?: 'NSE' | 'BSE'
): Promise<Partial<FundamentalData>> {
  await rateLimiter.waitForSlot('yahooFinance');

  try {
    const yahooSymbol = toYahooSymbol(symbol, exchange);

    const quoteSummary: any = await yahooFinance.quoteSummary(yahooSymbol, {
      modules: ['defaultKeyStatistics', 'financialData', 'summaryDetail']
    });

    const keyStats = quoteSummary.defaultKeyStatistics;
    const financialData = quoteSummary.financialData;
    const summaryDetail = quoteSummary.summaryDetail;

    return {
      peRatio: summaryDetail?.trailingPE,
      pegRatio: keyStats?.pegRatio,
      priceToBook: keyStats?.priceToBook,
      debtToEquity: financialData?.debtToEquity,
      roe: financialData?.returnOnEquity ? financialData.returnOnEquity * 100 : undefined,
      earningsPerShare: keyStats?.trailingEps,
      dividendYield: summaryDetail?.dividendYield ? summaryDetail.dividendYield * 100 : undefined,
      revenueGrowth: financialData?.revenueGrowth ? financialData.revenueGrowth * 100 : undefined,
      profitMargin: financialData?.profitMargins ? financialData.profitMargins * 100 : undefined,
      operatingMargin: financialData?.operatingMargins ? financialData.operatingMargins * 100 : undefined,
      quickRatio: financialData?.quickRatio,
      currentRatio: financialData?.currentRatio
    };
  } catch (error) {
    if (error instanceof Error) {
      console.warn(`[Yahoo Finance] Failed to fetch fundamentals for ${symbol}: ${error.message}`);
    }
    // Return empty object on error (fundamentals are optional)
    return {};
  }
}

/**
 * Search for stocks by name or symbol
 */
export async function searchYahooStocks(query: string): Promise<Array<{
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}>> {
  await rateLimiter.waitForSlot('yahooFinance');

  try {
    const result: any = await yahooFinance.search(query);

    return result.quotes.map((quote: any) => ({
      symbol: quote.symbol,
      name: quote.shortname || quote.longname || '',
      exchange: quote.exchange || '',
      type: quote.quoteType || ''
    }));
  } catch (error) {
    if (error instanceof Error) {
      console.warn(`[Yahoo Finance] Search failed for "${query}": ${error.message}`);
    }
    return [];
  }
}

/**
 * Get options chain data (for US stocks and some Indian F&O stocks)
 */
export async function getYahooOptionsChain(
  symbol: string,
  exchange?: 'NSE' | 'BSE'
): Promise<any> {
  await rateLimiter.waitForSlot('yahooFinance');

  try {
    const yahooSymbol = toYahooSymbol(symbol, exchange);

    const options: any = await yahooFinance.options(yahooSymbol);

    return {
      expirationDates: options.expirationDates || [],
      strikes: options.strikes || [],
      calls: options.calls || [],
      puts: options.puts || []
    };
  } catch (error) {
    if (error instanceof Error) {
      console.warn(`[Yahoo Finance] Options data unavailable for ${symbol}: ${error.message}`);
    }
    throw new Error(`Yahoo Finance: Options data not available for ${symbol}`);
  }
}
