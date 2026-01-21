/**
 * Trading Signal Types
 * Validated, actionable trading signals with safety checks
 */

export type SignalDirection = 'BUY' | 'SELL' | 'HOLD';
export type TimeHorizon = 'intraday' | 'swing' | 'position' | 'long-term';
export type RiskLevel = 'low' | 'moderate' | 'high' | 'extreme';

/**
 * Validation results for a trading signal
 */
export interface SignalValidation {
  consensusReached: boolean;
  consensusPercentage: number; // 0-100
  technicalAlignment: boolean;
  riskWithinLimits: boolean;
  sufficientLiquidity: boolean;
  circuitBreakerCheck: boolean; // India-specific: not near circuit limit
  allValidationsPassed: boolean;
  failureReasons: string[];
}

/**
 * Agent consensus breakdown
 */
export interface AgentConsensus {
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  totalAgents: number;
  consensusDirection: SignalDirection;
  consensusStrength: number; // 0-100
  dissentingAgents: string[]; // Names of agents that disagree
}

/**
 * Risk metrics for a trading signal
 */
export interface RiskMetrics {
  maxDrawdown: number; // -X% worst case
  volatility: number; // Historical volatility
  beta: number; // Market correlation
  valueAtRisk: number; // VaR at 95% confidence
  sharpeRatio?: number; // If historical data available
  riskRewardRatio: number; // e.g., 1:3 means risk $1 to make $3
  riskLevel: RiskLevel;
}

/**
 * Position sizing recommendation
 */
export interface PositionSizing {
  recommendedSize: number; // % of portfolio
  minSize: number; // Minimum position size
  maxSize: number; // Maximum position size
  scalingStrategy: 'all-at-once' | 'scale-in-2' | 'scale-in-3';
  capitalRequired: number; // In currency units
  numberOfShares?: number; // Calculated shares to buy
}

/**
 * Reasoning and supporting evidence for the signal
 */
export interface SignalReasoning {
  bullishFactors: string[];
  bearishFactors: string[];
  keyRisks: string[];
  technicalSetup: string;
  fundamentalThesis: string;
  catalysts: string[];
}

/**
 * Complete validated trading signal
 */
export interface TradingSignal {
  // Basic signal info
  symbol: string;
  market: 'US' | 'INDIA';
  exchange?: string;
  timestamp: Date;

  // Signal direction and confidence
  signal: SignalDirection;
  confidence: number; // 0-100
  conviction: number; // 1-10 (from CIO)

  // Price levels
  currentPrice: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2?: number;

  // Position management
  timeHorizon: TimeHorizon;
  positionSizing: PositionSizing;

  // Risk assessment
  riskMetrics: RiskMetrics;

  // Validation
  validation: SignalValidation;

  // Consensus analysis
  consensus: AgentConsensus;

  // Reasoning
  reasoning: SignalReasoning;

  // Implementation details
  implementation: {
    entryTiming: string; // "Immediate", "Wait for pullback to $X", etc.
    exitStrategy: string;
    monitoringTriggers: string[];
    reassessmentConditions: string[];
  };

  // Metadata
  generatedBy: string; // "multi-agent-v1", etc.
  analysisId?: string; // Link back to full analysis
}

/**
 * Signal validation configuration
 */
export interface ValidationConfig {
  // Consensus requirements
  minConsensusPercentage: number; // Default: 60%
  requireTechnicalAlignment: boolean; // Default: true

  // Risk limits
  maxPositionSize: number; // Default: 20% of portfolio
  maxRiskPerTrade: number; // Default: 2% of portfolio

  // Liquidity requirements
  minAverageDailyVolume: number; // Default: 100K shares (US) or ₹1Cr (India)
  maxBidAskSpread: number; // Default: 0.5%

  // Market conditions
  maxVIX?: number; // Block trades if VIX > X (US only)
  allowNearCircuitLimit: boolean; // Default: false (India)
  circuitLimitThreshold: number; // Default: 5% away from limit

  // Time restrictions
  blockDuringEarnings: boolean; // Default: true
  earningsBlackoutDays: number; // Default: 1 day before/after

  // Custom validators
  customValidators?: Array<(signal: TradingSignal) => { valid: boolean; reason?: string }>;
}

/**
 * Default validation configuration
 */
export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  minConsensusPercentage: 60,
  requireTechnicalAlignment: true,
  maxPositionSize: 20,
  maxRiskPerTrade: 2,
  minAverageDailyVolume: 100000, // Will be adjusted per market
  maxBidAskSpread: 0.5,
  allowNearCircuitLimit: false,
  circuitLimitThreshold: 5,
  blockDuringEarnings: true,
  earningsBlackoutDays: 1
};

/**
 * Signal generation result
 */
export interface SignalGenerationResult {
  success: boolean;
  signal?: TradingSignal;
  errors: string[];
  warnings: string[];
  rawAnalysis: any; // Original multi-agent analysis
}
