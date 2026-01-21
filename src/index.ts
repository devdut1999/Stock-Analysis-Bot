#!/usr/bin/env node

/**
 * Stock Analysis Bot - CLI Entry Point
 */

import { Command } from 'commander';
import dotenv from 'dotenv';
import { detectMarket, getDisplayName, getMarketInfo } from './services/market-detector.js';
import { collectStockData, generateAnalysisSummary } from './services/intelligence-hub.js';
import { orchestrateAnalysis, formatAnalysisReport } from './agents/orchestrator.js';

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name('stock-bot')
  .description('Multi-market stock analysis bot with Claude Agent SDK')
  .version('1.0.0');

// Analyze command
program
  .command('analyze <symbol>')
  .description('Analyze a stock (auto-detects US/India market)')
  .option('-t, --type <type>', 'Analysis type: comprehensive, quick, technical, fundamental', 'comprehensive')
  .option('-o, --output <format>', 'Output format: json, text', 'text')
  .option('--no-fundamentals', 'Skip fundamental analysis')
  .option('--no-technicals', 'Skip technical analysis')
  .option('--no-india-specific', 'Skip India-specific data')
  .action(async (symbol: string, options) => {
    try {
      console.log('\n🤖 Stock Analysis Bot - Phase 1 (Indian Market)\n');

      // Validate symbol
      const trimmed = symbol.trim();
      if (!trimmed) {
        console.error('❌ Error: Symbol cannot be empty');
        process.exit(1);
      }

      // Detect market
      const detected = detectMarket(trimmed);
      console.log(`📊 Analyzing: ${getDisplayName(detected)}`);
      console.log(`ℹ️  ${getMarketInfo(detected)}\n`);

      // Check if US market
      if (detected.market === 'US') {
        console.error('⚠️  US market support is coming in Phase 7.');
        console.error('Currently, only Indian stocks (NSE/BSE) are supported.\n');
        console.error('Examples of Indian stocks:');
        console.error('  - RELIANCE.NS (Reliance Industries on NSE)');
        console.error('  - TCS.BO (Tata Consultancy Services on BSE)');
        console.error('  - INFY (Infosys - auto-detected as NSE)');
        process.exit(1);
      }

      // Collect data
      console.log('🔄 Collecting market data...\n');

      const data = await collectStockData(trimmed, {
        includeFundamentals: options.fundamentals,
        includeTechnicals: options.technicals,
        includeIndiaSpecific: options.indiaSpecific
      });

      // Output results
      if (options.output === 'json') {
        console.log(JSON.stringify(data, null, 2));
      } else {
        const summary = generateAnalysisSummary(data);
        console.log(summary);

        console.log('\n📈 Analysis Complete!');
        console.log('\nNext Steps:');
        console.log('  1. Multi-agent analysis (10 agents with different perspectives) - Coming in Phase 2');
        console.log('  2. Trading signal generation with safety validation - Phase 3');
        console.log('  3. Backtesting and performance metrics - Phase 4');
        console.log('  4. Alert system (Telegram/Email) - Phase 5');
      }
    } catch (error) {
      console.error('\n❌ Error:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Analyze-deep command (Multi-agent analysis)
program
  .command('analyze-deep <symbol>')
  .description('Deep analysis using 10 AI agents (Technical, Fundamental, Trading panels + CIO synthesis)')
  .option('-o, --output <format>', 'Output format: text, json', 'text')
  .option('--no-fundamentals', 'Skip fundamental analysis')
  .option('--no-technicals', 'Skip technical analysis')
  .option('--no-india-specific', 'Skip India-specific data')
  .action(async (symbol: string, options) => {
    try {
      console.log('\n🤖 Stock Analysis Bot - Phase 2 (Multi-Agent Analysis)\n');

      // Validate symbol
      const trimmed = symbol.trim();
      if (!trimmed) {
        console.error('❌ Error: Symbol cannot be empty');
        process.exit(1);
      }

      // Check for API key
      if (!process.env.ANTHROPIC_API_KEY) {
        console.error('❌ Error: ANTHROPIC_API_KEY not set in environment');
        console.error('Please add your API key to .env file:');
        console.error('  ANTHROPIC_API_KEY=sk-ant-your-key-here');
        process.exit(1);
      }

      // Detect market
      const detected = detectMarket(trimmed);
      console.log(`📊 Analyzing: ${getDisplayName(detected)}`);
      console.log(`ℹ️  ${getMarketInfo(detected)}\n`);

      // Check if US market
      if (detected.market === 'US') {
        console.error('⚠️  US market support is coming in Phase 7.');
        console.error('Currently, only Indian stocks (NSE/BSE) are supported.\n');
        process.exit(1);
      }

      // Phase 1: Collect market data
      console.log('🔄 Phase 1: Collecting comprehensive market data...\n');

      const marketData = await collectStockData(trimmed, {
        includeFundamentals: options.fundamentals,
        includeTechnicals: options.technicals,
        includeIndiaSpecific: options.indiaSpecific
      });

      console.log(`✓ Data collection complete (${marketData.dataQuality.fundamentalsAvailable ? 'with' : 'without'} fundamentals, ${marketData.dataQuality.technicalsAvailable ? 'with' : 'without'} technicals)\n`);

      // Phase 2: Multi-agent analysis
      console.log('🤖 Phase 2: Running multi-agent analysis...');
      console.log('  • Technical Panel: 3 agents');
      console.log('  • Fundamental Panel: 4 agents (Buffett, Munger, Ackman, Dalio)');
      console.log('  • Trading & Risk Panel: 3 agents');
      console.log('  • Synthesizer: 1 CIO agent\n');

      const analysis = await orchestrateAnalysis(marketData);

      // Output results
      if (options.output === 'json') {
        console.log(JSON.stringify(analysis, null, 2));
      } else {
        const report = formatAnalysisReport(analysis);
        console.log(report);

        console.log('\n✨ Multi-agent analysis complete!');
        console.log(`\nTotal execution time: ${(analysis.totalDuration / 1000).toFixed(1)}s`);
        console.log(`Agents consulted: ${analysis.technicalPanel.length + analysis.fundamentalPanel.length + analysis.tradingPanel.length + 1}`);
      }
    } catch (error) {
      console.error('\n❌ Error:', error instanceof Error ? error.message : 'Unknown error');
      if (error instanceof Error && error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// Detect command (for testing market detection)
program
  .command('detect <symbol>')
  .description('Detect which market a stock belongs to')
  .action((symbol: string) => {
    const detected = detectMarket(symbol);
    console.log('\nMarket Detection Result:');
    console.log(`  Symbol: ${detected.rawSymbol}`);
    console.log(`  Market: ${detected.market}`);
    console.log(`  Exchange: ${detected.exchange || 'Not specified'}`);
    console.log(`  Normalized: ${detected.normalizedSymbol}`);
    console.log(`  Display: ${getDisplayName(detected)}`);
  });

// Info command
program
  .command('info')
  .description('Show system information and API status')
  .action(() => {
    console.log('\n🤖 Stock Analysis Bot - System Information\n');

    console.log('Current Phase: Phase 2 - Multi-Agent Analysis System ✓');
    console.log('Supported Markets: Indian stocks (NSE, BSE)');
    console.log('US Market Support: Coming in Phase 7\n');

    console.log('Available Analysis Modes:');
    console.log('  ✓ Quick Analysis (analyze): Data collection only');
    console.log('  ✓ Deep Analysis (analyze-deep): 10 AI agents + synthesis\n');

    console.log('AI Agents (analyze-deep):');
    console.log('  Technical Panel:');
    console.log('    • Chart Pattern Analyst');
    console.log('    • Technical Indicators Specialist');
    console.log('    • Support & Resistance Expert');
    console.log('  Fundamental Panel (Investment Committee):');
    console.log('    • Warren Buffett (Value Investing)');
    console.log('    • Charlie Munger (Mental Models)');
    console.log('    • Bill Ackman (Activist Investing)');
    console.log('    • Ray Dalio (Macro & Risk Parity)');
    console.log('  Trading & Risk Panel:');
    console.log('    • Momentum Trader (Steve Cohen style)');
    console.log('    • Sentiment Analyst');
    console.log('    • Risk Manager');
    console.log('  Synthesizer:');
    console.log('    • Chief Investment Officer (CIO)\n');

    console.log('Available Data Sources:');
    console.log('  ✓ Yahoo Finance (Real-time prices, fundamentals)');
    console.log('  ✓ Screener.in (Promoter holding, shareholding pattern)');
    console.log('  ✓ NSE India (FII/DII activity, F&O data)');
    console.log('  ✓ Technical Indicators (RSI, MACD, Bollinger, etc.)');
    console.log('  ⏳ News Sentiment Analysis (Phase 3)\n');

    console.log('Environment Variables:');
    console.log(`  ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✓ Set (Required for analyze-deep)' : '✗ Not set'}`);
    console.log(`  ALPHA_VANTAGE_API_KEY: ${process.env.ALPHA_VANTAGE_API_KEY ? '✓ Set' : '○ Optional'}`);
    console.log(`  TWELVE_DATA_API_KEY: ${process.env.TWELVE_DATA_API_KEY ? '✓ Set' : '○ Optional'}`);
    console.log(`  INDIAN_STOCK_API_URL: ${process.env.INDIAN_STOCK_API_URL || 'Using default'}\n`);

    console.log('Coming Next (Phase 3-7):');
    console.log('  Phase 3: Signal validator and risk manager');
    console.log('  Phase 4: Backtesting framework');
    console.log('  Phase 5: Report generators and alert system');
    console.log('  Phase 6: Live trading integration (paper trading)');
    console.log('  Phase 7: US market support\n');
  });

// Examples command
program
  .command('examples')
  .description('Show usage examples')
  .action(() => {
    console.log('\n📚 Usage Examples\n');

    console.log('1. Quick analysis (Phase 1 - Data only):');
    console.log('   $ npm run dev analyze RELIANCE.NS');
    console.log('   $ npm run dev analyze TCS.BO');
    console.log('   $ npm run dev analyze INFY\n');

    console.log('2. Deep multi-agent analysis (Phase 2 - 10 AI agents):');
    console.log('   $ npm run dev analyze-deep RELIANCE.NS');
    console.log('   $ npm run dev analyze-deep INFY\n');

    console.log('3. Get JSON output:');
    console.log('   $ npm run dev analyze RELIANCE.NS --output json');
    console.log('   $ npm run dev analyze-deep RELIANCE.NS --output json\n');

    console.log('4. Quick technical-only analysis:');
    console.log('   $ npm run dev analyze INFY --no-fundamentals --no-india-specific\n');

    console.log('5. Detect market for a symbol:');
    console.log('   $ npm run dev detect AAPL');
    console.log('   $ npm run dev detect RELIANCE.NS\n');

    console.log('6. Check system status:');
    console.log('   $ npm run dev info\n');
  });

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
