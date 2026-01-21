/**
 * Free Indian Stock Market API integration
 * GitHub: https://github.com/0xramm/Indian-Stock-Market-API
 * No API key required
 */
import { PriceData, FundamentalData } from '../../types/stock-data.js';
export interface IndianStockQuote {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    high: number;
    low: number;
    open: number;
    previousClose: number;
    marketCap?: number;
    pe?: number;
    eps?: number;
    dividendYield?: number;
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
}
/**
 * Get stock quote from Indian Stock API
 */
export declare function getIndianStockQuote(symbol: string, exchange?: 'NSE' | 'BSE'): Promise<PriceData>;
/**
 * Get historical price data for Indian stock
 */
export declare function getIndianHistoricalData(symbol: string, exchange?: 'NSE' | 'BSE', days?: number): Promise<Array<{
    date: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}>>;
/**
 * Get basic fundamental data for Indian stock
 */
export declare function getIndianFundamentals(symbol: string, exchange?: 'NSE' | 'BSE'): Promise<Partial<FundamentalData>>;
/**
 * Search for Indian stocks by name or symbol
 */
export declare function searchIndianStocks(query: string): Promise<Array<{
    symbol: string;
    name: string;
    exchange: string;
}>>;
/**
 * Get top gainers from NSE
 */
export declare function getTopGainers(limit?: number): Promise<IndianStockQuote[]>;
/**
 * Get top losers from NSE
 */
export declare function getTopLosers(limit?: number): Promise<IndianStockQuote[]>;
//# sourceMappingURL=indian-api.d.ts.map