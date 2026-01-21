import { NextRequest, NextResponse } from 'next/server';
import { collectStockData } from '../../../lib/services/intelligence-hub';
import { orchestrateAnalysis } from '../../../lib/agents/orchestrator';
import { generateTradingSignal, formatTradingSignal } from '../../../lib/trading/signal-generator';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds for deep analysis

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const type = searchParams.get('type') || 'quick';

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol is required' },
      { status: 400 }
    );
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        error: 'ANTHROPIC_API_KEY not configured',
        message: 'Please add ANTHROPIC_API_KEY to your Vercel environment variables',
        symbol: symbol.toUpperCase(),
        type
      }, { status: 500 });
    }

    // Phase 1: Collect market data
    console.log(`Collecting data for ${symbol}...`);
    const marketData = await collectStockData(symbol, {
      includeTechnicals: true,
      includeFundamentals: type === 'deep',
      includeIndiaSpecific: symbol.includes('.NS') || symbol.includes('.BO'),
      historicalDays: 90
    });

    // Quick analysis - return just the market data
    if (type === 'quick') {
      return NextResponse.json({
        success: true,
        type: 'quick',
        symbol: marketData.symbol,
        market: marketData.market,
        timestamp: marketData.timestamp,
        price: marketData.price,
        fundamentals: marketData.fundamentals,
        technicals: marketData.technicals,
        indiaSpecific: marketData.indiaSpecific,
        dataQuality: marketData.dataQuality,
        message: 'Quick analysis complete. Use "deep" analysis for AI-powered insights.'
      });
    }

    // Phase 2: Deep analysis with 10 AI agents
    console.log(`Running deep analysis for ${symbol}...`);
    const analysis = await orchestrateAnalysis(marketData);

    // Phase 3: Generate trading signal
    console.log(`Generating trading signal for ${symbol}...`);
    const signalResult = generateTradingSignal(marketData, analysis);

    if (!signalResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to generate trading signal',
        errors: signalResult.errors,
        warnings: signalResult.warnings,
        symbol: marketData.symbol,
        market: marketData.market
      }, { status: 500 });
    }

    // Return comprehensive analysis
    return NextResponse.json({
      success: true,
      type: 'deep',
      symbol: marketData.symbol,
      market: marketData.market,
      timestamp: new Date().toISOString(),

      // Market data
      price: marketData.price,
      fundamentals: marketData.fundamentals,
      technicals: marketData.technicals,
      indiaSpecific: marketData.indiaSpecific,
      dataQuality: marketData.dataQuality,

      // Multi-agent analysis
      analysis: {
        technical: analysis.technicalPanel.map(a => ({
          agentId: a.agentId,
          agentName: a.agentName,
          analysis: a.analysis.substring(0, 500) + '...' // Truncate for response size
        })),
        fundamental: analysis.fundamentalPanel.map(a => ({
          agentId: a.agentId,
          agentName: a.agentName,
          analysis: a.analysis.substring(0, 500) + '...'
        })),
        trading: analysis.tradingPanel.map(a => ({
          agentId: a.agentId,
          agentName: a.agentName,
          analysis: a.analysis.substring(0, 500) + '...'
        })),
        synthesis: {
          agentId: analysis.synthesis.agentId,
          agentName: analysis.synthesis.agentName,
          analysis: analysis.synthesis.analysis
        },
        totalDuration: analysis.totalDuration
      },

      // Trading signal
      signal: signalResult.signal ? {
        signal: signalResult.signal.signal,
        confidence: signalResult.signal.confidence,
        conviction: signalResult.signal.conviction,
        entryPrice: signalResult.signal.entryPrice,
        stopLoss: signalResult.signal.stopLoss,
        takeProfit1: signalResult.signal.takeProfit1,
        takeProfit2: signalResult.signal.takeProfit2,
        timeHorizon: signalResult.signal.timeHorizon,
        positionSizing: signalResult.signal.positionSizing,
        riskMetrics: signalResult.signal.riskMetrics,
        validation: signalResult.signal.validation,
        consensus: signalResult.signal.consensus,
        reasoning: signalResult.signal.reasoning,
        implementation: signalResult.signal.implementation
      } : null,

      warnings: signalResult.warnings,

      message: 'Deep analysis complete with 10 AI agents'
    });

  } catch (error) {
    console.error('Analysis error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      symbol: symbol.toUpperCase(),
      type,
      message: 'Analysis failed. Please check logs for details.'
    }, { status: 500 });
  }
}
