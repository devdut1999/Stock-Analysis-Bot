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
    roe?: number;
    roce?: number;
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
    sentimentScore: number;
    relevance: number;
    summary?: string;
}
export interface SentimentData {
    overall: 'positive' | 'neutral' | 'negative';
    score: number;
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
    fiiNetBuySell: number;
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
export interface AggregatedStockData {
    symbol: string;
    market: Market;
    exchange: string;
    timestamp: Date;
    price: PriceData;
    fundamentals: FundamentalData;
    technicals: TechnicalIndicators;
    sentiment: SentimentData;
    indiaSpecific?: IndiaSpecificData;
    dataQuality: {
        priceDataAvailable: boolean;
        fundamentalsAvailable: boolean;
        technicalsAvailable: boolean;
        sentimentAvailable: boolean;
    };
}
//# sourceMappingURL=stock-data.d.ts.map