/**
 * Market detection and symbol normalization service
 * Auto-detects whether a stock belongs to US or Indian markets
 */
import { Market, Exchange } from '../types/markets.js';
export interface DetectedMarket {
    market: Market;
    exchange?: Exchange;
    normalizedSymbol: string;
    rawSymbol: string;
}
/**
 * Detect which market a stock symbol belongs to
 */
export declare function detectMarket(symbol: string): DetectedMarket;
/**
 * Normalize symbol for specific API providers
 */
export declare function normalizeSymbolForAPI(detectedMarket: DetectedMarket, apiProvider: string): string;
/**
 * Get display name for a symbol (user-friendly format)
 */
export declare function getDisplayName(detectedMarket: DetectedMarket): string;
/**
 * Validate if a symbol is likely valid
 */
export declare function validateSymbol(symbol: string): {
    valid: boolean;
    reason?: string;
};
/**
 * Get market-specific info for logging/debugging
 */
export declare function getMarketInfo(detectedMarket: DetectedMarket): string;
//# sourceMappingURL=market-detector.d.ts.map