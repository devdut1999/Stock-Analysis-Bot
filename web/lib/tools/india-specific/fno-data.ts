/**
 * F&O (Futures & Options) Data Analysis
 * Put-Call Ratio, Open Interest, Max Pain analysis for Indian stocks
 */

import axios from 'axios';
import { rateLimiter } from '../../services/rate-limiter';
import { FnOData } from '../../types/stock-data';

const NSE_BASE_URL = 'https://www.nseindia.com/api';

const NSE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.nseindia.com/'
};

/**
 * Get F&O data for a stock
 */
export async function getFnOData(symbol: string): Promise<FnOData> {
  await rateLimiter.waitForSlot('nseIndia');

  try {
    const url = `${NSE_BASE_URL}/option-chain-equities`;

    const response = await axios.get(url, {
      headers: NSE_HEADERS,
      params: {
        symbol: symbol.toUpperCase()
      },
      timeout: 15000
    });

    const data = response.data;

    if (!data || !data.records || !data.records.data) {
      throw new Error('No F&O data available - stock may not be in F&O segment');
    }

    const records = data.records.data;

    // Calculate Put-Call Ratio (PCR)
    let totalCallOI = 0;
    let totalPutOI = 0;
    let totalCallVolume = 0;
    let totalPutVolume = 0;

    // Track strike prices and their open interest for max pain calculation
    const strikePainMap: Map<number, number> = new Map();

    records.forEach((record: any) => {
      const strike = parseFloat(record.strikePrice);

      // Call data
      if (record.CE) {
        const callOI = parseFloat(record.CE.openInterest || 0);
        const callVolume = parseFloat(record.CE.totalTradedVolume || 0);
        totalCallOI += callOI;
        totalCallVolume += callVolume;

        // Add to pain calculation (calls lose money below strike)
        strikePainMap.set(strike, (strikePainMap.get(strike) || 0) + callOI);
      }

      // Put data
      if (record.PE) {
        const putOI = parseFloat(record.PE.openInterest || 0);
        const putVolume = parseFloat(record.PE.totalTradedVolume || 0);
        totalPutOI += putOI;
        totalPutVolume += putVolume;

        // Add to pain calculation (puts lose money above strike)
        strikePainMap.set(strike, (strikePainMap.get(strike) || 0) + putOI);
      }
    });

    // Calculate Put-Call Ratio (higher = more bearish, lower = more bullish)
    const putCallRatio = totalCallOI > 0 ? totalPutOI / totalCallOI : 0;

    // Calculate Max Pain (strike where most options expire worthless)
    const maxPain = calculateMaxPain(records, data.records.underlyingValue || 0);

    // Total Open Interest
    const openInterest = totalCallOI + totalPutOI;

    // Open Interest Change (would need historical data, using volume as proxy)
    const oiChange = totalCallVolume + totalPutVolume;

    // Implied Volatility (average IV from ATM options)
    const impliedVolatility = calculateAverageIV(records, data.records.underlyingValue || 0);

    // Interpretation
    let interpretation: FnOData['interpretation'] = 'neutral';

    if (putCallRatio > 1.5) {
      interpretation = 'bullish'; // More puts = bullish (market expects support)
    } else if (putCallRatio < 0.7) {
      interpretation = 'bearish'; // More calls = bearish (market expects resistance)
    }

    return {
      openInterest,
      openInterestChange: oiChange,
      putCallRatio,
      maxPain,
      impliedVolatility,
      interpretation
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Stock may not be in F&O segment
      console.warn('F&O data not available:', error.message);

      return {
        openInterest: 0,
        openInterestChange: 0,
        putCallRatio: 1,
        maxPain: 0,
        impliedVolatility: 0,
        interpretation: 'neutral'
      };
    }
    throw error;
  }
}

/**
 * Calculate Max Pain (strike price where most options expire worthless)
 */
function calculateMaxPain(records: any[], currentPrice: number): number {
  const strikes: number[] = [];
  const painMap: Map<number, number> = new Map();

  // Get all strike prices
  records.forEach((record: any) => {
    const strike = parseFloat(record.strikePrice);
    if (!strikes.includes(strike)) {
      strikes.push(strike);
    }
  });

  strikes.sort((a, b) => a - b);

  // For each strike, calculate total pain (loss for option holders)
  strikes.forEach((testStrike) => {
    let totalPain = 0;

    records.forEach((record: any) => {
      const strike = parseFloat(record.strikePrice);

      // Call pain (if current price > strike, call holders profit)
      if (record.CE) {
        const callOI = parseFloat(record.CE.openInterest || 0);
        if (testStrike > strike) {
          totalPain += callOI * (testStrike - strike);
        }
      }

      // Put pain (if current price < strike, put holders profit)
      if (record.PE) {
        const putOI = parseFloat(record.PE.openInterest || 0);
        if (testStrike < strike) {
          totalPain += putOI * (strike - testStrike);
        }
      }
    });

    painMap.set(testStrike, totalPain);
  });

  // Find strike with maximum pain
  let maxPainStrike = currentPrice;
  let maxPainValue = 0;

  painMap.forEach((pain, strike) => {
    if (pain > maxPainValue) {
      maxPainValue = pain;
      maxPainStrike = strike;
    }
  });

  return maxPainStrike;
}

/**
 * Calculate average implied volatility from ATM options
 */
function calculateAverageIV(records: any[], currentPrice: number): number {
  // Find ATM strike (closest to current price)
  let atmStrike = 0;
  let minDiff = Infinity;

  records.forEach((record: any) => {
    const strike = parseFloat(record.strikePrice);
    const diff = Math.abs(strike - currentPrice);

    if (diff < minDiff) {
      minDiff = diff;
      atmStrike = strike;
    }
  });

  // Get IV from ATM options
  const atmRecord = records.find((r: any) => parseFloat(r.strikePrice) === atmStrike);

  if (!atmRecord) return 0;

  const callIV = atmRecord.CE ? parseFloat(atmRecord.CE.impliedVolatility || 0) : 0;
  const putIV = atmRecord.PE ? parseFloat(atmRecord.PE.impliedVolatility || 0) : 0;

  return (callIV + putIV) / 2;
}

/**
 * Analyze F&O data for trading signals
 */
export function analyzeFnOData(fnoData: FnOData, currentPrice: number): {
  signals: string[];
  priceTargets: {
    support: number;
    resistance: number;
  };
  recommendation: string;
} {
  const signals: string[] = [];

  // PCR analysis
  if (fnoData.putCallRatio > 1.5) {
    signals.push(`High Put-Call Ratio (${fnoData.putCallRatio.toFixed(2)}) suggests strong PUT writing, indicating bullish sentiment`);
  } else if (fnoData.putCallRatio < 0.7) {
    signals.push(`Low Put-Call Ratio (${fnoData.putCallRatio.toFixed(2)}) suggests strong CALL writing, indicating bearish sentiment`);
  } else {
    signals.push(`Neutral Put-Call Ratio (${fnoData.putCallRatio.toFixed(2)})`);
  }

  // Max Pain analysis
  const maxPainDiff = ((fnoData.maxPain - currentPrice) / currentPrice) * 100;

  if (Math.abs(maxPainDiff) > 2) {
    if (maxPainDiff > 0) {
      signals.push(`Max Pain at ₹${fnoData.maxPain.toFixed(2)} (${maxPainDiff.toFixed(1)}% above current), suggesting upward pressure`);
    } else {
      signals.push(`Max Pain at ₹${fnoData.maxPain.toFixed(2)} (${Math.abs(maxPainDiff).toFixed(1)}% below current), suggesting downward pressure`);
    }
  } else {
    signals.push(`Max Pain at ₹${fnoData.maxPain.toFixed(2)}, close to current price`);
  }

  // Open Interest analysis
  if (fnoData.openInterestChange > fnoData.openInterest * 0.1) {
    signals.push('High OI buildup indicates strong directional move expected');
  }

  // IV analysis
  if (fnoData.impliedVolatility > 40) {
    signals.push(`High IV (${fnoData.impliedVolatility.toFixed(1)}%) suggests increased volatility expected`);
  } else if (fnoData.impliedVolatility < 15) {
    signals.push(`Low IV (${fnoData.impliedVolatility.toFixed(1)}%) suggests low volatility expected`);
  }

  // Price targets
  const support = fnoData.maxPain * 0.98;  // 2% below max pain
  const resistance = fnoData.maxPain * 1.02; // 2% above max pain

  // Recommendation
  let recommendation = 'Hold and monitor F&O buildup';

  if (fnoData.interpretation === 'bullish' && maxPainDiff > 0) {
    recommendation = 'F&O data suggests bullish setup - consider buying near support levels';
  } else if (fnoData.interpretation === 'bearish' && maxPainDiff < 0) {
    recommendation = 'F&O data suggests bearish setup - consider selling near resistance levels';
  }

  return {
    signals,
    priceTargets: {
      support,
      resistance
    },
    recommendation
  };
}

/**
 * Check if stock is in F&O segment
 */
export async function isStockInFnO(symbol: string): Promise<boolean> {
  try {
    await getFnOData(symbol);
    return true;
  } catch (error) {
    return false;
  }
}
