/**
 * Intelligence Hub - Central data aggregation service
 * Collects data from all sources in parallel and combines them
 */

import { detectMarket, normalizeSymbolForAPI } from './market-detector';
import { AggregatedStockData, IndiaSpecificData } from '../types/stock-data';
import {
  getIndianStockQuote,
  getIndianHistoricalData,
  getIndianFundamentals
} from '../tools/market-data/indian-api';
import {
  getYahooQuote,
  getYahooHistoricalData,
  getYahooFundamentals
} from '../tools/market-data/yahoo-finance';
import {
  getFIIDIIActivity,
  getFIIDIITrend,
  analyzeFIIDIISentiment
} from '../tools/india-specific/fii-dii';
import {
  getPromoterHolding,
  analyzePromoterHolding
} from '../tools/india-specific/promoter';
import {
  getScreenerCompanyData
} from '../tools/india-specific/screener';
import {
  getFnOData,
  analyzeFnOData,
  isStockInFnO
} from '../tools/india-specific/fno-data';
import {
  calculateAllIndicators,
  interpretTechnicalIndicators
} from '../tools/technical/indicators';
import { getUpstoxQuote, getUpstoxHistoricalData } from '../tools/market-data/upstox-api';
import { upstoxAdapter } from '../integrations/adapters/upstox-adapter';
import { getCachedData, setCachedData } from './data-cache';

export interface DataCollectionOptions {
  includeFundamentals?: boolean;
  includeTechnicals?: boolean;
  includeIndiaSpecific?: boolean;
  historicalDays?: number;
  userId?: string; // If provided, check for Upstox connection
}

/**
 * Collect all available data for a stock symbol
 */
export async function collectStockData(
  symbol: string,
  options: DataCollectionOptions = {}
): Promise<AggregatedStockData> {
  const {
    includeFundamentals = true,
    includeTechnicals = true,
    includeIndiaSpecific = true,
    historicalDays = 90,
    userId,
  } = options;

  // Detect market
  const detected = detectMarket(symbol);
  const { market, exchange, normalizedSymbol } = detected;

  console.log(`[Intelligence Hub] Collecting data for ${normalizedSymbol} (${market}${exchange ? ` - ${exchange}` : ''})`);

  // Start timestamp
  const startTime = Date.now();

  // For now, we only support Indian market (Phase 1)
  if (market !== 'INDIA') {
    throw new Error(`US market support coming in Phase 7. Currently only Indian (NSE/BSE) stocks are supported.`);
  }

  try {
    // Check if user has Upstox connected
    let upstoxToken: string | null = null;
    let dataSource: 'upstox' | 'yahoo' | 'indian-api' = 'yahoo';

    if (userId) {
      try {
        upstoxToken = await upstoxAdapter.getAccessToken(userId);
        if (upstoxToken) {
          console.log('[Intelligence Hub] Using Upstox as primary data source');
          dataSource = 'upstox';
        }
      } catch {
        // Fallback to Yahoo
      }
    }

    // Check cache first
    const cachedPrice = await getCachedData<any>(normalizedSymbol, 'quote');
    const cachedHistorical = includeTechnicals ? await getCachedData<any[]>(normalizedSymbol, 'historical') : null;

    // Collect data in parallel
    // Priority: Cache -> Upstox (if connected) -> Yahoo Finance -> Indian Stock API
    const exchangeTyped = (exchange as 'NSE' | 'BSE') || 'NSE';

    const [
      priceData,
      historicalData,
      fundamentalDataFromAPI
    ] = await Promise.all([
      // Price data
      cachedPrice
        ? cachedPrice
        : upstoxToken
          ? getUpstoxQuote(normalizedSymbol, upstoxToken, exchangeTyped).then(d => {
              if (d) setCachedData(normalizedSymbol, 'quote', d, 'upstox');
              return d;
            }).catch(() => null)
          : null,

      // Historical data
      includeTechnicals
        ? (cachedHistorical || (
            upstoxToken
              ? getUpstoxHistoricalData(normalizedSymbol, upstoxToken, historicalDays, exchangeTyped)
                  .then(d => { if (d.length) setCachedData(normalizedSymbol, 'historical', d, 'upstox'); return d; })
                  .catch(() => [])
              : Promise.resolve([])
          ))
        : Promise.resolve([]),

      // Fundamentals (Upstox doesn't provide fundamentals, always use Yahoo)
      includeFundamentals
        ? getYahooFundamentals(normalizedSymbol, exchangeTyped).catch(() => {
            return getIndianFundamentals(normalizedSymbol, exchangeTyped);
          })
        : Promise.resolve({})
    ]);

    // If Upstox didn't return price data, fall back to Yahoo -> Indian API
    let finalPriceData = priceData;
    if (!finalPriceData) {
      dataSource = 'yahoo';
      console.log('[Intelligence Hub] Falling back to Yahoo Finance');
      finalPriceData = await getYahooQuote(normalizedSymbol, exchangeTyped).catch(() => {
        dataSource = 'indian-api';
        console.warn('[Intelligence Hub] Yahoo failed, trying Indian Stock API');
        return getIndianStockQuote(normalizedSymbol, exchangeTyped);
      });
      if (finalPriceData) setCachedData(normalizedSymbol, 'quote', finalPriceData, dataSource);
    }

    // If historical data empty, fall back to Yahoo -> Indian API
    let finalHistoricalData = historicalData;
    if (includeTechnicals && (!finalHistoricalData || (Array.isArray(finalHistoricalData) && finalHistoricalData.length === 0))) {
      finalHistoricalData = await getYahooHistoricalData(normalizedSymbol, exchangeTyped, historicalDays).catch(() => {
        return getIndianHistoricalData(normalizedSymbol, exchangeTyped, historicalDays);
      });
      if (finalHistoricalData && Array.isArray(finalHistoricalData) && finalHistoricalData.length > 0) {
        setCachedData(normalizedSymbol, 'historical', finalHistoricalData, 'yahoo');
      }
    }

    // Reassign for downstream compatibility
    const priceDataFinal = finalPriceData;
    const historicalDataFinal = finalHistoricalData;

    // Start with fundamentals from API
    let fundamentals = fundamentalDataFromAPI;

    // Calculate technical indicators
    let technicals: any = {
      rsi: null,
      macd: null,
      bollingerBands: null,
      movingAverages: {},
      supportLevels: [],
      resistanceLevels: []
    };

    if (includeTechnicals && historicalDataFinal && Array.isArray(historicalDataFinal) && historicalDataFinal.length > 0) {
      console.log(`[Intelligence Hub] Calculating technical indicators from ${historicalDataFinal.length} days of data`);
      technicals = calculateAllIndicators(historicalDataFinal);
    }

    // Collect India-specific data in parallel
    let indiaSpecific: IndiaSpecificData | undefined;

    if (includeIndiaSpecific) {
      console.log('[Intelligence Hub] Collecting India-specific data (FII/DII, Promoter, F&O)');
      console.log('[Intelligence Hub] Using screener.in for promoter and fundamental data');

      const [
        fiiDiiData,
        screenerData,
        fnoData
      ] = await Promise.all([
        getFIIDIIActivity().catch(err => {
          console.warn('FII/DII data unavailable:', err.message);
          return {
            date: new Date(),
            fiiNetBuySell: 0,
            diiNetBuySell: 0,
            interpretation: 'neutral' as const
          };
        }),

        getScreenerCompanyData(normalizedSymbol).catch(err => {
          console.warn('Screener.in data unavailable:', err.message);
          // Fallback to NSE API
          return getPromoterHolding(normalizedSymbol).catch(() => {
            return {
              promoterHolding: {
                promoterPercentage: 0,
                pledgedPercentage: 0,
                publicPercentage: 0,
                fiiPercentage: 0,
                diiPercentage: 0,
                lastUpdated: new Date()
              },
              fundamentals: {}
            };
          });
        }),

        // Try to get F&O data
        getFnOData(normalizedSymbol).catch(err => {
          console.warn('F&O data unavailable:', err.message);
          return null;
        })
      ]);

      // Merge screener fundamentals with existing fundamentals
      if ('fundamentals' in screenerData && screenerData.fundamentals && Object.keys(screenerData.fundamentals).length > 0) {
        console.log('[Intelligence Hub] Merging screener.in fundamentals with existing data');
        fundamentals = {
          ...fundamentals,
          ...screenerData.fundamentals
        };
      }

      // Extract promoter holding
      const promoterHolding = 'promoterHolding' in screenerData
        ? screenerData.promoterHolding
        : screenerData;

      indiaSpecific = {
        promoterHolding,
        fiiDiiActivity: fiiDiiData,
        fnoData: fnoData || undefined,
        bulkBlockDeals: [], // TODO: Implement bulk/block deals scraping
        sebiCompliance: {
          compliant: true, // TODO: Implement SEBI compliance check
          warnings: [],
          riskLevel: 'low'
        }
      };

      console.log('[Intelligence Hub] India-specific data collected');
    }

    // For sentiment, we'll use a simplified version for now
    // Full news sentiment analysis will be added later
    const sentiment = {
      overall: 'neutral' as const,
      score: 0,
      bullishCount: 0,
      neutralCount: 0,
      bearishCount: 0,
      articles: [],
      hotTopics: []
    };

    // Assemble aggregated data
    // Format historical data for chart — must be sorted ascending, deduplicated by date
    const historical = Array.isArray(historicalDataFinal)
      ? (() => {
          const seen = new Set<string>();
          return historicalDataFinal
            .map((d: any) => ({
              date: d.date instanceof Date ? d.date.toISOString().split('T')[0] : String(d.date).split('T')[0],
              open: d.open,
              high: d.high,
              low: d.low,
              close: d.close,
              volume: d.volume,
            }))
            .filter(d => {
              if (seen.has(d.date)) return false;
              seen.add(d.date);
              return true;
            })
            .sort((a, b) => a.date.localeCompare(b.date));
        })()
      : [];

    const aggregatedData: AggregatedStockData = {
      symbol: normalizedSymbol,
      market,
      exchange: exchange || 'NSE',
      timestamp: new Date(),

      price: priceDataFinal,
      fundamentals,
      technicals,
      sentiment,
      historical,

      indiaSpecific,

      dataQuality: {
        priceDataAvailable: !!priceDataFinal,
        fundamentalsAvailable: Object.keys(fundamentals).length > 0,
        technicalsAvailable: includeTechnicals && Array.isArray(historicalDataFinal) && historicalDataFinal.length > 0,
        sentimentAvailable: false,
        dataSource,
      }
    };

    const elapsed = Date.now() - startTime;
    console.log(`[Intelligence Hub] Data collection completed in ${elapsed}ms`);

    return aggregatedData;
  } catch (error) {
    console.error('[Intelligence Hub] Error collecting data:', error);
    throw new Error(`Failed to collect stock data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a comprehensive analysis summary
 */
export function generateAnalysisSummary(data: AggregatedStockData): string {
  const lines: string[] = [];

  lines.push(`\n=== ${data.symbol} (${data.market} - ${data.exchange}) ===`);
  lines.push(`Analysis Date: ${data.timestamp.toLocaleString()}\n`);

  // Price summary
  lines.push(`Current Price: ₹${data.price.currentPrice.toFixed(2)}`);
  lines.push(`Change: ${data.price.change >= 0 ? '+' : ''}₹${data.price.change.toFixed(2)} (${data.price.changePercent.toFixed(2)}%)`);
  lines.push(`Day Range: ₹${data.price.low.toFixed(2)} - ₹${data.price.high.toFixed(2)}`);
  if (data.price.marketCap) {
    lines.push(`Market Cap: ₹${(data.price.marketCap / 10000000).toFixed(0)} Cr`);
  }
  lines.push('');

  // Technical analysis
  if (data.technicals.rsi !== null) {
    const interpretation = interpretTechnicalIndicators(data.technicals, data.price.currentPrice);
    lines.push('Technical Analysis:');
    lines.push(`  Overall Trend: ${interpretation.overallTrend.toUpperCase()} (Strength: ${interpretation.strength}%)`);

    if (data.technicals.rsi !== null) {
      lines.push(`  RSI: ${data.technicals.rsi.toFixed(1)} ${data.technicals.rsi > 70 ? '(Overbought)' : data.technicals.rsi < 30 ? '(Oversold)' : ''}`);
    }

    if (data.technicals.supportLevels.length > 0) {
      lines.push(`  Support: ₹${data.technicals.supportLevels.map(s => s.toFixed(2)).join(', ')}`);
    }

    if (data.technicals.resistanceLevels.length > 0) {
      lines.push(`  Resistance: ₹${data.technicals.resistanceLevels.map(r => r.toFixed(2)).join(', ')}`);
    }
    lines.push('');
  }

  // India-specific data
  if (data.indiaSpecific) {
    lines.push('India-Specific Metrics:');

    // Promoter holding
    const promoter = data.indiaSpecific.promoterHolding;
    if (promoter.promoterPercentage > 0) {
      const analysis = analyzePromoterHolding(promoter);
      lines.push(`  Promoter Holding: ${promoter.promoterPercentage.toFixed(1)}% (${analysis.quality.toUpperCase()})`);
      lines.push(`  Pledged Shares: ${promoter.pledgedPercentage.toFixed(1)}%${promoter.pledgedPercentage > 25 ? ' ⚠️ HIGH' : ''}`);
      lines.push(`  FII Holding: ${promoter.fiiPercentage.toFixed(1)}%`);
      lines.push(`  DII Holding: ${promoter.diiPercentage.toFixed(1)}%`);
    }

    // FII/DII activity
    const fii = data.indiaSpecific.fiiDiiActivity;
    lines.push(`  FII Activity: ${fii.interpretation.toUpperCase()} (₹${fii.fiiNetBuySell.toFixed(0)} Cr)`);
    lines.push(`  DII Activity: ₹${fii.diiNetBuySell.toFixed(0)} Cr`);

    // F&O data
    if (data.indiaSpecific.fnoData) {
      const fno = data.indiaSpecific.fnoData;
      lines.push(`  F&O Status: IN F&O SEGMENT`);
      lines.push(`  Put-Call Ratio: ${fno.putCallRatio.toFixed(2)} (${fno.interpretation.toUpperCase()})`);
      lines.push(`  Max Pain: ₹${fno.maxPain.toFixed(2)}`);
    } else {
      lines.push(`  F&O Status: NOT IN F&O SEGMENT`);
    }

    lines.push('');
  }

  // Data quality
  lines.push('Data Quality:');
  lines.push(`  Price Data: ${data.dataQuality.priceDataAvailable ? '✓' : '✗'}`);
  lines.push(`  Fundamentals: ${data.dataQuality.fundamentalsAvailable ? '✓' : '✗'}`);
  lines.push(`  Technicals: ${data.dataQuality.technicalsAvailable ? '✓' : '✗'}`);
  lines.push(`  Sentiment: ${data.dataQuality.sentimentAvailable ? '✓' : '✗ (Coming soon)'}`);

  return lines.join('\n');
}
