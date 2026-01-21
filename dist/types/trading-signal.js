/**
 * Trading Signal Types
 * Validated, actionable trading signals with safety checks
 */
/**
 * Default validation configuration
 */
export const DEFAULT_VALIDATION_CONFIG = {
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
//# sourceMappingURL=trading-signal.js.map