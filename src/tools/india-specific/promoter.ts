/**
 * Promoter Holding and Pledging Data
 * Critical metric for Indian stock analysis
 * High promoter holding (>50%) is generally positive
 * High pledging (>50%) is a major red flag
 */

import axios from 'axios';
import { rateLimiter } from '../../services/rate-limiter.js';
import { PromoterHolding } from '../../types/stock-data.js';

const NSE_BASE_URL = 'https://www.nseindia.com/api';

const NSE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.nseindia.com/'
};

/**
 * Get promoter shareholding pattern
 */
export async function getPromoterHolding(symbol: string): Promise<PromoterHolding> {
  await rateLimiter.waitForSlot('nseIndia');

  try {
    const url = `${NSE_BASE_URL}/corporate-shareholding-pattern`;

    const response = await axios.get(url, {
      headers: NSE_HEADERS,
      params: {
        symbol: symbol.toUpperCase(),
        series: 'EQ'
      },
      timeout: 15000
    });

    const data = response.data;

    // Extract latest shareholding data
    const latestData = data && data.data && data.data.length > 0 ? data.data[0] : null;

    if (!latestData) {
      throw new Error('No shareholding data available');
    }

    // Parse shareholding percentages
    const promoterPercentage = parseFloat(latestData.promoterAndPromoterGroup || 0);
    const publicPercentage = parseFloat(latestData.public || 0);
    const fiiPercentage = parseFloat(latestData.fii || 0);
    const diiPercentage = parseFloat(latestData.dii || 0);

    // Get pledging data (often in separate field)
    const pledgedPercentage = parseFloat(latestData.pledgedPercentage || latestData.promoterPledge || 0);

    return {
      promoterPercentage,
      pledgedPercentage,
      publicPercentage,
      fiiPercentage,
      diiPercentage,
      lastUpdated: new Date(latestData.date || Date.now())
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.warn('NSE Promoter API error, using fallback:', error.message);

      // Return mock data for development
      return {
        promoterPercentage: 0,
        pledgedPercentage: 0,
        publicPercentage: 0,
        fiiPercentage: 0,
        diiPercentage: 0,
        lastUpdated: new Date()
      };
    }
    throw error;
  }
}

/**
 * Analyze promoter holding quality
 */
export function analyzePromoterHolding(holding: PromoterHolding): {
  quality: 'excellent' | 'good' | 'average' | 'poor' | 'red-flag';
  score: number; // 0-100
  insights: string[];
  redFlags: string[];
} {
  const insights: string[] = [];
  const redFlags: string[] = [];
  let score = 50; // Start at neutral

  // Analyze promoter percentage
  if (holding.promoterPercentage >= 70) {
    score += 20;
    insights.push(`Very high promoter holding (${holding.promoterPercentage.toFixed(1)}%) shows strong confidence`);
  } else if (holding.promoterPercentage >= 50) {
    score += 10;
    insights.push(`Healthy promoter holding (${holding.promoterPercentage.toFixed(1)}%)`);
  } else if (holding.promoterPercentage >= 30) {
    score += 0;
    insights.push(`Moderate promoter holding (${holding.promoterPercentage.toFixed(1)}%)`);
  } else if (holding.promoterPercentage >= 15) {
    score -= 10;
    insights.push(`Low promoter holding (${holding.promoterPercentage.toFixed(1)}%) - limited skin in the game`);
  } else {
    score -= 20;
    redFlags.push(`Very low promoter holding (${holding.promoterPercentage.toFixed(1)}%) - concerning`);
  }

  // Analyze pledging - CRITICAL METRIC
  if (holding.pledgedPercentage === 0) {
    score += 20;
    insights.push('Zero promoter pledge - excellent sign of financial health');
  } else if (holding.pledgedPercentage < 10) {
    score += 10;
    insights.push(`Low promoter pledge (${holding.pledgedPercentage.toFixed(1)}%) - acceptable`);
  } else if (holding.pledgedPercentage < 25) {
    score -= 5;
    insights.push(`Moderate promoter pledge (${holding.pledgedPercentage.toFixed(1)}%) - monitor closely`);
  } else if (holding.pledgedPercentage < 50) {
    score -= 20;
    redFlags.push(`High promoter pledge (${holding.pledgedPercentage.toFixed(1)}%) - significant concern`);
  } else {
    score -= 40;
    redFlags.push(`Very high promoter pledge (${holding.pledgedPercentage.toFixed(1)}%) - MAJOR RED FLAG`);
  }

  // Analyze FII holding (foreign confidence)
  if (holding.fiiPercentage > 20) {
    score += 10;
    insights.push(`Strong FII holding (${holding.fiiPercentage.toFixed(1)}%) indicates foreign confidence`);
  } else if (holding.fiiPercentage > 10) {
    score += 5;
    insights.push(`Decent FII holding (${holding.fiiPercentage.toFixed(1)}%)`);
  } else if (holding.fiiPercentage < 2) {
    score -= 5;
    insights.push(`Low FII holding (${holding.fiiPercentage.toFixed(1)}%) - limited foreign interest`);
  }

  // Analyze DII holding (domestic institutional confidence)
  if (holding.diiPercentage > 15) {
    score += 10;
    insights.push(`Strong DII holding (${holding.diiPercentage.toFixed(1)}%) shows domestic institutional confidence`);
  } else if (holding.diiPercentage > 8) {
    score += 5;
    insights.push(`Healthy DII holding (${holding.diiPercentage.toFixed(1)}%)`);
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine quality
  let quality: 'excellent' | 'good' | 'average' | 'poor' | 'red-flag';
  if (redFlags.length > 0 && score < 40) {
    quality = 'red-flag';
  } else if (score >= 80) {
    quality = 'excellent';
  } else if (score >= 65) {
    quality = 'good';
  } else if (score >= 45) {
    quality = 'average';
  } else {
    quality = 'poor';
  }

  return {
    quality,
    score,
    insights,
    redFlags
  };
}

/**
 * Get promoter pledge trend (if multiple quarters available)
 */
export async function getPromoterPledgeTrend(symbol: string): Promise<Array<{
  date: Date;
  pledgedPercentage: number;
}>> {
  await rateLimiter.waitForSlot('nseIndia');

  try {
    const url = `${NSE_BASE_URL}/corporate-shareholding-pattern`;

    const response = await axios.get(url, {
      headers: NSE_HEADERS,
      params: {
        symbol: symbol.toUpperCase(),
        series: 'EQ'
      },
      timeout: 15000
    });

    const data = response.data;

    if (!data || !data.data || data.data.length === 0) {
      return [];
    }

    // Extract pledge data for all available quarters
    return data.data.map((quarter: any) => ({
      date: new Date(quarter.date),
      pledgedPercentage: parseFloat(quarter.pledgedPercentage || quarter.promoterPledge || 0)
    })).slice(0, 4); // Last 4 quarters
  } catch (error) {
    console.warn('Failed to fetch promoter pledge trend:', error);
    return [];
  }
}

/**
 * Check if promoter pledge is increasing (red flag)
 */
export function isPromoterPledgeIncreasing(trend: Array<{
  date: Date;
  pledgedPercentage: number;
}>): {
  isIncreasing: boolean;
  changePercentage: number;
  warning: string | null;
} {
  if (trend.length < 2) {
    return {
      isIncreasing: false,
      changePercentage: 0,
      warning: null
    };
  }

  // Sort by date (newest first)
  const sorted = [...trend].sort((a, b) => b.date.getTime() - a.date.getTime());

  const latest = sorted[0].pledgedPercentage;
  const oldest = sorted[sorted.length - 1].pledgedPercentage;

  const change = latest - oldest;
  const isIncreasing = change > 2; // More than 2% increase

  let warning: string | null = null;
  if (isIncreasing) {
    warning = `Promoter pledge increased by ${change.toFixed(1)}% over the last ${sorted.length} quarters. ` +
      `This suggests promoters are raising debt against shares, which is concerning.`;
  }

  return {
    isIncreasing,
    changePercentage: change,
    warning
  };
}
