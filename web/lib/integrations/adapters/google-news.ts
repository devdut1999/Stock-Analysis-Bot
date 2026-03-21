import { IntegrationAdapter, IntegrationFetchParams } from '../types';
import {
  NewsItem,
  classifyEvent,
  detectSentiment,
  detectSectors,
  detectStocks,
  scoreImpact,
} from '../../skills/news-tracker';

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

interface RSSEntry {
  title?: string;
  link?: string;
  published?: string;
  source?: string;
}

async function fetchGoogleNewsRSS(query: string, limit: number): Promise<RSSEntry[]> {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-IN&gl=IN&ceid=IN:en`;

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
    const items: RSSEntry[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];
      const getTag = (tag: string) => {
        const m = new RegExp(
          `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`,
          'i'
        ).exec(itemXml);
        return m ? (m[1] || m[2] || '').trim() : undefined;
      };

      const sourceMatch = /<source[^>]*>([\s\S]*?)<\/source>/i.exec(itemXml);
      const source = sourceMatch
        ? stripHtml(sourceMatch[1])
        : 'Google News';

      items.push({
        title: getTag('title'),
        link: getTag('link'),
        published: getTag('pubDate'),
        source,
      });
    }

    return items.slice(0, limit);
  } catch {
    return [];
  }
}

export const googleNewsAdapter: IntegrationAdapter<Record<string, never>, NewsItem[]> = {
  id: 'google_news',

  async validate() {
    // No config needed — always valid
    return { valid: true };
  },

  async fetch(params: IntegrationFetchParams<Record<string, never>>): Promise<NewsItem[]> {
    const { symbol, limit = 10 } = params;
    const query = symbol
      ? `${symbol} NSE stock India`
      : 'Indian stock market NSE BSE';

    const entries = await fetchGoogleNewsRSS(query, limit);

    const items: NewsItem[] = entries
      .filter(e => e.title)
      .map(entry => {
        const title = entry.title || '';
        const item: NewsItem = {
          title,
          source: entry.source || 'Google News',
          published: entry.published || new Date().toISOString(),
          link: entry.link || '',
          category: 'Markets',
          eventType: classifyEvent(title),
          sentiment: detectSentiment(title),
          impactScore: 0,
          sectors: detectSectors(title),
          stocksMentioned: detectStocks(title),
          summary: title,
        };
        item.impactScore = scoreImpact(item);
        return item;
      });

    // Sort by impact score descending
    return items.sort((a, b) => b.impactScore - a.impactScore);
  },
};
