/**
 * Intelligence Hub - Central data aggregation service
 * Collects data from all sources in parallel and combines them
 */
import { AggregatedStockData } from '../types/stock-data.js';
export interface DataCollectionOptions {
    includeFundamentals?: boolean;
    includeTechnicals?: boolean;
    includeIndiaSpecific?: boolean;
    historicalDays?: number;
}
/**
 * Collect all available data for a stock symbol
 */
export declare function collectStockData(symbol: string, options?: DataCollectionOptions): Promise<AggregatedStockData>;
/**
 * Generate a comprehensive analysis summary
 */
export declare function generateAnalysisSummary(data: AggregatedStockData): string;
//# sourceMappingURL=intelligence-hub.d.ts.map