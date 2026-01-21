/**
 * Yahoo Finance API Integration
 * Free, unofficial API for stock market data
 * Supports both US and Indian markets
 */
import { PriceData, FundamentalData } from '../../types/stock-data.js';
/**
 * Get real-time stock quote from Yahoo Finance
 */
export declare function getYahooQuote(symbol: string, exchange?: 'NSE' | 'BSE'): Promise<PriceData>;
/**
 * Get historical price data from Yahoo Finance
 */
export declare function getYahooHistoricalData(symbol: string, exchange?: 'NSE' | 'BSE', days?: number): Promise<Array<{
    date: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}>>;
/**
 * Get fundamental data from Yahoo Finance
 */
export declare function getYahooFundamentals(symbol: string, exchange?: 'NSE' | 'BSE'): Promise<Partial<FundamentalData>>;
/**
 * Search for stocks by name or symbol
 */
export declare function searchYahooStocks(query: string): Promise<Array<{
    symbol: string;
    name: string;
    exchange: string;
    type: string;
}>>;
/**
 * Get options chain data (for US stocks and some Indian F&O stocks)
 */
export declare function getYahooOptionsChain(symbol: string, exchange?: 'NSE' | 'BSE'): Promise<any>;
//# sourceMappingURL=yahoo-finance.d.ts.map