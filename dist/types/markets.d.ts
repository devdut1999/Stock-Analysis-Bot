/**
 * Market types and configurations
 */
export type Market = 'US' | 'INDIA';
export type Exchange = 'NYSE' | 'NASDAQ' | 'AMEX' | 'NSE' | 'BSE' | 'MCX' | 'NCDEX';
export interface TradingHours {
    open: string;
    close: string;
    timezone: string;
    preMarket?: {
        open: string;
        close: string;
    };
    postMarket?: {
        open: string;
        close: string;
    };
}
export interface CircuitBreakerLimits {
    level1: number;
    level2: number;
    level3: number;
}
export interface MarketConfig {
    region: Market;
    exchanges: Exchange[];
    tradingHours: TradingHours;
    circuitBreakers: CircuitBreakerLimits;
    settlementCycle: string;
    minLotSize: number;
    currency: string;
    apis: {
        marketData: string[];
        fundamentals: string[];
        news: string[];
    };
}
export interface MarketStatus {
    isOpen: boolean;
    nextOpen?: Date;
    nextClose?: Date;
    currentPhase: 'pre-market' | 'regular' | 'post-market' | 'closed';
}
export declare const MARKET_CONFIGS: Record<Market, MarketConfig>;
//# sourceMappingURL=markets.d.ts.map