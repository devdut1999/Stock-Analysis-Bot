/**
 * Promoter Holding and Pledging Data
 * Critical metric for Indian stock analysis
 * High promoter holding (>50%) is generally positive
 * High pledging (>50%) is a major red flag
 */
import { PromoterHolding } from '../../types/stock-data.js';
/**
 * Get promoter shareholding pattern
 */
export declare function getPromoterHolding(symbol: string): Promise<PromoterHolding>;
/**
 * Analyze promoter holding quality
 */
export declare function analyzePromoterHolding(holding: PromoterHolding): {
    quality: 'excellent' | 'good' | 'average' | 'poor' | 'red-flag';
    score: number;
    insights: string[];
    redFlags: string[];
};
/**
 * Get promoter pledge trend (if multiple quarters available)
 */
export declare function getPromoterPledgeTrend(symbol: string): Promise<Array<{
    date: Date;
    pledgedPercentage: number;
}>>;
/**
 * Check if promoter pledge is increasing (red flag)
 */
export declare function isPromoterPledgeIncreasing(trend: Array<{
    date: Date;
    pledgedPercentage: number;
}>): {
    isIncreasing: boolean;
    changePercentage: number;
    warning: string | null;
};
//# sourceMappingURL=promoter.d.ts.map