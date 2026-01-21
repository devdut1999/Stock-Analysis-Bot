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
    consensusPercentage: number;
    technicalAlignment: boolean;
    riskWithinLimits: boolean;
    sufficientLiquidity: boolean;
    circuitBreakerCheck: boolean;
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
    consensusStrength: number;
    dissentingAgents: string[];
}
/**
 * Risk metrics for a trading signal
 */
export interface RiskMetrics {
    maxDrawdown: number;
    volatility: number;
    beta: number;
    valueAtRisk: number;
    sharpeRatio?: number;
    riskRewardRatio: number;
    riskLevel: RiskLevel;
}
/**
 * Position sizing recommendation
 */
export interface PositionSizing {
    recommendedSize: number;
    minSize: number;
    maxSize: number;
    scalingStrategy: 'all-at-once' | 'scale-in-2' | 'scale-in-3';
    capitalRequired: number;
    numberOfShares?: number;
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
    symbol: string;
    market: 'US' | 'INDIA';
    exchange?: string;
    timestamp: Date;
    signal: SignalDirection;
    confidence: number;
    conviction: number;
    currentPrice: number;
    entryPrice: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2?: number;
    timeHorizon: TimeHorizon;
    positionSizing: PositionSizing;
    riskMetrics: RiskMetrics;
    validation: SignalValidation;
    consensus: AgentConsensus;
    reasoning: SignalReasoning;
    implementation: {
        entryTiming: string;
        exitStrategy: string;
        monitoringTriggers: string[];
        reassessmentConditions: string[];
    };
    generatedBy: string;
    analysisId?: string;
}
/**
 * Signal validation configuration
 */
export interface ValidationConfig {
    minConsensusPercentage: number;
    requireTechnicalAlignment: boolean;
    maxPositionSize: number;
    maxRiskPerTrade: number;
    minAverageDailyVolume: number;
    maxBidAskSpread: number;
    maxVIX?: number;
    allowNearCircuitLimit: boolean;
    circuitLimitThreshold: number;
    blockDuringEarnings: boolean;
    earningsBlackoutDays: number;
    customValidators?: Array<(signal: TradingSignal) => {
        valid: boolean;
        reason?: string;
    }>;
}
/**
 * Default validation configuration
 */
export declare const DEFAULT_VALIDATION_CONFIG: ValidationConfig;
/**
 * Signal generation result
 */
export interface SignalGenerationResult {
    success: boolean;
    signal?: TradingSignal;
    errors: string[];
    warnings: string[];
    rawAnalysis: any;
}
//# sourceMappingURL=trading-signal.d.ts.map