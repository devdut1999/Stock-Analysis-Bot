/**
 * Signal Validator
 * Validates trading signals before execution to prevent costly errors
 */
import type { AggregatedStockData } from '../types/stock-data.js';
import type { MultiAgentAnalysis } from '../agents/orchestrator.js';
import type { TradingSignal, SignalValidation, AgentConsensus, ValidationConfig } from '../types/trading-signal.js';
/**
 * Extract consensus from multi-agent analysis
 */
export declare function extractConsensus(analysis: MultiAgentAnalysis): AgentConsensus;
/**
 * Validate a trading signal
 */
export declare function validateSignal(signal: Partial<TradingSignal>, marketData: AggregatedStockData, analysis: MultiAgentAnalysis, config?: ValidationConfig): SignalValidation;
/**
 * Format validation result as human-readable string
 */
export declare function formatValidationResult(validation: SignalValidation): string;
/**
 * Get validation summary emoji
 */
export declare function getValidationEmoji(validation: SignalValidation): string;
//# sourceMappingURL=signal-validator.d.ts.map