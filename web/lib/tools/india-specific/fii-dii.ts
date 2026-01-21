/**
 * FII/DII (Foreign and Domestic Institutional Investor) tracking
 * Data source: NSE India website
 */

import axios from 'axios';
import { rateLimiter } from '../../services/rate-limiter';
import { FIIDIIData } from '../../types/stock-data';

const NSE_BASE_URL = 'https://www.nseindia.com/api';

// NSE requires specific headers to prevent blocking
const NSE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': 'https://www.nseindia.com/'
};

/**
 * Get FII/DII activity data
 * This shows net buying/selling by foreign and domestic institutions
 */
export async function getFIIDIIActivity(date?: string): Promise<FIIDIIData> {
  await rateLimiter.waitForSlot('nseIndia');

  try {
    // If no date provided, use today's date in DD-MM-YYYY format
    const targetDate = date || new Date().toLocaleDateString('en-GB').replace(/\//g, '-');

    const url = `${NSE_BASE_URL}/fiidiiTradeReact`;

    const response = await axios.get(url, {
      headers: NSE_HEADERS,
      timeout: 15000,
      params: {
        date: targetDate
      }
    });

    const data = response.data;

    // FII data (Foreign Institutional Investors)
    const fiiData = data.find((item: any) =>
      item.category === 'FII' || item.investorType === 'FII'
    );

    // DII data (Domestic Institutional Investors)
    const diiData = data.find((item: any) =>
      item.category === 'DII' || item.investorType === 'DII'
    );

    const fiiNet = fiiData ? parseFloat(fiiData.netValue || fiiData.net || 0) : 0;
    const diiNet = diiData ? parseFloat(diiData.netValue || diiData.net || 0) : 0;

    // Determine interpretation
    let interpretation: FIIDIIData['interpretation'] = 'neutral';

    if (fiiNet > 500) {
      interpretation = 'strong-buying';
    } else if (fiiNet > 100) {
      interpretation = 'buying';
    } else if (fiiNet < -500) {
      interpretation = 'strong-selling';
    } else if (fiiNet < -100) {
      interpretation = 'selling';
    }

    return {
      date: new Date(targetDate),
      fiiNetBuySell: fiiNet,
      diiNetBuySell: diiNet,
      interpretation
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // If NSE API fails, return mock data for development
      console.warn('NSE FII/DII API error, using fallback:', error.message);

      return {
        date: new Date(),
        fiiNetBuySell: 0,
        diiNetBuySell: 0,
        interpretation: 'neutral'
      };
    }
    throw error;
  }
}

/**
 * Get FII/DII historical trends (last N days)
 */
export async function getFIIDIITrend(days: number = 5): Promise<FIIDIIData[]> {
  const results: FIIDIIData[] = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) {
      continue;
    }

    const dateStr = date.toLocaleDateString('en-GB').replace(/\//g, '-');

    try {
      const data = await getFIIDIIActivity(dateStr);
      results.push(data);
    } catch (error) {
      console.warn(`Failed to fetch FII/DII for ${dateStr}:`, error);
      // Continue with other dates
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return results;
}

/**
 * Analyze FII/DII sentiment based on recent trends
 */
export function analyzeFIIDIISentiment(trendData: FIIDIIData[]): {
  overallSentiment: 'bullish' | 'neutral' | 'bearish';
  fiiTrend: 'buying' | 'selling' | 'neutral';
  diiTrend: 'buying' | 'selling' | 'neutral';
  summary: string;
} {
  if (trendData.length === 0) {
    return {
      overallSentiment: 'neutral',
      fiiTrend: 'neutral',
      diiTrend: 'neutral',
      summary: 'No FII/DII data available'
    };
  }

  // Calculate average FII and DII activity
  const avgFII = trendData.reduce((sum, d) => sum + d.fiiNetBuySell, 0) / trendData.length;
  const avgDII = trendData.reduce((sum, d) => sum + d.diiNetBuySell, 0) / trendData.length;

  // Determine trends
  const fiiTrend = avgFII > 100 ? 'buying' : avgFII < -100 ? 'selling' : 'neutral';
  const diiTrend = avgDII > 100 ? 'buying' : avgDII < -100 ? 'selling' : 'neutral';

  // Overall sentiment (FII has more weight as they're considered smart money)
  let overallSentiment: 'bullish' | 'neutral' | 'bearish' = 'neutral';

  if (fiiTrend === 'buying' && diiTrend !== 'selling') {
    overallSentiment = 'bullish';
  } else if (fiiTrend === 'selling' && diiTrend !== 'buying') {
    overallSentiment = 'bearish';
  } else if (fiiTrend === 'buying' && diiTrend === 'buying') {
    overallSentiment = 'bullish';
  }

  // Generate summary
  const summary = `Over the last ${trendData.length} trading days: ` +
    `FII ${fiiTrend === 'buying' ? 'accumulated' : fiiTrend === 'selling' ? 'distributed' : 'showed neutral activity'} ` +
    `(₹${avgFII.toFixed(0)} cr avg), ` +
    `DII ${diiTrend === 'buying' ? 'accumulated' : diiTrend === 'selling' ? 'distributed' : 'showed neutral activity'} ` +
    `(₹${avgDII.toFixed(0)} cr avg). ` +
    `Overall sentiment: ${overallSentiment}.`;

  return {
    overallSentiment,
    fiiTrend,
    diiTrend,
    summary
  };
}
