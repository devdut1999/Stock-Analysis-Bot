# Financial Data API Comparison for Stock Analysis Bot

**Last Updated**: January 20, 2026
**Purpose**: Compare free and paid financial data APIs for multi-market (US + Indian) stock analysis

---

## Executive Summary

Based on research and testing, here's the recommended API strategy for our bot:

### 🇮🇳 For Indian Market (Phase 1 - Current):
1. **Primary**: Screener.in (web scraping) - ✅ Implemented
2. **Backup**: Indian Stock Market API (Vercel) - ✅ Implemented
3. **Phase 2 Upgrade**: Twelve Data or EODHD (paid tier)

### 🇺🇸 For US Market (Phase 7):
1. **Primary**: Marketstack or Alpha Vantage
2. **Backup**: Finnhub or IEX Cloud
3. **Enterprise**: Twelve Data (multi-asset coverage)

---

## API Comparison Table

| API | Free Tier | Indian Stocks | US Stocks | Real-time | Fundamentals | Options Data | Best For |
|-----|-----------|---------------|-----------|-----------|--------------|--------------|----------|
| **Marketstack** | ❌ ($9/mo min) | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No | Enterprise apps |
| **Alpha Vantage** | ✅ 25 req/day | ⚠️ Limited | ✅ Yes | ⚠️ 15min delay | ✅ Yes | ❌ No | Individual developers |
| **Twelve Data** | ✅ 800 req/day | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No | Multi-market apps |
| **Yahoo Finance** | ✅ Unofficial | ⚠️ Limited | ✅ Yes | ✅ Yes | ⚠️ Basic | ✅ Yes | Quick prototypes |
| **Finnhub** | ✅ 60 req/min | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No | US-focused apps |
| **IEX Cloud** | ✅ 50K msgs/mo | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No | US startups |
| **EODHD** | ✅ 20 req/day | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No | Global coverage |
| **Screener.in** | ✅ Web scraping | ✅ Yes | ❌ No | ❌ No | ✅ Excellent | ❌ No | Indian fundamentals |
| **Indian Stock API** | ✅ Unlimited | ✅ Yes | ❌ No | ⚠️ Delayed | ⚠️ Basic | ❌ No | Free Indian data |

---

## Detailed API Reviews

### 1. Marketstack 💼

**Website**: https://marketstack.com/
**Pricing**: $9/mo (Basic), $49/mo (Professional), $99/mo (Business)
**Free Tier**: ❌ No free tier

#### Pros:
- ✅ **Enterprise-grade infrastructure** with 99.9% uptime SLA
- ✅ **Global market coverage** (70+ exchanges, 125,000+ tickers)
- ✅ **Indian stock support** (NSE, BSE)
- ✅ **Real-time data** with <100ms latency
- ✅ **Historical data** going back 20+ years
- ✅ **Excellent documentation** with code examples
- ✅ **JSON & CSV** export formats

#### Cons:
- ❌ No free tier (minimum $9/month)
- ❌ No options chain data
- ❌ Rate limits on lower tiers

#### Best For:
- SaaS companies building financial applications
- Production applications requiring reliability
- Multi-market apps (US + India)

#### Indian Market Support:
- NSE (National Stock Exchange)
- BSE (Bombay Stock Exchange)
- Historical data from 2000+
- Intraday data available

---

### 2. Alpha Vantage 🆓

**Website**: https://www.alphavantage.co/
**Pricing**: Free (25 req/day), $49/mo (75 req/min), $149/mo (Premium)
**Free Tier**: ✅ 25 API calls/day, 5 calls/minute

#### Pros:
- ✅ **Popular & well-documented** with extensive community support
- ✅ **Technical indicators** pre-calculated (RSI, MACD, Bollinger, etc.)
- ✅ **Fundamental data** (earnings, balance sheets, income statements)
- ✅ **Forex & crypto** data included
- ✅ **CSV output** option for Excel integration
- ✅ **Python, JS, R** libraries available

#### Cons:
- ❌ **Strict rate limit** on free tier (25 calls/day = ~1 stock analysis/hour)
- ⚠️ **15-minute delay** on real-time data (free tier)
- ⚠️ **Limited Indian stock coverage** (major stocks only)
- ❌ No dedicated India-specific metrics (FII/DII, promoter holding)

#### Best For:
- Individual developers & hobbyists
- Educational projects
- Low-frequency analysis (1-2 stocks per day)

#### API Example:
```bash
# Daily time series
https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=RELIANCE.BSE&apikey=YOUR_KEY

# Technical indicators (RSI)
https://www.alphavantage.co/query?function=RSI&symbol=IBM&interval=daily&time_period=14&series_type=close&apikey=YOUR_KEY
```

#### Verdict for Our Bot:
- ⚠️ **Phase 1 (India)**: Not recommended (limited coverage, strict rate limits)
- ✅ **Phase 7 (US)**: Good for free tier, upgrade to paid for production

---

### 3. Twelve Data 🌍

**Website**: https://twelvedata.com/
**Pricing**: Free (800 req/day), $9/mo (8000 req/day), $29/mo (Premium)
**Free Tier**: ✅ 800 API calls/day, 8 calls/minute

#### Pros:
- ✅ **Excellent free tier** (800 requests/day = 26+ stocks analyzed/day)
- ✅ **Multi-asset support** (stocks, forex, crypto, ETFs)
- ✅ **Global coverage** including Indian stocks (NSE, BSE)
- ✅ **WebSocket** support for real-time data
- ✅ **Technical indicators** API endpoints
- ✅ **Time series** data with various intervals
- ✅ **CSV & JSON** formats

#### Cons:
- ⚠️ **India-specific data limited** (no FII/DII, promoter holding)
- ⚠️ **Rate limiting** on free tier can affect analysis speed
- ❌ No options chain data

#### Best For:
- Multi-market applications
- Developers needing good free tier
- Apps requiring diverse asset classes

#### API Example:
```bash
# Indian stock quote
https://api.twelvedata.com/quote?symbol=RELIANCE.NSE&apikey=YOUR_KEY

# Technical indicators
https://api.twelvedata.com/rsi?symbol=AAPL&interval=1day&apikey=YOUR_KEY
```

#### Verdict for Our Bot:
- ✅ **Phase 1 (India)**: Recommended as backup/upgrade path
- ✅ **Phase 7 (US)**: Excellent for multi-market support

---

### 4. Yahoo Finance API 📊

**Website**: https://finance.yahoo.com/ (unofficial APIs)
**Pricing**: Free (unofficially, no official API)
**Free Tier**: ✅ Unlimited (but unofficial, risky)

#### Pros:
- ✅ **Completely free** (no API key needed)
- ✅ **Comprehensive data** (price, fundamentals, news, options)
- ✅ **Global coverage** including Indian stocks (`.NS`, `.BO` suffixes)
- ✅ **Options chain data** available
- ✅ **Real-time quotes** (with minimal delay)
- ✅ **Community libraries** (yfinance in Python, yahoo-finance2 in Node.js)

#### Cons:
- ❌ **No official API** - could break anytime
- ❌ **No SLA or support**
- ❌ **Rate limiting** can occur (IP-based blocks)
- ⚠️ **Terms of Service** unclear on scraping
- ❌ **No technical indicators** (need to calculate yourself)

#### Best For:
- Quick prototypes & MVPs
- Personal projects
- Testing & development

#### Verdict for Our Bot:
- ⚠️ **Phase 1 (India)**: Risky for production (use as last resort)
- ⚠️ **Phase 7 (US)**: OK for development, not for production

---

### 5. Finnhub 🚀

**Website**: https://finnhub.io/
**Pricing**: Free (60 req/min), $39/mo (300 req/min), Custom (Enterprise)
**Free Tier**: ✅ 60 API calls/minute (generous!)

#### Pros:
- ✅ **Generous free tier** (60 req/min = 3600/hour)
- ✅ **Real-time data** with WebSocket support
- ✅ **Fundamental data** (financials, earnings, insider transactions)
- ✅ **News & sentiment** analysis included
- ✅ **Economic indicators** and calendars
- ✅ **AI-powered insights** (premium feature)
- ✅ **Excellent documentation**

#### Cons:
- ❌ **No Indian stock support** (US markets only)
- ❌ Limited to US exchanges (NYSE, NASDAQ, AMEX)
- ⚠️ Some advanced features require paid plans

#### Best For:
- US-focused applications
- Apps requiring news & sentiment analysis
- Real-time trading bots

#### Verdict for Our Bot:
- ❌ **Phase 1 (India)**: Not applicable (US only)
- ✅ **Phase 7 (US)**: Excellent choice for free US data

---

### 6. IEX Cloud ☁️

**Website**: https://iexcloud.io/
**Pricing**: Free (50K messages/mo), $9/mo (500K msgs), Custom (Enterprise)
**Free Tier**: ✅ 50,000 messages/month (1,600/day)

#### Pros:
- ✅ **Good free tier** (50K messages/month)
- ✅ **Real-time quotes** (IEX exchange)
- ✅ **Company financials** and earnings data
- ✅ **News feed** integration
- ✅ **Economic data** and statistics
- ✅ **CSV bulk data** downloads available

#### Cons:
- ❌ **No Indian stock support** (US only)
- ⚠️ **Message-based pricing** can be confusing
- ⚠️ Some endpoints expensive (10-100 messages per call)
- ❌ Limited historical data on free tier

#### Best For:
- US fintech startups
- Trading applications (IEX exchange focus)
- Apps requiring company filings

#### Verdict for Our Bot:
- ❌ **Phase 1 (India)**: Not applicable
- ✅ **Phase 7 (US)**: Good option for free US data

---

### 7. EODHD (End of Day Historical Data) 📈

**Website**: https://eodhd.com/
**Pricing**: Free (20 req/day), $19.99/mo (100K req/day), $79.99/mo (Professional)
**Free Tier**: ✅ 20 API calls/day

#### Pros:
- ✅ **Global coverage** (150,000+ tickers, 70+ exchanges)
- ✅ **Indian stock support** (NSE, BSE with good coverage)
- ✅ **Fundamental data** (balance sheets, income statements)
- ✅ **Historical data** going back decades
- ✅ **Stock screener API** (filter by metrics)
- ✅ **Bulk data downloads** available
- ✅ **Options data** (US markets)

#### Cons:
- ⚠️ **Very limited free tier** (20 calls/day = 1 stock/day)
- ❌ End-of-day data only (no intraday on free tier)
- ⚠️ **Paid tier required** for real-time or frequent updates

#### Best For:
- Global investment apps
- Portfolio trackers (end-of-day is sufficient)
- Screener apps requiring bulk filtering

#### Verdict for Our Bot:
- ⚠️ **Phase 1 (India)**: Free tier too limited, paid tier good option
- ✅ **Phase 7 (US)**: Excellent for global + US coverage (paid)

---

### 8. Screener.in 🇮🇳 (Web Scraping)

**Website**: https://www.screener.in/
**Pricing**: Free (web scraping), Premium features (~₹250/mo)
**Free Tier**: ✅ Unlimited (respectful scraping)

#### Pros:
- ✅ **Best Indian stock fundamentals** available
- ✅ **10 years of financial data** per company
- ✅ **Shareholding pattern** (Promoter, FII, DII breakdown)
- ✅ **Quality metrics** (ROE, ROCE, debt ratios)
- ✅ **Quarterly results** and annual reports
- ✅ **Credit ratings** and corporate governance data
- ✅ **Stock screener** with advanced filters
- ✅ **Completely free** for basic data

#### Cons:
- ❌ **No official API** (requires web scraping)
- ⚠️ **Rate limiting** required (be respectful)
- ❌ **No real-time data** (end-of-day only)
- ⚠️ **Page structure can change** (maintenance required)
- ❌ **US stocks not supported**

#### Best For:
- Indian stock analysis apps
- Fundamental analysis tools
- Educational projects

#### Implementation Status:
- ✅ **Already integrated** in [`src/tools/india-specific/screener.ts`](src/tools/india-specific/screener.ts)
- ✅ Rate limiter configured (20 req/min)
- ✅ Fallback to NSE API if needed

#### Verdict for Our Bot:
- ✅ **Phase 1 (India)**: **Primary recommendation** - best Indian data available
- ❌ **Phase 7 (US)**: Not applicable

---

### 9. Indian Stock Market API (Vercel) 🇮🇳

**Website**: https://indian-stock-api.vercel.app/
**Pricing**: Free
**Free Tier**: ✅ Unlimited (community project)

#### Pros:
- ✅ **Completely free** (no API key)
- ✅ **NSE & BSE support**
- ✅ **Simple API** (easy integration)
- ✅ **No rate limits** officially
- ✅ **Real-time-ish data** (some delay)

#### Cons:
- ⚠️ **Reliability issues** (500 errors common as we experienced)
- ⚠️ **Community project** (no SLA)
- ❌ **Limited fundamentals** (basic P/E, market cap only)
- ❌ **No India-specific metrics** (FII/DII, promoter)
- ⚠️ **May go offline** anytime

#### Best For:
- Quick prototypes
- Backup data source
- Development/testing

#### Implementation Status:
- ✅ **Already integrated** in [`src/tools/market-data/indian-api.ts`](src/tools/market-data/indian-api.ts)
- ✅ Fallback to mock data implemented
- ⚠️ Currently experiencing 500 errors (as of Jan 20, 2026)

#### Verdict for Our Bot:
- ⚠️ **Phase 1 (India)**: Good backup, not reliable as primary
- ❌ **Phase 7 (US)**: Not applicable

---

## Recommended API Strategy

### Phase 1: Indian Market (Current) 🇮🇳

#### Primary Stack:
1. **Screener.in** (web scraping) - Fundamentals, promoter holding, FII/DII ✅ IMPLEMENTED
2. **Indian Stock API** (Vercel) - Real-time prices, historical data ✅ IMPLEMENTED
3. **NSE India** (official website) - F&O data, bulk deals ✅ IMPLEMENTED

#### Backup/Upgrade Path:
- **Twelve Data** - Paid tier ($9/mo) for reliable real-time data
- **EODHD** - Paid tier ($19.99/mo) for comprehensive Indian + global data

#### Cost:
- **Current**: $0/month (all free sources)
- **Recommended Upgrade**: $9-20/month for production reliability

---

### Phase 7: US Market (Future) 🇺🇸

#### Recommended Primary:
1. **Finnhub** (free tier) - Real-time data, news, sentiment
   - 60 req/min free tier
   - Excellent documentation
   - Real-time WebSocket support

2. **Alpha Vantage** (free tier) - Technical indicators, fundamentals
   - 25 req/day for quick checks
   - Pre-calculated indicators save computation

#### Recommended Backup:
3. **IEX Cloud** (free tier) - Company financials, earnings
   - 50K messages/month
   - Good for fundamental data

#### Enterprise Option:
4. **Marketstack** (paid) - If scaling to 100+ users
   - $49/mo Professional tier
   - Reliable SLA
   - Both US + India support

#### Cost:
- **Free tier**: $0/month (Finnhub + Alpha Vantage)
- **Production**: $49/month (Marketstack Professional)

---

## Implementation Roadmap

### ✅ Completed (Phase 1):
- [x] Screener.in integration for Indian fundamentals
- [x] Indian Stock API for prices & historical data
- [x] NSE India for F&O data
- [x] Rate limiting for all sources
- [x] Fallback mechanisms

### 🚧 Next Steps (Phase 2-6):
- [ ] Test screener.in data quality with 10+ stocks
- [ ] Implement caching layer (1-hour cache for fundamentals)
- [ ] Add Twelve Data as paid backup (optional)
- [ ] Monitor API reliability and add alerting

### 📋 Future (Phase 7):
- [ ] Integrate Finnhub for US real-time data
- [ ] Add Alpha Vantage for US technical indicators
- [ ] Consider Marketstack upgrade path for production

---

## Cost Analysis

### Current Cost (Phase 1 - Indian Market):
- **Screener.in**: $0/month
- **Indian Stock API**: $0/month
- **NSE India**: $0/month
- **Total**: **$0/month** ✅

### Recommended Upgrade (Phase 1):
- **Twelve Data Basic**: $9/month
- **Total**: **$9/month**

### Future Cost (Phase 7 - US + Indian):
- **Finnhub Free**: $0/month
- **Alpha Vantage Free**: $0/month
- **Screener.in**: $0/month
- **Total**: **$0/month** (free tier)

### Enterprise Cost (Production):
- **Marketstack Professional**: $49/month
- **Twelve Data Premium**: $29/month
- **Total**: **$78/month**

---

## Decision Matrix

| Scenario | Recommended APIs | Cost | Reliability |
|----------|------------------|------|-------------|
| **Development (India)** | Screener.in + Indian API | $0 | Medium |
| **Production (India)** | Screener.in + Twelve Data | $9/mo | High |
| **Development (US)** | Finnhub + Alpha Vantage | $0 | Medium |
| **Production (US + India)** | Marketstack + Screener.in | $49/mo | Very High |
| **Enterprise (Global)** | Marketstack + Twelve Data + Screener.in | $78/mo | Enterprise |

---

## Key Takeaways

1. **For Indian stocks**: Screener.in (scraping) is **best for fundamentals**, but needs reliable price data backup
2. **For US stocks**: Finnhub has best free tier (60 req/min)
3. **For production**: Invest in Marketstack ($49/mo) or Twelve Data ($29/mo)
4. **For multi-asset**: Twelve Data supports stocks, forex, crypto
5. **For options data**: Yahoo Finance (unofficial) or EODHD (paid)

---

## Conclusion

### Current Status (Phase 1):
✅ **Screener.in** provides excellent Indian fundamentals for free
✅ **Indian Stock API** works as backup for prices (with reliability issues)
✅ **No cost** for development and testing

### Recommendation:
- ✅ **Keep current setup** for Phase 1 development
- ⚠️ **Add Twelve Data Basic** ($9/mo) before production launch
- 📅 **Reevaluate** when moving to Phase 7 (US stocks)

**Sources**:
- [Marketstack Documentation](https://marketstack.com/documentation)
- [Alpha Vantage Documentation](https://www.alphavantage.co/documentation/)
- [Twelve Data API Reference](https://twelvedata.com/docs)
- [Finnhub API Documentation](https://finnhub.io/docs/api)
- [IEX Cloud API](https://iexcloud.io/docs/api/)
- [EODHD API Docs](https://eodhd.com/financial-apis/)
- [Screener.in](https://www.screener.in/)
