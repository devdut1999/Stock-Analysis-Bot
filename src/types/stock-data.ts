/**
 * Stock data types
 */

import { Market } from './markets.js';

export interface PriceData {
  symbol: string;
  currentPrice: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  previousClose: number;
  change: number;
  changePercent: number;
  timestamp: Date;
  marketCap?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
}

export interface TechnicalIndicators {
  rsi: number | null;
  macd: {
    value: number;
    signal: number;
    histogram: number;
  } | null;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  } | null;
  movingAverages: {
    sma20?: number;
    sma50?: number;
    sma200?: number;
    ema12?: number;
    ema26?: number;
  };
  supportLevels: number[];
  resistanceLevels: number[];
  fibonacci?: {
    level236: number;
    level382: number;
    level500: number;
    level618: number;
  };
}

export interface FundamentalData {
  peRatio?: number;
  pegRatio?: number;
  priceToBook?: number;
  debtToEquity?: number;
  roe?: number;  // Return on Equity
  roce?: number; // Return on Capital Employed
  earningsPerShare?: number;
  dividendYield?: number;
  revenueGrowth?: number;
  profitMargin?: number;
  operatingMargin?: number;
  quickRatio?: number;
  currentRatio?: number;
}

export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedAt: Date;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;  // -1 to +1
  relevance: number;  // 0 to 1
  summary?: string;
}

export interface SentimentData {
  overall: 'positive' | 'neutral' | 'negative';
  score: number;  // -1 to +1
  bullishCount: number;
  neutralCount: number;
  bearishCount: number;
  articles: NewsArticle[];
  hotTopics: Array<{
    topic: string;
    articleCount: number;
    averageRelevance: number;
  }>;
}

// India-specific data structures
export interface PromoterHolding {
  promoterPercentage: number;
  pledgedPercentage: number;
  publicPercentage: number;
  fiiPercentage: number;
  diiPercentage: number;
  lastUpdated: Date;
}

export interface FIIDIIData {
  date: Date;
  fiiNetBuySell: number;  // In crores (INR)
  diiNetBuySell: number;
  interpretation: 'strong-buying' | 'buying' | 'neutral' | 'selling' | 'strong-selling';
}

export interface FnOData {
  openInterest: number;
  openInterestChange: number;
  putCallRatio: number;
  maxPain: number;
  impliedVolatility: number;
  interpretation: 'bullish' | 'neutral' | 'bearish';
}

export interface BulkBlockDeal {
  date: Date;
  clientName: string;
  dealType: 'bulk' | 'block';
  quantity: number;
  price: number;
  transactionType: 'buy' | 'sell';
}

export interface IndiaSpecificData {
  promoterHolding: PromoterHolding;
  fiiDiiActivity: FIIDIIData;
  fnoData?: FnOData;
  bulkBlockDeals: BulkBlockDeal[];
  sebiCompliance: {
    compliant: boolean;
    warnings: string[];
    riskLevel: 'low' | 'medium' | 'high';
  };
}

// Aggregated data from all sources
export interface AggregatedStockData {
  symbol: string;
  market: Market;
  exchange: string;
  timestamp: Date;

  // Core data
  price: PriceData;
  fundamentals: FundamentalData;
  technicals: TechnicalIndicators;
  sentiment: SentimentData;

  // Market-specific
  indiaSpecific?: IndiaSpecificData;

  // Historical price data for pattern detection (VCP, SEPA)
  historicalPrices?: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;

  // Metadata
  dataQuality: {
    priceDataAvailable: boolean;
    fundamentalsAvailable: boolean;
    technicalsAvailable: boolean;
    sentimentAvailable: boolean;
  };
}
