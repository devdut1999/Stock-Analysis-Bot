/**
 * Multi-Agent Orchestrator
 * Coordinates 10 specialized agents to analyze stocks comprehensively
 */

import Anthropic from '@anthropic-ai/sdk';
import { getAgentDefinitions, getAgentsByRole, type AgentDefinition } from '../config/agents.js';
import type { AggregatedStockData } from '../types/stock-data.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export interface AgentResponse {
  agentId: string;
  agentName: string;
  analysis: string;
  duration: number;
}

export interface MultiAgentAnalysis {
  symbol: string;
  market: 'US' | 'INDIA';
  timestamp: Date;
  technicalPanel: AgentResponse[];
  fundamentalPanel: AgentResponse[];
  tradingPanel: AgentResponse[];
  synthesis: AgentResponse;
  totalDuration: number;
}

/**
 * Execute a single agent analysis
 */
async function executeAgent(
  agent: AgentDefinition,
  context: string,
  marketData: AggregatedStockData
): Promise<AgentResponse> {
  const startTime = Date.now();

  console.log(`[Orchestrator] Running ${agent.name}...`);

  try {
    const message = await anthropic.messages.create({
      model: agent.model === 'haiku' ? 'claude-3-5-haiku-20241022' :
             agent.model === 'opus' ? 'claude-opus-4-20250514' :
             'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: agent.systemPrompt,
      messages: [
        {
          role: 'user',
          content: context
        }
      ]
    });

    const analysis = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n\n');

    const duration = Date.now() - startTime;

    console.log(`[Orchestrator] ✓ ${agent.name} completed in ${duration}ms`);

    return {
      agentId: agent.id,
      agentName: agent.name,
      analysis,
      duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Orchestrator] ✗ ${agent.name} failed:`, error);

    return {
      agentId: agent.id,
      agentName: agent.name,
      analysis: `Error: Agent failed to complete analysis. ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration
    };
  }
}

/**
 * Format market data for agent consumption
 */
function formatMarketDataContext(data: AggregatedStockData): string {
  const lines: string[] = [];

  lines.push(`# STOCK ANALYSIS REQUEST: ${data.symbol}`);
  lines.push(`Market: ${data.market} | Exchange: ${data.exchange}`);
  lines.push(`Analysis Date: ${data.timestamp.toLocaleString()}`);
  lines.push('');

  // Price Data
  lines.push('## PRICE DATA');
  lines.push(`Current Price: ${data.market === 'INDIA' ? '₹' : '$'}${data.price.currentPrice.toFixed(2)}`);
  lines.push(`Change: ${data.price.change >= 0 ? '+' : ''}${data.price.change.toFixed(2)} (${data.price.changePercent.toFixed(2)}%)`);
  lines.push(`Day Range: ${data.price.low.toFixed(2)} - ${data.price.high.toFixed(2)}`);
  lines.push(`Volume: ${data.price.volume.toLocaleString()}`);
  lines.push(`Previous Close: ${data.price.previousClose.toFixed(2)}`);

  if (data.price.marketCap) {
    const marketCapInCr = data.market === 'INDIA' ?
      (data.price.marketCap / 10000000).toFixed(0) + ' Cr' :
      (data.price.marketCap / 1000000000).toFixed(2) + ' B';
    lines.push(`Market Cap: ${data.market === 'INDIA' ? '₹' : '$'}${marketCapInCr}`);
  }

  if (data.price.fiftyTwoWeekHigh && data.price.fiftyTwoWeekLow) {
    lines.push(`52-Week Range: ${data.price.fiftyTwoWeekLow.toFixed(2)} - ${data.price.fiftyTwoWeekHigh.toFixed(2)}`);
  }
  lines.push('');

  // Fundamentals
  if (data.fundamentals && Object.keys(data.fundamentals).length > 0) {
    lines.push('## FUNDAMENTAL DATA');

    if (data.fundamentals.peRatio) lines.push(`P/E Ratio: ${data.fundamentals.peRatio.toFixed(2)}`);
    if (data.fundamentals.pegRatio) lines.push(`PEG Ratio: ${data.fundamentals.pegRatio.toFixed(2)}`);
    if (data.fundamentals.priceToBook) lines.push(`Price-to-Book: ${data.fundamentals.priceToBook.toFixed(2)}`);
    if (data.fundamentals.debtToEquity) lines.push(`Debt-to-Equity: ${data.fundamentals.debtToEquity.toFixed(2)}`);
    if (data.fundamentals.roe) lines.push(`ROE: ${data.fundamentals.roe.toFixed(2)}%`);
    if (data.fundamentals.roce) lines.push(`ROCE: ${data.fundamentals.roce.toFixed(2)}%`);
    if (data.fundamentals.earningsPerShare) lines.push(`EPS: ${data.fundamentals.earningsPerShare.toFixed(2)}`);
    if (data.fundamentals.dividendYield) lines.push(`Dividend Yield: ${data.fundamentals.dividendYield.toFixed(2)}%`);
    if (data.fundamentals.revenueGrowth) lines.push(`Revenue Growth: ${data.fundamentals.revenueGrowth.toFixed(2)}%`);
    if (data.fundamentals.profitMargin) lines.push(`Profit Margin: ${data.fundamentals.profitMargin.toFixed(2)}%`);
    if (data.fundamentals.operatingMargin) lines.push(`Operating Margin: ${data.fundamentals.operatingMargin.toFixed(2)}%`);

    lines.push('');
  }

  // Technical Indicators
  if (data.technicals.rsi !== null) {
    lines.push('## TECHNICAL INDICATORS');

    if (data.technicals.rsi !== null) {
      const rsiStatus = data.technicals.rsi > 70 ? 'Overbought' :
                       data.technicals.rsi < 30 ? 'Oversold' : 'Neutral';
      lines.push(`RSI: ${data.technicals.rsi.toFixed(1)} (${rsiStatus})`);
    }

    if (data.technicals.macd) {
      const macdSignal = data.technicals.macd.histogram > 0 ? 'Bullish' : 'Bearish';
      lines.push(`MACD: ${macdSignal} (Histogram: ${data.technicals.macd.histogram.toFixed(2)})`);
      lines.push(`  MACD Line: ${data.technicals.macd.value.toFixed(2)}`);
      lines.push(`  Signal Line: ${data.technicals.macd.signal.toFixed(2)}`);
    }

    if (data.technicals.bollingerBands) {
      lines.push(`Bollinger Bands:`);
      lines.push(`  Upper: ${data.technicals.bollingerBands.upper.toFixed(2)}`);
      lines.push(`  Middle: ${data.technicals.bollingerBands.middle.toFixed(2)}`);
      lines.push(`  Lower: ${data.technicals.bollingerBands.lower.toFixed(2)}`);

      const currentPrice = data.price.currentPrice;
      const bbPosition = currentPrice > data.technicals.bollingerBands.upper ? 'Above upper band' :
                        currentPrice < data.technicals.bollingerBands.lower ? 'Below lower band' :
                        'Inside bands';
      lines.push(`  Price Position: ${bbPosition}`);
    }

    if (data.technicals.movingAverages) {
      lines.push(`Moving Averages:`);
      if (data.technicals.movingAverages.sma20) lines.push(`  SMA-20: ${data.technicals.movingAverages.sma20.toFixed(2)}`);
      if (data.technicals.movingAverages.sma50) lines.push(`  SMA-50: ${data.technicals.movingAverages.sma50.toFixed(2)}`);
      if (data.technicals.movingAverages.ema12) lines.push(`  EMA-12: ${data.technicals.movingAverages.ema12.toFixed(2)}`);
      if (data.technicals.movingAverages.ema26) lines.push(`  EMA-26: ${data.technicals.movingAverages.ema26.toFixed(2)}`);
    }

    if (data.technicals.supportLevels && data.technicals.supportLevels.length > 0) {
      lines.push(`Support Levels: ${data.technicals.supportLevels.map(s => s.toFixed(2)).join(', ')}`);
    }

    if (data.technicals.resistanceLevels && data.technicals.resistanceLevels.length > 0) {
      lines.push(`Resistance Levels: ${data.technicals.resistanceLevels.map(r => r.toFixed(2)).join(', ')}`);
    }

    if (data.technicals.fibonacci) {
      lines.push(`Fibonacci Retracement:`);
      lines.push(`  23.6%: ${data.technicals.fibonacci.level236.toFixed(2)}`);
      lines.push(`  38.2%: ${data.technicals.fibonacci.level382.toFixed(2)}`);
      lines.push(`  50.0%: ${data.technicals.fibonacci.level500.toFixed(2)}`);
      lines.push(`  61.8%: ${data.technicals.fibonacci.level618.toFixed(2)}`);
    }

    lines.push('');
  }

  // India-Specific Data
  if (data.indiaSpecific) {
    lines.push('## INDIA-SPECIFIC DATA');

    const promoter = data.indiaSpecific.promoterHolding;
    if (promoter.promoterPercentage > 0) {
      lines.push(`Promoter Holding: ${promoter.promoterPercentage.toFixed(1)}%`);
      lines.push(`Pledged Shares: ${promoter.pledgedPercentage.toFixed(1)}%`);
      lines.push(`Public Holding: ${promoter.publicPercentage.toFixed(1)}%`);

      if (promoter.fiiPercentage > 0) lines.push(`FII Holding: ${promoter.fiiPercentage.toFixed(1)}%`);
      if (promoter.diiPercentage > 0) lines.push(`DII Holding: ${promoter.diiPercentage.toFixed(1)}%`);
    }

    const fii = data.indiaSpecific.fiiDiiActivity;
    lines.push(`FII Net Activity: ₹${fii.fiiNetBuySell.toFixed(0)} Cr (${fii.interpretation})`);
    lines.push(`DII Net Activity: ₹${fii.diiNetBuySell.toFixed(0)} Cr`);

    if (data.indiaSpecific.fnoData) {
      const fno = data.indiaSpecific.fnoData;
      lines.push(`F&O Status: IN F&O SEGMENT`);
      lines.push(`Put-Call Ratio: ${fno.putCallRatio.toFixed(2)} (${fno.interpretation})`);
      lines.push(`Max Pain: ₹${fno.maxPain.toFixed(2)}`);
      lines.push(`Open Interest: ${fno.openInterest.toLocaleString()}`);
    } else {
      lines.push(`F&O Status: NOT IN F&O SEGMENT`);
    }

    lines.push('');
  }

  // Data Quality
  lines.push('## DATA QUALITY ASSESSMENT');
  lines.push(`Price Data: ${data.dataQuality.priceDataAvailable ? 'Available' : 'Missing'}`);
  lines.push(`Fundamentals: ${data.dataQuality.fundamentalsAvailable ? 'Available' : 'Missing'}`);
  lines.push(`Technicals: ${data.dataQuality.technicalsAvailable ? 'Available' : 'Missing'}`);
  lines.push(`Sentiment: ${data.dataQuality.sentimentAvailable ? 'Available' : 'Not Available (Phase 2)'}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Orchestrate multi-agent analysis
 */
export async function orchestrateAnalysis(
  marketData: AggregatedStockData
): Promise<MultiAgentAnalysis> {
  const startTime = Date.now();

  console.log(`\n[Orchestrator] Starting multi-agent analysis for ${marketData.symbol}`);
  console.log(`[Orchestrator] Market: ${marketData.market} | Exchange: ${marketData.exchange}`);

  // Prepare context for agents
  const marketContext = formatMarketDataContext(marketData);

  // Get all agents
  const agents = getAgentDefinitions(marketData.market);

  // Separate agents by role
  const technicalAgents = getAgentsByRole('technical', marketData.market);
  const fundamentalAgents = getAgentsByRole('fundamental', marketData.market);
  const tradingAgents = getAgentsByRole('trading', marketData.market);
  const synthesizerAgent = agents.find(a => a.role === 'synthesizer')!;

  // Execute panels in parallel
  console.log(`\n[Orchestrator] Phase 1: Technical Analysis Panel (${technicalAgents.length} agents)`);
  const technicalPromises = technicalAgents.map(agent =>
    executeAgent(agent, marketContext, marketData)
  );

  console.log(`[Orchestrator] Phase 2: Fundamental Analysis Panel (${fundamentalAgents.length} agents)`);
  const fundamentalPromises = fundamentalAgents.map(agent =>
    executeAgent(agent, marketContext, marketData)
  );

  console.log(`[Orchestrator] Phase 3: Trading & Risk Panel (${tradingAgents.length} agents)`);
  const tradingPromises = tradingAgents.map(agent =>
    executeAgent(agent, marketContext, marketData)
  );

  // Wait for all panel analyses to complete
  const [technicalPanel, fundamentalPanel, tradingPanel] = await Promise.all([
    Promise.all(technicalPromises),
    Promise.all(fundamentalPromises),
    Promise.all(tradingPromises)
  ]);

  console.log(`\n[Orchestrator] Phase 4: Synthesis (CIO consolidating all analyses)`);

  // Prepare synthesis context with all agent outputs
  const synthesisContext = `
${marketContext}

---

# ANALYST RECOMMENDATIONS

You are receiving recommendations from 9 specialized analysts. Your job is to synthesize these into a final investment decision.

## TECHNICAL ANALYSIS PANEL

${technicalPanel.map(r => `### ${r.agentName}\n\n${r.analysis}\n`).join('\n---\n\n')}

## FUNDAMENTAL ANALYSIS PANEL (Investment Committee)

${fundamentalPanel.map(r => `### ${r.agentName}\n\n${r.analysis}\n`).join('\n---\n\n')}

## TRADING & RISK PANEL

${tradingPanel.map(r => `### ${r.agentName}\n\n${r.analysis}\n`).join('\n---\n\n')}

---

# YOUR TASK

Synthesize all the above analyses into a final investment recommendation.
Consider:
- Where do analysts agree? (high confidence)
- Where do they disagree? (identify risks)
- What's the base case, bull case, bear case?
- What's your final recommendation with conviction level and position sizing?

Provide a clear, actionable investment decision.
`;

  const synthesis = await executeAgent(synthesizerAgent, synthesisContext, marketData);

  const totalDuration = Date.now() - startTime;

  console.log(`\n[Orchestrator] ✓ Multi-agent analysis completed in ${(totalDuration / 1000).toFixed(1)}s`);
  console.log(`[Orchestrator] Total agents executed: ${technicalPanel.length + fundamentalPanel.length + tradingPanel.length + 1}`);

  return {
    symbol: marketData.symbol,
    market: marketData.market,
    timestamp: new Date(),
    technicalPanel,
    fundamentalPanel,
    tradingPanel,
    synthesis,
    totalDuration
  };
}

/**
 * Format multi-agent analysis as text report
 */
export function formatAnalysisReport(analysis: MultiAgentAnalysis): string {
  const lines: string[] = [];

  lines.push('='.repeat(80));
  lines.push(`MULTI-AGENT STOCK ANALYSIS: ${analysis.symbol}`);
  lines.push(`Market: ${analysis.market} | Date: ${analysis.timestamp.toLocaleString()}`);
  lines.push('='.repeat(80));
  lines.push('');

  // Technical Panel
  lines.push('📊 TECHNICAL ANALYSIS PANEL');
  lines.push('='.repeat(80));
  analysis.technicalPanel.forEach(agent => {
    lines.push(`\n### ${agent.agentName}`);
    lines.push(agent.analysis);
    lines.push('');
  });

  // Fundamental Panel
  lines.push('\n💼 FUNDAMENTAL ANALYSIS PANEL (Investment Committee)');
  lines.push('='.repeat(80));
  analysis.fundamentalPanel.forEach(agent => {
    lines.push(`\n### ${agent.agentName}`);
    lines.push(agent.analysis);
    lines.push('');
  });

  // Trading Panel
  lines.push('\n⚡ TRADING & RISK PANEL');
  lines.push('='.repeat(80));
  analysis.tradingPanel.forEach(agent => {
    lines.push(`\n### ${agent.agentName}`);
    lines.push(agent.analysis);
    lines.push('');
  });

  // Synthesis
  lines.push('\n🎯 FINAL INVESTMENT DECISION (Chief Investment Officer)');
  lines.push('='.repeat(80));
  lines.push(analysis.synthesis.analysis);
  lines.push('');

  // Performance Stats
  lines.push('\n📈 ANALYSIS PERFORMANCE');
  lines.push('='.repeat(80));
  lines.push(`Total Duration: ${(analysis.totalDuration / 1000).toFixed(1)}s`);
  lines.push(`Technical Panel: ${analysis.technicalPanel.reduce((sum, a) => sum + a.duration, 0)}ms`);
  lines.push(`Fundamental Panel: ${analysis.fundamentalPanel.reduce((sum, a) => sum + a.duration, 0)}ms`);
  lines.push(`Trading Panel: ${analysis.tradingPanel.reduce((sum, a) => sum + a.duration, 0)}ms`);
  lines.push(`Synthesis: ${analysis.synthesis.duration}ms`);
  lines.push('');

  return lines.join('\n');
}
