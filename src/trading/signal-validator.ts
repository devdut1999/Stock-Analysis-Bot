/**
 * Signal Validator
 * Validates trading signals before execution to prevent costly errors
 */

import type { AggregatedStockData } from '../types/stock-data.js';
import type { MultiAgentAnalysis } from '../agents/orchestrator.js';
import type {
  TradingSignal,
  SignalValidation,
  AgentConsensus,
  ValidationConfig,
  SignalDirection
} from '../types/trading-signal.js';
import { DEFAULT_VALIDATION_CONFIG } from '../types/trading-signal.js';

/**
 * Extract consensus from multi-agent analysis
 */
export function extractConsensus(analysis: MultiAgentAnalysis): AgentConsensus {
  let bullishCount = 0;
  let bearishCount = 0;
  let neutralCount = 0;
  const dissentingAgents: string[] = [];

  // Analyze each agent's recommendation
  const allAgents = [
    ...analysis.technicalPanel,
    ...analysis.fundamentalPanel,
    ...analysis.tradingPanel
  ];

  allAgents.forEach(agent => {
    const text = agent.analysis.toUpperCase();

    // Look for clear signals
    const hasBuy = text.includes('BUY') || text.includes('LONG') || text.includes('BULLISH');
    const hasSell = text.includes('SELL') || text.includes('SHORT') || text.includes('BEARISH');
    const hasHold = text.includes('HOLD') || text.includes('NEUTRAL') || text.includes('CAUTION');

    // Determine sentiment
    if (hasBuy && !hasSell) {
      bullishCount++;
    } else if (hasSell && !hasBuy) {
      bearishCount++;
      dissentingAgents.push(agent.agentName);
    } else {
      neutralCount++;
      if (hasHold) {
        dissentingAgents.push(agent.agentName);
      }
    }
  });

  const totalAgents = allAgents.length;
  const maxCount = Math.max(bullishCount, bearishCount, neutralCount);

  let consensusDirection: SignalDirection;
  if (bullishCount === maxCount) {
    consensusDirection = 'BUY';
  } else if (bearishCount === maxCount) {
    consensusDirection = 'SELL';
  } else {
    consensusDirection = 'HOLD';
  }

  const consensusStrength = Math.round((maxCount / totalAgents) * 100);

  return {
    bullishCount,
    bearishCount,
    neutralCount,
    totalAgents,
    consensusDirection,
    consensusStrength,
    dissentingAgents: consensusDirection === 'BUY' ? dissentingAgents : []
  };
}

/**
 * Check if price is aligned with technical levels
 */
function checkTechnicalAlignment(
  signal: SignalDirection,
  currentPrice: number,
  supportLevels: number[],
  resistanceLevels: number[]
): boolean {
  if (signal === 'HOLD') return true;

  if (signal === 'BUY') {
    // Buy signal should be near support or after breakout above resistance
    const nearSupport = supportLevels.some(level =>
      Math.abs((currentPrice - level) / level) < 0.03 // Within 3% of support
    );

    const aboveResistance = resistanceLevels.length === 0 ||
      resistanceLevels.every(level => currentPrice > level * 1.02); // 2% above resistance

    return nearSupport || aboveResistance;
  }

  if (signal === 'SELL') {
    // Sell signal should be near resistance or after breakdown below support
    const nearResistance = resistanceLevels.some(level =>
      Math.abs((currentPrice - level) / level) < 0.03 // Within 3% of resistance
    );

    const belowSupport = supportLevels.length === 0 ||
      supportLevels.every(level => currentPrice < level * 0.98); // 2% below support

    return nearResistance || belowSupport;
  }

  return false;
}

/**
 * Check liquidity requirements
 */
function checkLiquidity(
  volume: number,
  minVolume: number,
  market: 'US' | 'INDIA',
  currentPrice: number
): boolean {
  if (market === 'INDIA') {
    // For India, convert to value traded (₹ Crores)
    const valueTraded = (volume * currentPrice) / 10000000; // Convert to Crores
    return valueTraded >= (minVolume / 100000000); // minVolume in rupees → Crores
  } else {
    // For US, use share volume
    return volume >= minVolume;
  }
}

/**
 * Check if stock is near circuit limit (India-specific)
 */
function checkCircuitBreaker(
  currentPrice: number,
  previousClose: number,
  threshold: number = 5
): boolean {
  const changePercent = Math.abs(((currentPrice - previousClose) / previousClose) * 100);
  const circuitLimit = 20; // India has 20% circuit limits

  // Check if within threshold% of circuit limit
  return changePercent < (circuitLimit - threshold);
}

/**
 * Validate a trading signal
 */
export function validateSignal(
  signal: Partial<TradingSignal>,
  marketData: AggregatedStockData,
  analysis: MultiAgentAnalysis,
  config: ValidationConfig = DEFAULT_VALIDATION_CONFIG
): SignalValidation {
  const failureReasons: string[] = [];

  // 1. Check consensus
  const consensus = signal.consensus || extractConsensus(analysis);
  const consensusReached = consensus.consensusStrength >= config.minConsensusPercentage;

  if (!consensusReached) {
    failureReasons.push(
      `Insufficient consensus: ${consensus.consensusStrength}% (required: ${config.minConsensusPercentage}%)`
    );
  }

  // 2. Check technical alignment
  let technicalAlignment = true;

  if (config.requireTechnicalAlignment && signal.signal !== 'HOLD') {
    const supportLevels = marketData.technicals.supportLevels || [];
    const resistanceLevels = marketData.technicals.resistanceLevels || [];

    technicalAlignment = checkTechnicalAlignment(
      signal.signal!,
      marketData.price.currentPrice,
      supportLevels,
      resistanceLevels
    );

    if (!technicalAlignment) {
      failureReasons.push(
        `Entry not aligned with technical levels (${signal.signal} signal should be near support/resistance)`
      );
    }
  }

  // 3. Check risk limits
  let riskWithinLimits = true;

  if (signal.positionSizing) {
    if (signal.positionSizing.recommendedSize > config.maxPositionSize) {
      riskWithinLimits = false;
      failureReasons.push(
        `Position size ${signal.positionSizing.recommendedSize}% exceeds limit of ${config.maxPositionSize}%`
      );
    }

    // Check risk per trade (stop loss distance)
    if (signal.stopLoss && signal.entryPrice) {
      const stopLossPercent = Math.abs(((signal.stopLoss - signal.entryPrice) / signal.entryPrice) * 100);
      const riskPerTrade = (stopLossPercent / 100) * signal.positionSizing.recommendedSize;

      if (riskPerTrade > config.maxRiskPerTrade) {
        riskWithinLimits = false;
        failureReasons.push(
          `Risk per trade ${riskPerTrade.toFixed(2)}% exceeds limit of ${config.maxRiskPerTrade}%`
        );
      }
    }
  }

  // 4. Check mandatory stop loss
  if (!signal.stopLoss || signal.stopLoss === 0) {
    riskWithinLimits = false;
    failureReasons.push('Stop loss is mandatory but not set');
  }

  // 5. Check liquidity
  const minVolumeForMarket = marketData.market === 'INDIA' ? 100000000 : config.minAverageDailyVolume; // ₹1Cr or 100K shares

  const sufficientLiquidity = checkLiquidity(
    marketData.price.volume,
    minVolumeForMarket,
    marketData.market,
    marketData.price.currentPrice
  );

  if (!sufficientLiquidity) {
    failureReasons.push(
      `Insufficient liquidity: ${marketData.price.volume.toLocaleString()} volume ` +
      `(required: ${minVolumeForMarket.toLocaleString()})`
    );
  }

  // 6. Circuit breaker check (India only)
  let circuitBreakerCheck = true;

  if (marketData.market === 'INDIA' && !config.allowNearCircuitLimit) {
    circuitBreakerCheck = checkCircuitBreaker(
      marketData.price.currentPrice,
      marketData.price.previousClose,
      config.circuitLimitThreshold
    );

    if (!circuitBreakerCheck) {
      failureReasons.push(
        `Stock is within ${config.circuitLimitThreshold}% of circuit limit ` +
        `(current change: ${marketData.price.changePercent.toFixed(2)}%)`
      );
    }
  }

  // 7. Custom validators
  if (config.customValidators) {
    for (const validator of config.customValidators) {
      const result = validator(signal as TradingSignal);
      if (!result.valid) {
        failureReasons.push(result.reason || 'Custom validation failed');
      }
    }
  }

  const allValidationsPassed = failureReasons.length === 0;

  return {
    consensusReached,
    consensusPercentage: consensus.consensusStrength,
    technicalAlignment,
    riskWithinLimits,
    sufficientLiquidity,
    circuitBreakerCheck,
    allValidationsPassed,
    failureReasons
  };
}

/**
 * Format validation result as human-readable string
 */
export function formatValidationResult(validation: SignalValidation): string {
  const lines: string[] = [];

  lines.push('=== SIGNAL VALIDATION RESULT ===');
  lines.push('');

  // Overall status
  if (validation.allValidationsPassed) {
    lines.push('✅ VALIDATION PASSED - Signal is safe to execute');
  } else {
    lines.push('❌ VALIDATION FAILED - Do NOT execute this signal');
  }

  lines.push('');
  lines.push('Validation Checks:');
  lines.push(`  Consensus: ${validation.consensusReached ? '✅' : '❌'} (${validation.consensusPercentage}%)`);
  lines.push(`  Technical Alignment: ${validation.technicalAlignment ? '✅' : '❌'}`);
  lines.push(`  Risk Within Limits: ${validation.riskWithinLimits ? '✅' : '❌'}`);
  lines.push(`  Sufficient Liquidity: ${validation.sufficientLiquidity ? '✅' : '❌'}`);
  lines.push(`  Circuit Breaker: ${validation.circuitBreakerCheck ? '✅' : '❌'}`);

  if (validation.failureReasons.length > 0) {
    lines.push('');
    lines.push('Failure Reasons:');
    validation.failureReasons.forEach(reason => {
      lines.push(`  • ${reason}`);
    });
  }

  return lines.join('\n');
}

/**
 * Get validation summary emoji
 */
export function getValidationEmoji(validation: SignalValidation): string {
  if (validation.allValidationsPassed) return '✅';
  if (validation.failureReasons.length === 1) return '⚠️';
  return '❌';
}
