import { NextRequest, NextResponse } from 'next/server';
import { collectStockData } from '../../../lib/services/intelligence-hub';
import { orchestrateAnalysis } from '../../../lib/agents/orchestrator';
import { generateTradingSignal, formatTradingSignal } from '../../../lib/trading/signal-generator';
import { createClient } from '../../../lib/supabase/server';

export const runtime = 'nodejs'; // Use Node.js runtime for Anthropic SDK
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

  // Get user session for Upstox integration (optional)
  let userId: string | undefined;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id;
  } catch {
    // Anonymous user — will use Yahoo Finance
  }

  try {
    // Quick analysis - minimal data for fast loading
    if (type === 'quick') {
      const days = parseInt(searchParams.get('days') || '30', 10);
      const historicalDays = Math.min(Math.max(days, 7), 3650); // Clamp 7-3650
      console.log(`Quick analysis for ${symbol} (${historicalDays} days)...`);
      const marketData = await collectStockData(symbol, {
        includeTechnicals: true,
        includeFundamentals: false,
        includeIndiaSpecific: historicalDays <= 90, // Skip India-specific for chart-only fetches
        historicalDays,
        userId,
      });

      return NextResponse.json({
        success: true,
        type: 'quick',
        symbol: marketData.symbol,
        market: marketData.market,
        timestamp: marketData.timestamp,
        price: marketData.price,
        fundamentals: marketData.fundamentals,
        technicals: marketData.technicals,
        historical: marketData.historical,
        indiaSpecific: marketData.indiaSpecific,
        dataQuality: marketData.dataQuality,
        message: 'Quick analysis complete. Use "deep" analysis for AI-powered insights.'
      });
    }

    // Deep analysis - full data collection
    console.log(`Collecting full data for ${symbol}...`);
    const marketData = await collectStockData(symbol, {
      includeTechnicals: true,
      includeFundamentals: true,
      includeIndiaSpecific: true,
      historicalDays: 90,
      userId,
    });

    // Phase 2: Deep analysis with 10 AI agents (requires API key)
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: 'AI analysis requires ANTHROPIC_API_KEY',
        message: 'Deep analysis is not available. Market data is shown above.',
        symbol: symbol.toUpperCase(),
        type
      }, { status: 500 });
    }
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
