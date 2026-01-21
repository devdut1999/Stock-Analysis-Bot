/**
 * Signal Generator
 * Extracts validated trading signals from multi-agent analysis
 */
import type { AggregatedStockData } from '../types/stock-data.js';
import type { MultiAgentAnalysis } from '../agents/orchestrator.js';
import type { TradingSignal, SignalGenerationResult } from '../types/trading-signal.js';
import { type PortfolioConfig } from './risk-manager.js';
/**
 * Generate trading signal from multi-agent analysis
 */
export declare function generateTradingSignal(marketData: AggregatedStockData, analysis: MultiAgentAnalysis, portfolioConfig?: PortfolioConfig): SignalGenerationResult;
/**
 * Format trading signal as human-readable string
 */
export declare function formatTradingSignal(signal: TradingSignal, includeValidation?: boolean): string;
//# sourceMappingURL=signal-generator.d.ts.map