# Multi-Market Stock Analysis Bot

A comprehensive stock analysis bot powered by Claude Agent SDK that supports both US and Indian equity markets with multi-agent architecture for diverse investment perspectives.

## 🎯 Features

- **Multi-Market Support**: Automatically detects and analyzes stocks from US (NYSE, NASDAQ) and Indian (NSE, BSE) markets
- **10-Agent Investment Committee**: Diverse perspectives from technical analysts, legendary investors (Buffett, Munger, Ackman, Dalio), and risk managers
- **Trading Signal Generation**: Validated buy/sell signals with entry, stop-loss, and take-profit levels
- **India-Specific Analysis**: FII/DII tracking, promoter holding, F&O data, SEBI compliance checks
- **Comprehensive Reports**: JSON, HTML, and Markdown output formats
- **Safety-First Approach**: Consensus validation, risk limits, and backtesting before live trading

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- Anthropic API key (required)
- Optional: Market data API keys (Alpha Vantage, Twelve Data, etc.)

### Installation

```bash
# Clone and navigate to project
cd /Users/dev/Projects/Stock

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Add your Anthropic API key to .env
# ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### Basic Usage (Phase 1 - Indian Market Only)

```bash
# Analyze an Indian stock (auto-detected as NSE)
npm run dev analyze INFY

# Analyze with explicit exchange suffix
npm run dev analyze RELIANCE.NS
npm run dev analyze TCS.BO

# Quick technical-only analysis
npm run dev analyze INFY -- --no-fundamentals --no-india-specific

# JSON output
npm run dev analyze RELIANCE.NS -- --output json

# US stocks blocked in Phase 1 (coming in Phase 7)
npm run dev analyze AAPL
# ⚠️  Output: "US market support is coming in Phase 7."
```

## 📁 Project Structure

```
stock-analysis-bot/
├── src/
│   ├── agents/           # AI agents (orchestrator, fundamental, technical, trading)
│   ├── tools/            # MCP tools for data collection
│   │   ├── market-data/  # US & India market data fetchers
│   │   ├── technical/    # Technical indicator calculators
│   │   ├── fundamental/  # Fundamental data fetchers
│   │   └── india-specific/  # FII/DII, promoter, F&O tools
│   ├── services/         # Core services (detector, hub, rate limiter)
│   ├── trading/          # Signal validator, risk manager
│   ├── backtesting/      # Historical performance testing
│   ├── reporters/        # Report generators (JSON, HTML, Markdown)
│   ├── integrations/     # Trading platform adapters
│   ├── alerts/           # Telegram, email notifications
│   ├── types/            # TypeScript type definitions
│   └── index.ts          # CLI entry point
└── examples/             # Usage examples

```

## 🧠 Agent Architecture

### Technical Panel
- **Chart Pattern Agent**: Candlestick patterns, chart formations, trends
- **Indicators Agent**: RSI, MACD, Bollinger Bands, moving averages
- **Support/Resistance Agent**: Key levels, Fibonacci retracements

### Fundamental Panel (Investment Committee)
- **Warren Buffett**: Value investing, economic moats, intrinsic value
- **Charlie Munger**: Mental models, contrarian analysis, avoiding mistakes
- **Bill Ackman**: Activist opportunities, catalysts, corporate governance
- **Ray Dalio**: Macroeconomic analysis, risk parity, portfolio fit

### Trading/Risk Panel
- **Momentum Trader (Steve Cohen)**: Entry/exit timing, position sizing
- **Sentiment Analyst**: News analysis, market psychology
- **Risk Manager**: Volatility assessment, maximum drawdown, liquidity

### Synthesizer
- **Chief Investment Officer**: Combines all analyses into final recommendation

## 🌏 Market Detection

The bot automatically detects markets from symbol format:

```typescript
// US stocks
AAPL → US (NYSE/NASDAQ)
MSFT → US
GOOGL → US

// Indian stocks
RELIANCE.NS → India (NSE)
TCS.BO → India (BSE)
INFY → India (auto-detected from known tickers)
```

## 🔑 API Keys

### Free Tier (Recommended to Start)

```env
# US Market Data
ALPHA_VANTAGE_API_KEY=demo  # 25 calls/day
TWELVE_DATA_API_KEY=demo    # 800 calls/day

# Indian Market Data
INDIAN_STOCK_API_URL=https://indian-stock-api.vercel.app/api  # No key needed

# Required
ANTHROPIC_API_KEY=sk-ant-xxx  # Get from console.anthropic.com
```

### Paid Upgrades (Optional)

```env
# US real-time data
POLYGON_API_KEY=xxx         # $89/mo

# Indian real-time data
TRUEDATA_API_KEY=xxx        # ~₹2000/mo ($24/mo)
BREEZE_API_KEY=xxx          # Free with ICICI Direct account
```

## 📊 Analysis Modes

### Comprehensive Mode (Default)
- All 10 agents execute in parallel
- ~2 minutes, ~$1.65 per analysis
- Best for: Major investment decisions, portfolio allocation

### Quick Mode
- 5 key agents (technical + fundamental leaders + risk)
- ~30 seconds, ~$0.60 per analysis
- Best for: Daily screening, rapid decisions

### Technical-Only Mode
- Chart patterns + indicators + support/resistance
- ~10 seconds, ~$0.20 per analysis
- Best for: Day trading, entry/exit timing

### Fundamental-Only Mode
- Investment committee only (Buffett/Munger/Ackman/Dalio)
- ~1 minute, ~$1.00 per analysis
- Best for: Long-term portfolio building

## 🛡️ Safety Features

### Trading Signal Validation
- ✅ Minimum 60% agent consensus required
- ✅ Technical confirmation at support/resistance
- ✅ Mandatory stop-loss on every signal
- ✅ Position size limits (max 20% per stock)
- ✅ Liquidity checks (min volume requirements)
- ✅ Circuit breaker avoidance (India: 10/15/20%, US: 7/13/20%)

### Risk Management
- Maximum drawdown monitoring
- Portfolio concentration limits
- Volatility filters (block trades when VIX >35)
- Earnings blackout (24 hours before announcements)
- Sentiment filters (extreme negative sentiment blocking)

## 📈 Output Examples

### Trading Signal Output
```json
{
  "signal": "BUY",
  "confidence": 82,
  "positionSize": 15,
  "entryPrice": 2850.00,
  "stopLoss": 2750.00,
  "takeProfit": 3100.00,
  "timeHorizon": "swing",
  "validations": {
    "consensusReached": true,
    "technicalAlignment": true,
    "riskWithinLimits": true,
    "sufficientLiquidity": true
  },
  "reasoning": {
    "bullishFactors": [
      "Strong promoter holding (68%) with zero pledge",
      "FII buying trend for 3 consecutive days",
      "RSI oversold at 28, bouncing from support",
      "Positive earnings surprise beat by 12%"
    ],
    "bearishFactors": [
      "Global macro headwinds from Fed policy",
      "Sector underperformance vs Nifty"
    ],
    "keyRisks": [
      "High volatility (beta 1.4)",
      "Regulatory risk in telecom sector"
    ]
  }
}
```

## 🔄 Development Status

### ✅ Completed (Phase 1 - Indian Market Data Collection)
- [x] Project structure and configuration
- [x] TypeScript setup with proper module resolution
- [x] Market detector service (US/India auto-detection)
- [x] Type definitions for markets, stock data, analysis
- [x] Environment configuration template
- [x] Package.json with all dependencies
- [x] Rate limiter service with token bucket algorithm
- [x] Indian Stock Market API integration (price, historical, fundamentals)
- [x] Technical indicators calculator (RSI, MACD, Bollinger, MA, support/resistance)
- [x] FII/DII institutional investor tracking (NSE India)
- [x] Promoter holding and pledge analysis
- [x] F&O data with Put-Call Ratio and Max Pain
- [x] Intelligence Hub service for data aggregation
- [x] CLI interface with analyze, detect, info, examples commands
- [x] Robust error handling with fallback mock data
- [x] End-to-end testing of Phase 1 pipeline

**Current Status**: Phase 1 fully functional with Indian market support. US market blocked (Phase 7).

### 🚧 In Progress (Phase 2)
- [ ] Multi-agent system implementation (10 agents)
- [ ] Investment committee (Buffett, Munger, Ackman, Dalio personas)
- [ ] Technical analysis panel (chart patterns, indicators)
- [ ] Trading/risk analysis panel (momentum, sentiment, risk)
- [ ] Synthesizer agent (CIO) for consensus building

### 📋 Planned (Phases 3-7)
- [ ] Phase 3: Signal validator and risk manager
- [ ] Phase 4: Backtesting framework with performance metrics
- [ ] Phase 5: Report generators (HTML/JSON) and alert system (Telegram/Email)
- [ ] Phase 6: Live trading integration (paper trading first)
  - [ ] Trading platform integrations (Alpaca, Zerodha)
  - [ ] Portfolio tracking
  - [ ] Performance monitoring
- [ ] Phase 7: US market support (Polygon, Alpha Vantage, Twelve Data)
- [ ] Future: Web dashboard interface

## 🤝 Contributing

This is a personal project. Contributions, issues, and feature requests are welcome!

## ⚠️ Disclaimer

**IMPORTANT**: This bot generates trading signals for educational and research purposes only.

- 🚫 Not financial advice
- 🚫 Past performance ≠ future results
- ✅ Always conduct your own due diligence
- ✅ Consult licensed financial advisors
- ✅ Paper trade extensively before live trading
- ✅ Never risk more than you can afford to lose

## 📚 Resources

- [Claude Agent SDK Docs](https://docs.anthropic.com/en/docs/agent-sdk/overview)
- [Alpha Vantage API](https://www.alphavantage.co/)
- [Twelve Data API](https://twelvedata.com/)
- [Indian Stock Market API](https://github.com/0xramm/Indian-Stock-Market-API)
- [Polygon.io Documentation](https://polygon.io/docs)

## 📄 License

MIT License - See LICENSE file for details

---

**Built with** ❤️ **using Claude Agent SDK**
