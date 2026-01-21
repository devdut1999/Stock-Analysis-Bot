/**
 * Signal Generator
 * Extracts validated trading signals from multi-agent analysis
 */

import type { AggregatedStockData } from '../types/stock-data.js';
import type { MultiAgentAnalysis } from '../agents/orchestrator.js';
import type {
  TradingSignal,
  SignalDirection,
  TimeHorizon,
  SignalReasoning,
  SignalGenerationResult
} from '../types/trading-signal.js';
import {
  extractConsensus,
  validateSignal,
  formatValidationResult
} from './signal-validator.js';
import {
  calculatePositionSize,
  calculateRiskMetrics,
  DEFAULT_PORTFOLIO_CONFIG,
  type PortfolioConfig
} from './risk-manager.js';

/**
 * Extract price levels from synthesis text
 */
function extractPriceLevels(synthesisText: string, currentPrice: number): {
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2?: number;
} {
  let entry = currentPrice;
  let stopLoss = 0;
  let takeProfit1 = 0;
  let takeProfit2: number | undefined;

  // Look for entry price patterns
  const entryMatch = synthesisText.match(/entry\s*(?:price)?:?\s*[₹$]?\s*([\d,]+(?:\.\d+)?)/i);
  if (entryMatch) {
    entry = parseFloat(entryMatch[1].replace(/,/g, ''));
  }

  // Look for stop loss patterns
  const stopLossMatch = synthesisText.match(/stop\s*loss:?\s*[₹$]?\s*([\d,]+(?:\.\d+)?)/i);
  if (stopLossMatch) {
    stopLoss = parseFloat(stopLossMatch[1].replace(/,/g, ''));
  }

  // Look for take profit patterns
  const tp1Match = synthesisText.match(/take\s*profit\s*1?:?\s*[₹$]?\s*([\d,]+(?:\.\d+)?)/i);
  if (tp1Match) {
    takeProfit1 = parseFloat(tp1Match[1].replace(/,/g, ''));
  }

  const tp2Match = synthesisText.match(/take\s*profit\s*2:?\s*[₹$]?\s*([\d,]+(?:\.\d+)?)/i);
  if (tp2Match) {
    takeProfit2 = parseFloat(tp2Match[1].replace(/,/g, ''));
  }

  // Fallback: use percentage-based defaults
  if (stopLoss === 0) {
    stopLoss = entry * 0.95; // 5% stop loss
  }

  if (takeProfit1 === 0) {
    takeProfit1 = entry * 1.10; // 10% take profit
  }

  return { entry, stopLoss, takeProfit1, takeProfit2 };
}

/**
 * Extract conviction level from synthesis
 */
function extractConviction(synthesisText: string): number {
  const convictionMatch = synthesisText.match(/conviction\s*(?:level)?:?\s*(\d+)(?:\/10)?/i);
  if (convictionMatch) {
    return parseInt(convictionMatch[1], 10);
  }

  // Default to 5 if not found
  return 5;
}

/**
 * Extract time horizon from synthesis
 */
function extractTimeHorizon(synthesisText: string): TimeHorizon {
  const text = synthesisText.toLowerCase();

  if (text.includes('intraday') || text.includes('day trade')) {
    return 'intraday';
  } else if (text.includes('swing') || text.includes('days') || text.includes('weeks')) {
    return 'swing';
  } else if (text.includes('position') || text.includes('months')) {
    return 'position';
  } else if (text.includes('long-term') || text.includes('years') || text.includes('forever')) {
    return 'long-term';
  }

  // Default to swing trading
  return 'swing';
}

/**
 * Extract reasoning from all agents
 */
function extractReasoning(
  analysis: MultiAgentAnalysis,
  marketData: AggregatedStockData
): SignalReasoning {
  const bullishFactors: string[] = [];
  const bearishFactors: string[] = [];
  const keyRisks: string[] = [];
  const catalysts: string[] = [];

  // Extract from synthesis
  const synthesisText = analysis.synthesis.analysis;

  // Look for key strengths section
  const strengthsMatch = synthesisText.match(/KEY STRENGTHS:?\s*((?:[-•]\s*.+\n?)+)/i);
  if (strengthsMatch) {
    const strengths = strengthsMatch[1].split(/[-•]/).filter(s => s.trim().length > 0);
    bullishFactors.push(...strengths.map(s => s.trim()));
  }

  // Look for key concerns section
  const concernsMatch = synthesisText.match(/KEY CONCERNS:?\s*((?:[-•]\s*.+\n?)+)/i);
  if (concernsMatch) {
    const concerns = concernsMatch[1].split(/[-•]/).filter(s => s.trim().length > 0);
    bearishFactors.push(...concerns.map(s => s.trim()));
  }

  // Extract technical setup from technical panel
  const technicalSetup = analysis.technicalPanel
    .map(agent => {
      const text = agent.analysis;
      // Extract first line of recommendation
      const firstLine = text.split('\n')[0];
      return `${agent.agentName}: ${firstLine}`;
    })
    .join('; ');

  // Extract fundamental thesis from Buffett
  const buffettAgent = analysis.fundamentalPanel.find(a => a.agentId === 'fundamental-buffett');
  const fundamentalThesis = buffettAgent
    ? buffettAgent.analysis.substring(0, 500) + '...'
    : 'See fundamental analysis panel for detailed thesis';

  // Extract catalysts from Ackman
  const ackmanAgent = analysis.fundamentalPanel.find(a => a.agentId === 'fundamental-ackman');
  if (ackmanAgent) {
    const catalystMatch = ackmanAgent.analysis.match(/IDENTIFIED CATALYSTS:?\s*((?:[-•\d.]\s*.+\n?)+)/i);
    if (catalystMatch) {
      const extractedCatalysts = catalystMatch[1].split(/[-•\d.]/).filter(s => s.trim().length > 0);
      catalysts.push(...extractedCatalysts.map(c => c.trim()));
    }
  }

  // Extract key risks from Munger or Risk Manager
  const mungerAgent = analysis.fundamentalPanel.find(a => a.agentId === 'fundamental-munger');
  const riskAgent = analysis.tradingPanel.find(a => a.agentId === 'trading-risk');

  if (mungerAgent) {
    const riskMatch = mungerAgent.analysis.match(/WHAT COULD GO WRONG.*?:?\s*((?:[-•]\s*.+\n?)+)/i);
    if (riskMatch) {
      const risks = riskMatch[1].split(/[-•]/).filter(s => s.trim().length > 0);
      keyRisks.push(...risks.map(r => r.trim()));
    }
  }

  if (riskAgent && keyRisks.length < 3) {
    const riskMatch = riskAgent.analysis.match(/KEY RISKS.*?:?\s*((?:[-•]\s*.+\n?)+)/i);
    if (riskMatch) {
      const risks = riskMatch[1].split(/[-•]/).filter(s => s.trim().length > 0);
      keyRisks.push(...risks.map(r => r.trim()));
    }
  }

  return {
    bullishFactors: bullishFactors.slice(0, 5), // Top 5
    bearishFactors: bearishFactors.slice(0, 5), // Top 5
    keyRisks: keyRisks.slice(0, 5), // Top 5
    technicalSetup,
    fundamentalThesis,
    catalysts: catalysts.slice(0, 3) // Top 3
  };
}

/**
 * Generate trading signal from multi-agent analysis
 */
export function generateTradingSignal(
  marketData: AggregatedStockData,
  analysis: MultiAgentAnalysis,
  portfolioConfig: PortfolioConfig = DEFAULT_PORTFOLIO_CONFIG
): SignalGenerationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Extract consensus
    const consensus = extractConsensus(analysis);

    // Extract signal direction from synthesis
    const synthesisText = analysis.synthesis.analysis.toUpperCase();
    let signal: SignalDirection = 'HOLD';

    if (synthesisText.includes('FINAL RECOMMENDATION: BUY')) {
      signal = 'BUY';
    } else if (synthesisText.includes('FINAL RECOMMENDATION: SELL')) {
      signal = 'SELL';
    } else if (synthesisText.includes('FINAL RECOMMENDATION: HOLD')) {
      signal = 'HOLD';
    } else {
      // Fallback to consensus
      signal = consensus.consensusDirection;
      warnings.push('Could not extract explicit recommendation from synthesis, using consensus');
    }

    // Extract conviction level
    const conviction = extractConviction(analysis.synthesis.analysis);

    // Extract price levels
    const { entry, stopLoss, takeProfit1, takeProfit2 } = extractPriceLevels(
      analysis.synthesis.analysis,
      marketData.price.currentPrice
    );

    // Extract time horizon
    const timeHorizon = extractTimeHorizon(analysis.synthesis.analysis);

    // Calculate position sizing
    const positionSizing = calculatePositionSize(
      conviction,
      entry,
      stopLoss,
      marketData,
      portfolioConfig
    );

    // Calculate risk metrics
    const riskMetrics = calculateRiskMetrics(
      entry,
      stopLoss,
      takeProfit1,
      marketData,
      portfolioConfig
    );

    // Extract reasoning
    const reasoning = extractReasoning(analysis, marketData);

    // Extract implementation details from synthesis
    const implementationMatch = analysis.synthesis.analysis.match(/IMPLEMENTATION PLAN\s*([\s\S]+?)(?:---|\n\n)/);
    const implementation = {
      entryTiming: 'Immediate (market order)',
      exitStrategy: `Take 50% profit at ${takeProfit1.toFixed(2)}, trail remaining`,
      monitoringTriggers: reasoning.catalysts.length > 0 ? reasoning.catalysts : ['Quarterly earnings', 'Major news events'],
      reassessmentConditions: [`Stop loss hit at ${stopLoss.toFixed(2)}`, 'Fundamental thesis invalidated', 'Market conditions change significantly']
    };

    // Construct trading signal
    const tradingSignal: TradingSignal = {
      symbol: marketData.symbol,
      market: marketData.market,
      exchange: marketData.exchange,
      timestamp: new Date(),

      signal,
      confidence: consensus.consensusStrength,
      conviction,

      currentPrice: marketData.price.currentPrice,
      entryPrice: entry,
      stopLoss,
      takeProfit1,
      takeProfit2,

      timeHorizon,
      positionSizing,
      riskMetrics,

      validation: {
        consensusReached: false,
        consensusPercentage: 0,
        technicalAlignment: false,
        riskWithinLimits: false,
        sufficientLiquidity: false,
        circuitBreakerCheck: false,
        allValidationsPassed: false,
        failureReasons: []
      }, // Will be filled by validation

      consensus,
      reasoning,
      implementation,

      generatedBy: 'multi-agent-v1',
      analysisId: `${marketData.symbol}-${analysis.timestamp.getTime()}`
    };

    // Validate the signal
    const validation = validateSignal(tradingSignal, marketData, analysis);
    tradingSignal.validation = validation;

    // Add warnings if validation failed
    if (!validation.allValidationsPassed) {
      warnings.push(...validation.failureReasons);
    }

    return {
      success: true,
      signal: tradingSignal,
      errors,
      warnings,
      rawAnalysis: analysis
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error generating signal');

    return {
      success: false,
      errors,
      warnings,
      rawAnalysis: analysis
    };
  }
}

/**
 * Format trading signal as human-readable string
 */
export function formatTradingSignal(signal: TradingSignal, includeValidation: boolean = true): string {
  const lines: string[] = [];
  const currency = signal.market === 'INDIA' ? '₹' : '$';

  lines.push('='.repeat(80));
  lines.push(`TRADING SIGNAL: ${signal.symbol} (${signal.market})`);
  lines.push(`Generated: ${signal.timestamp.toLocaleString()}`);
  lines.push('='.repeat(80));
  lines.push('');

  // Signal summary
  const emoji = signal.signal === 'BUY' ? '🟢' : signal.signal === 'SELL' ? '🔴' : '🟡';
  lines.push(`${emoji} SIGNAL: ${signal.signal}`);
  lines.push(`Confidence: ${signal.confidence}%`);
  lines.push(`Conviction: ${signal.conviction}/10`);
  lines.push(`Time Horizon: ${signal.timeHorizon.toUpperCase()}`);
  lines.push('');

  // Price levels
  lines.push('PRICE LEVELS:');
  lines.push(`  Current Price: ${currency}${signal.currentPrice.toFixed(2)}`);
  lines.push(`  Entry Price: ${currency}${signal.entryPrice.toFixed(2)}`);
  lines.push(`  Stop Loss: ${currency}${signal.stopLoss.toFixed(2)} (${((signal.stopLoss - signal.entryPrice) / signal.entryPrice * 100).toFixed(2)}%)`);
  lines.push(`  Take Profit 1: ${currency}${signal.takeProfit1.toFixed(2)} (${((signal.takeProfit1 - signal.entryPrice) / signal.entryPrice * 100).toFixed(2)}%)`);
  if (signal.takeProfit2) {
    lines.push(`  Take Profit 2: ${currency}${signal.takeProfit2.toFixed(2)} (${((signal.takeProfit2 - signal.entryPrice) / signal.entryPrice * 100).toFixed(2)}%)`);
  }
  lines.push('');

  // Position sizing
  lines.push('POSITION SIZING:');
  lines.push(`  Recommended Size: ${signal.positionSizing.recommendedSize.toFixed(2)}% of portfolio`);
  lines.push(`  Capital Required: ${currency}${signal.positionSizing.capitalRequired.toLocaleString()}`);
  if (signal.positionSizing.numberOfShares) {
    lines.push(`  Number of Shares: ${signal.positionSizing.numberOfShares.toLocaleString()}`);
  }
  lines.push(`  Scaling: ${signal.positionSizing.scalingStrategy.replace(/-/g, ' ').toUpperCase()}`);
  lines.push('');

  // Risk metrics
  lines.push('RISK ASSESSMENT:');
  lines.push(`  Risk Level: ${signal.riskMetrics.riskLevel.toUpperCase()}`);
  lines.push(`  Risk/Reward: 1:${signal.riskMetrics.riskRewardRatio.toFixed(2)}`);
  lines.push(`  Max Drawdown: ${signal.riskMetrics.maxDrawdown.toFixed(2)}%`);
  lines.push(`  Volatility: ${signal.riskMetrics.volatility.toFixed(2)}%`);
  lines.push('');

  // Consensus
  lines.push('AGENT CONSENSUS:');
  lines.push(`  Bullish: ${signal.consensus.bullishCount} agents`);
  lines.push(`  Bearish: ${signal.consensus.bearishCount} agents`);
  lines.push(`  Neutral: ${signal.consensus.neutralCount} agents`);
  lines.push(`  Consensus Strength: ${signal.consensus.consensusStrength}%`);
  if (signal.consensus.dissentingAgents.length > 0) {
    lines.push(`  Dissenting: ${signal.consensus.dissentingAgents.join(', ')}`);
  }
  lines.push('');

  // Key factors
  if (signal.reasoning.bullishFactors.length > 0) {
    lines.push('BULLISH FACTORS:');
    signal.reasoning.bullishFactors.forEach(factor => {
      lines.push(`  • ${factor}`);
    });
    lines.push('');
  }

  if (signal.reasoning.bearishFactors.length > 0) {
    lines.push('BEARISH FACTORS:');
    signal.reasoning.bearishFactors.forEach(factor => {
      lines.push(`  • ${factor}`);
    });
    lines.push('');
  }

  if (signal.reasoning.keyRisks.length > 0) {
    lines.push('KEY RISKS:');
    signal.reasoning.keyRisks.forEach(risk => {
      lines.push(`  • ${risk}`);
    });
    lines.push('');
  }

  // Implementation
  lines.push('IMPLEMENTATION:');
  lines.push(`  Entry Timing: ${signal.implementation.entryTiming}`);
  lines.push(`  Exit Strategy: ${signal.implementation.exitStrategy}`);
  lines.push('');

  // Validation (if requested)
  if (includeValidation) {
    lines.push('');
    lines.push(formatValidationResult(signal.validation));
  }

  return lines.join('\n');
}
