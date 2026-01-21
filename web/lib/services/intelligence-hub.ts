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

export interface DataCollectionOptions {
  includeFundamentals?: boolean;
  includeTechnicals?: boolean;
  includeIndiaSpecific?: boolean;
  historicalDays?: number;
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
    historicalDays = 90
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
    console.log('[Intelligence Hub] Using Yahoo Finance as primary data source');

    // Collect data in parallel for maximum speed
    // Priority: Yahoo Finance -> Indian Stock API (fallback)
    const [
      priceData,
      historicalData,
      fundamentalDataFromAPI
    ] = await Promise.all([
      // Price data: Try Yahoo Finance first, fallback to Indian Stock API
      getYahooQuote(normalizedSymbol, exchange as 'NSE' | 'BSE' || 'NSE').catch(err => {
        console.warn('[Intelligence Hub] Yahoo Finance price failed, trying Indian Stock API');
        return getIndianStockQuote(normalizedSymbol, exchange as 'NSE' | 'BSE' || 'NSE');
      }),

      // Historical data: Try Yahoo Finance first, fallback to Indian Stock API
      includeTechnicals
        ? getYahooHistoricalData(normalizedSymbol, exchange as 'NSE' | 'BSE' || 'NSE', historicalDays).catch(err => {
          console.warn('[Intelligence Hub] Yahoo Finance historical failed, trying Indian Stock API');
          return getIndianHistoricalData(normalizedSymbol, exchange as 'NSE' | 'BSE' || 'NSE', historicalDays);
        })
        : Promise.resolve([]),

      // Fundamental data: Try Yahoo Finance first, fallback to Indian Stock API
      // (will be merged with screener.in data later)
      includeFundamentals
        ? getYahooFundamentals(normalizedSymbol, exchange as 'NSE' | 'BSE' || 'NSE').catch(err => {
          console.warn('[Intelligence Hub] Yahoo Finance fundamentals failed, trying Indian Stock API');
          return getIndianFundamentals(normalizedSymbol, exchange as 'NSE' | 'BSE' || 'NSE');
        })
        : Promise.resolve({})
    ]);

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

    if (includeTechnicals && historicalData.length > 0) {
      console.log(`[Intelligence Hub] Calculating technical indicators from ${historicalData.length} days of data`);
      technicals = calculateAllIndicators(historicalData);
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
    const aggregatedData: AggregatedStockData = {
      symbol: normalizedSymbol,
      market,
      exchange: exchange || 'NSE',
      timestamp: new Date(),

      price: priceData,
      fundamentals,
      technicals,
      sentiment,

      indiaSpecific,

      dataQuality: {
        priceDataAvailable: true,
        fundamentalsAvailable: Object.keys(fundamentals).length > 0,
        technicalsAvailable: includeTechnicals && historicalData.length > 0,
        sentimentAvailable: false // Will be true once news API is integrated
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
