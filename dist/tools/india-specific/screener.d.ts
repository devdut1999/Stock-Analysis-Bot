/**
 * Screener.in Data Scraper
 * Fetches comprehensive Indian stock data from screener.in
 * Includes: Promoter holding, FII/DII, fundamentals, financial metrics
 */
import { PromoterHolding, FundamentalData } from '../../types/stock-data.js';
/**
 * Get promoter holding and shareholding pattern from screener.in
 */
export declare function getScreenerPromoterData(symbol: string): Promise<PromoterHolding>;
/**
 * Get fundamental data from screener.in
 */
export declare function getScreenerFundamentals(symbol: string): Promise<Partial<FundamentalData>>;
/**
 * Get comprehensive company data from screener.in
 */
export declare function getScreenerCompanyData(symbol: string): Promise<{
    promoterHolding: PromoterHolding;
    fundamentals: Partial<FundamentalData>;
}>;
//# sourceMappingURL=screener.d.ts.map