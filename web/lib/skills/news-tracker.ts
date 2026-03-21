/**
 * India Market News Tracker
 * Ported from indian-trading-skills: india-news-tracker/news_fetcher.py
 *
 * Fetches and categorizes Indian stock market news from RSS feeds:
 * - MoneyControl (Markets, News, Business)
 * - Economic Times (Markets, Stocks)
 * - LiveMint (Markets, Companies)
 * - Business Standard (Markets)
 * - NDTV Profit (Business)
 *
 * Features: Event classification, sentiment detection, impact scoring, sector/stock identification
 */

// ─── Types ───────────────────────────────────

export interface NewsItem {
  title: string;
  source: string;
  published: string;
  link: string;
  category: string;
  eventType: string;
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  impactScore: number;
  sectors: string[];
  stocksMentioned: string[];
  summary: string;
}

export interface NewsSource {
  name: string;
  fetchArticles(symbol: string, limit: number): Promise<NewsItem[]>;
}

interface RSSFeedConfig {
  url: string;
  source: string;
  category: string;
}

// ─── RSS Feed Sources ────────────────────────

export const RSS_FEEDS: Record<string, RSSFeedConfig> = {
  moneycontrol_markets: { url: 'https://www.moneycontrol.com/rss/marketreports.xml', source: 'MoneyControl', category: 'Markets' },
  moneycontrol_news: { url: 'https://www.moneycontrol.com/rss/latestnews.xml', source: 'MoneyControl', category: 'General' },
  moneycontrol_business: { url: 'https://www.moneycontrol.com/rss/business.xml', source: 'MoneyControl', category: 'Business' },
  et_markets: { url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms', source: 'Economic Times', category: 'Markets' },
  et_stocks: { url: 'https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms', source: 'Economic Times', category: 'Stocks' },
  livemint_markets: { url: 'https://www.livemint.com/rss/markets', source: 'LiveMint', category: 'Markets' },
  livemint_companies: { url: 'https://www.livemint.com/rss/companies', source: 'LiveMint', category: 'Companies' },
  business_standard: { url: 'https://www.business-standard.com/rss/markets-106.rss', source: 'Business Standard', category: 'Markets' },
  ndtv_business: { url: 'https://feeds.feedburner.com/ndtvprofit-latest', source: 'NDTV Profit', category: 'Business' },
};

// ─── Keyword Dictionaries ────────────────────

const EVENT_KEYWORDS: Record<string, string[]> = {
  Earnings: ['quarterly results', 'Q1', 'Q2', 'Q3', 'Q4', 'earnings', 'profit', 'revenue', 'net income', 'PAT', 'EBITDA', 'results declared', 'topline', 'bottomline', 'YoY growth', 'QoQ', 'guidance'],
  'Corporate Action': ['dividend', 'bonus', 'stock split', 'buyback', 'rights issue', 'face value', 'record date', 'ex-date', 'ex-dividend'],
  'M&A': ['acquisition', 'merger', 'demerger', 'takeover', 'stake sale', 'buyout', 'amalgamation', 'joint venture', 'strategic investment'],
  Management: ['CEO', 'MD', 'chairman', 'appointed', 'resigned', 'board', 'managing director', 'CFO', 'key managerial'],
  Regulatory: ['SEBI', 'RBI', 'circular', 'regulation', 'compliance', 'penalty', 'norm', 'guideline', 'framework', 'notification'],
  Institutional: ['FII', 'FPI', 'DII', 'mutual fund', 'bulk deal', 'block deal', 'institutional', 'promoter', 'insider trading', 'SAST'],
  IPO: ['IPO', 'initial public offering', 'listing', 'subscription', 'allotment', 'DRHP', 'RHP', 'anchor investor', 'OFS'],
  Macro: ['GDP', 'inflation', 'CPI', 'WPI', 'IIP', 'PMI', 'trade deficit', 'fiscal deficit', 'current account', 'unemployment'],
  Global: ['Fed', 'US market', 'Wall Street', 'Nasdaq', 'S&P 500', 'Dow Jones', 'crude oil', 'dollar', 'tariff', 'global', 'China', 'recession'],
  Rating: ['upgrade', 'downgrade', 'target price', 'outperform', 'underperform', 'buy rating', 'sell rating', 'hold rating', 'analyst'],
};

const BULLISH_KEYWORDS = ['rally', 'surge', 'soar', 'gain', 'jump', 'rise', 'bullish', 'record high', 'breakout', 'upgrade', 'outperform', 'beat estimate', 'strong results', 'positive', 'boom', 'recovery', 'expansion', 'growth', 'optimistic', 'buying', 'accumulate', 'all-time high'];
const BEARISH_KEYWORDS = ['crash', 'plunge', 'sink', 'fall', 'drop', 'decline', 'bearish', 'low', 'breakdown', 'downgrade', 'underperform', 'miss estimate', 'weak results', 'negative', 'slump', 'contraction', 'slowdown', 'pessimistic', 'selling', 'exit', '52-week low', 'correction', 'panic'];

const SECTOR_KEYWORDS: Record<string, string[]> = {
  Banking: ['bank', 'HDFC', 'ICICI', 'SBI', 'Kotak', 'Axis', 'NPA', 'NIM', 'credit growth', 'deposit'],
  IT: ['IT', 'TCS', 'Infosys', 'Wipro', 'HCL', 'Tech Mahindra', 'software', 'digital', 'AI', 'cloud'],
  Pharma: ['pharma', 'drug', 'FDA', 'ANDA', 'API', 'hospital', 'healthcare', 'Sun Pharma', 'Dr Reddy'],
  Auto: ['auto', 'Maruti', 'Tata Motors', 'Bajaj', 'Hero', 'EV', 'electric vehicle', 'sales data'],
  FMCG: ['FMCG', 'HUL', 'ITC', 'Nestle', 'Britannia', 'consumer', 'rural demand'],
  Realty: ['real estate', 'realty', 'DLF', 'Godrej Properties', 'housing', 'RERA'],
  Metal: ['metal', 'steel', 'Tata Steel', 'JSW', 'Hindalco', 'aluminium', 'iron ore', 'copper'],
  Energy: ['oil', 'gas', 'ONGC', 'Reliance', 'BPCL', 'IOC', 'crude', 'refining', 'energy'],
  Infra: ['infra', 'L&T', 'construction', 'highway', 'railway', 'smart city', 'cement'],
  Telecom: ['telecom', 'Airtel', 'Jio', 'Vodafone', '5G', 'spectrum', 'ARPU', 'subscriber'],
  Power: ['power', 'NTPC', 'electricity', 'renewable', 'solar', 'wind', 'grid', 'transmission'],
  Defence: ['defence', 'defense', 'HAL', 'BEL', 'BDL', 'missile', 'military', 'arms'],
};

const STOCK_NAME_TO_SYMBOL: Record<string, string> = {
  reliance: 'RELIANCE', tcs: 'TCS', infosys: 'INFY', infy: 'INFY',
  'hdfc bank': 'HDFCBANK', hdfcbank: 'HDFCBANK', 'icici bank': 'ICICIBANK',
  icicibank: 'ICICIBANK', sbi: 'SBIN', 'state bank': 'SBIN',
  kotak: 'KOTAKBANK', 'axis bank': 'AXISBANK', wipro: 'WIPRO',
  hcl: 'HCLTECH', 'tech mahindra': 'TECHM', 'bharti airtel': 'BHARTIARTL',
  airtel: 'BHARTIARTL', itc: 'ITC', 'hindustan unilever': 'HINDUNILVR',
  hul: 'HINDUNILVR', larsen: 'LT', 'l&t': 'LT', 'bajaj finance': 'BAJFINANCE',
  maruti: 'MARUTI', 'tata motors': 'TATAMOTORS', 'sun pharma': 'SUNPHARMA',
  titan: 'TITAN', 'asian paints': 'ASIANPAINT', adani: 'ADANIENT',
  mahindra: 'M&M', 'm&m': 'M&M', 'power grid': 'POWERGRID', ntpc: 'NTPC',
  ultratech: 'ULTRACEMCO', nestle: 'NESTLEIND', 'bajaj auto': 'BAJAJ-AUTO',
  'hero motocorp': 'HEROMOTOCO', 'dr reddy': 'DRREDDY', cipla: 'CIPLA',
  divis: 'DIVISLAB', grasim: 'GRASIM', britannia: 'BRITANNIA',
  godrej: 'GODREJCP', 'tata steel': 'TATASTEEL', 'jsw steel': 'JSWSTEEL',
  hindalco: 'HINDALCO', 'coal india': 'COALINDIA', ongc: 'ONGC',
  bpcl: 'BPCL', ioc: 'IOC', gail: 'GAIL', dlf: 'DLF', hal: 'HAL', bel: 'BEL',
};

const NIFTY50_STOCKS = new Set([
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'HINDUNILVR',
  'SBIN', 'BHARTIARTL', 'ITC', 'KOTAKBANK', 'LT', 'AXISBANK',
  'BAJFINANCE', 'MARUTI', 'TATAMOTORS', 'SUNPHARMA', 'TITAN',
  'ASIANPAINT', 'HCLTECH', 'WIPRO', 'NTPC', 'POWERGRID',
]);

// ─── Classification Functions ────────────────

export function classifyEvent(title: string, summary = ''): string {
  const text = (title + ' ' + summary).toLowerCase();
  const scores: Record<string, number> = {};

  for (const [eventType, keywords] of Object.entries(EVENT_KEYWORDS)) {
    const count = keywords.filter(kw => text.includes(kw.toLowerCase())).length;
    if (count > 0) scores[eventType] = count;
  }

  if (Object.keys(scores).length === 0) return 'General';
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
}

export function detectSentiment(title: string, summary = ''): 'Bullish' | 'Bearish' | 'Neutral' {
  const text = (title + ' ' + summary).toLowerCase();
  const bullScore = BULLISH_KEYWORDS.filter(kw => text.includes(kw)).length;
  const bearScore = BEARISH_KEYWORDS.filter(kw => text.includes(kw)).length;

  if (bullScore > bearScore && bullScore >= 2) return 'Bullish';
  if (bearScore > bullScore && bearScore >= 2) return 'Bearish';
  if (bullScore > 0 && bearScore === 0) return 'Bullish';
  if (bearScore > 0 && bullScore === 0) return 'Bearish';
  return 'Neutral';
}

export function detectSectors(title: string, summary = ''): string[] {
  const text = (title + ' ' + summary).toLowerCase();
  const sectors: string[] = [];

  for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw.toLowerCase()))) {
      sectors.push(sector);
    }
  }
  return sectors;
}

export function detectStocks(title: string, summary = ''): string[] {
  const text = (title + ' ' + summary).toLowerCase();
  const stocks: string[] = [];

  for (const [name, symbol] of Object.entries(STOCK_NAME_TO_SYMBOL)) {
    if (text.includes(name) && !stocks.includes(symbol)) {
      stocks.push(symbol);
    }
  }
  return stocks;
}

export function scoreImpact(item: NewsItem): number {
  let score = 3;

  const highImpact = ['M&A', 'Regulatory', 'Macro', 'IPO'];
  const mediumImpact = ['Earnings', 'Institutional', 'Rating', 'Global'];
  if (highImpact.includes(item.eventType)) score += 2;
  else if (mediumImpact.includes(item.eventType)) score += 1;

  if (item.sentiment !== 'Neutral') score += 1;
  if (item.stocksMentioned.some(s => NIFTY50_STOCKS.has(s))) score += 1;
  if (item.sectors.length >= 2) score += 1;

  return Math.min(10, Math.max(1, score));
}

// ─── RSS Fetching ────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

interface RSSEntry {
  title?: string;
  link?: string;
  published?: string;
  pubDate?: string;
  updated?: string;
  description?: string;
  summary?: string;
  'content:encoded'?: string;
}

async function parseRSSFeed(url: string): Promise<RSSEntry[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 StockBot/1.0' },
    });
    clearTimeout(timeout);

    if (!response.ok) return [];

    const xml = await response.text();

    // Simple XML parser for RSS items
    const items: RSSEntry[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];
      const getTag = (tag: string) => {
        const m = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(itemXml);
        return m ? (m[1] || m[2] || '').trim() : undefined;
      };

      items.push({
        title: getTag('title'),
        link: getTag('link'),
        published: getTag('pubDate') || getTag('published') || getTag('updated'),
        description: getTag('description'),
        summary: getTag('summary'),
      });
    }

    return items.slice(0, 20); // Limit per feed
  } catch {
    return [];
  }
}

// ─── Main Fetch Function ─────────────────────

export async function fetchNews(options: {
  stockFilter?: string;
  sectorFilter?: string;
  minImpact?: number;
  limit?: number;
} = {}): Promise<NewsItem[]> {
  const { stockFilter, sectorFilter, minImpact = 1, limit = 50 } = options;

  const feedPromises = Object.entries(RSS_FEEDS).map(async ([, config]) => {
    const entries = await parseRSSFeed(config.url);
    return entries.map(entry => {
      const title = entry.title || '';
      const summary = stripHtml(entry.description || entry.summary || '').slice(0, 300);

      const item: NewsItem = {
        title,
        source: config.source,
        published: entry.published || '',
        link: entry.link || '',
        category: config.category,
        eventType: classifyEvent(title, summary),
        sentiment: detectSentiment(title, summary),
        impactScore: 3,
        sectors: detectSectors(title, summary),
        stocksMentioned: detectStocks(title, summary),
        summary,
      };

      item.impactScore = scoreImpact(item);
      return item;
    });
  });

  const results = await Promise.allSettled(feedPromises);
  let allItems = results
    .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === 'fulfilled')
    .flatMap(r => r.value)
    .filter(item => item.title && item.impactScore >= minImpact);

  // Apply filters
  if (stockFilter) {
    const upper = stockFilter.toUpperCase();
    const lower = stockFilter.toLowerCase();
    allItems = allItems.filter(item =>
      item.stocksMentioned.includes(upper) ||
      item.title.toLowerCase().includes(lower) ||
      item.summary.toLowerCase().includes(lower)
    );
  }

  if (sectorFilter) {
    const lower = sectorFilter.toLowerCase();
    allItems = allItems.filter(item =>
      item.sectors.some(s => s.toLowerCase() === lower) ||
      item.title.toLowerCase().includes(lower)
    );
  }

  // Sort by impact (desc), deduplicate
  allItems.sort((a, b) => b.impactScore - a.impactScore || a.source.localeCompare(b.source));

  const seen = new Set<string>();
  const unique = allItems.filter(item => {
    const normalized = item.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 50);
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });

  return unique.slice(0, limit);
}

// ─── Aggregation Helpers ─────────────────────

export function getSentimentSummary(items: NewsItem[]): { bullish: number; bearish: number; neutral: number; overall: string } {
  const bullish = items.filter(i => i.sentiment === 'Bullish').length;
  const bearish = items.filter(i => i.sentiment === 'Bearish').length;
  const neutral = items.filter(i => i.sentiment === 'Neutral').length;
  const overall = bullish > bearish ? 'Bullish' : bearish > bullish ? 'Bearish' : 'Neutral';
  return { bullish, bearish, neutral, overall };
}

export function getSectorBreakdown(items: NewsItem[]): Record<string, { count: number; sentiment: string }> {
  const result: Record<string, { count: number; bullish: number; bearish: number }> = {};

  for (const item of items) {
    for (const sector of item.sectors) {
      if (!result[sector]) result[sector] = { count: 0, bullish: 0, bearish: 0 };
      result[sector].count++;
      if (item.sentiment === 'Bullish') result[sector].bullish++;
      if (item.sentiment === 'Bearish') result[sector].bearish++;
    }
  }

  const output: Record<string, { count: number; sentiment: string }> = {};
  for (const [sector, data] of Object.entries(result)) {
    output[sector] = {
      count: data.count,
      sentiment: data.bullish > data.bearish ? 'Bullish' : data.bearish > data.bullish ? 'Bearish' : 'Mixed',
    };
  }
  return output;
}
