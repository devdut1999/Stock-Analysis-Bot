/**
 * Risk Manager
 * Calculates position sizing and manages portfolio risk
 */
import type { PositionSizing, RiskMetrics } from '../types/trading-signal.js';
import type { AggregatedStockData } from '../types/stock-data.js';
/**
 * Portfolio configuration
 */
export interface PortfolioConfig {
    totalCapital: number;
    maxPositionSize: number;
    maxRiskPerTrade: number;
    maxPortfolioRisk: number;
    riskFreeRate: number;
}
export declare const DEFAULT_PORTFOLIO_CONFIG: PortfolioConfig;
/**
 * Calculate comprehensive position sizing
 */
export declare function calculatePositionSize(conviction: number, // 1-10 from CIO
entryPrice: number, stopLoss: number, marketData: AggregatedStockData, config?: PortfolioConfig): PositionSizing;
/**
 * Calculate risk metrics for a position
 */
export declare function calculateRiskMetrics(entryPrice: number, stopLoss: number, takeProfit: number, marketData: AggregatedStockData, config?: PortfolioConfig): RiskMetrics;
/**
 * Format risk metrics as human-readable string
 */
export declare function formatRiskMetrics(metrics: RiskMetrics): string;
/**
 * Format position sizing as human-readable string
 */
export declare function formatPositionSizing(sizing: PositionSizing, currency?: '₹' | '$'): string;
//# sourceMappingURL=risk-manager.d.ts.map