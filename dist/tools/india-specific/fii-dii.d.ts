/**
 * FII/DII (Foreign and Domestic Institutional Investor) tracking
 * Data source: NSE India website
 */
import { FIIDIIData } from '../../types/stock-data.js';
/**
 * Get FII/DII activity data
 * This shows net buying/selling by foreign and domestic institutions
 */
export declare function getFIIDIIActivity(date?: string): Promise<FIIDIIData>;
/**
 * Get FII/DII historical trends (last N days)
 */
export declare function getFIIDIITrend(days?: number): Promise<FIIDIIData[]>;
/**
 * Analyze FII/DII sentiment based on recent trends
 */
export declare function analyzeFIIDIISentiment(trendData: FIIDIIData[]): {
    overallSentiment: 'bullish' | 'neutral' | 'bearish';
    fiiTrend: 'buying' | 'selling' | 'neutral';
    diiTrend: 'buying' | 'selling' | 'neutral';
    summary: string;
};
//# sourceMappingURL=fii-dii.d.ts.map