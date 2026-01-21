/**
 * F&O (Futures & Options) Data Analysis
 * Put-Call Ratio, Open Interest, Max Pain analysis for Indian stocks
 */
import { FnOData } from '../../types/stock-data.js';
/**
 * Get F&O data for a stock
 */
export declare function getFnOData(symbol: string): Promise<FnOData>;
/**
 * Analyze F&O data for trading signals
 */
export declare function analyzeFnOData(fnoData: FnOData, currentPrice: number): {
    signals: string[];
    priceTargets: {
        support: number;
        resistance: number;
    };
    recommendation: string;
};
/**
 * Check if stock is in F&O segment
 */
export declare function isStockInFnO(symbol: string): Promise<boolean>;
//# sourceMappingURL=fno-data.d.ts.map