/**
 * News Aggregator — Central service that fetches from all enabled news sources
 *
 * Extensible: To add a new source, just add an entry to NEWS_SOURCES below.
 * Each source needs: id, name, endpoint, and optional transform function.
 */

export interface AggregatedNewsItem {
  title: string;
  source: string;
  sourcePlatform: string; // 'rss' | 'google_news' | 'reddit' | 'youtube' | 'telegram'
  published: string;
  link: string;
  category: string;
  eventType: string;
  sentiment: string;
  impactScore: number;
  sectors: string[];
  stocksMentioned: string[];
  summary: string;
  engagement?: {
    score?: number;
    comments?: number;
  };
}

import { googleNewsAdapter } from '../integrations/adapters/google-news';
import { redditAdapter } from '../integrations/adapters/reddit-adapter';

interface DirectSource {
  id: string;
  name: string;
  fetch: (symbol: string, limit: number) => Promise<AggregatedNewsItem[]>;
  enabled: boolean;
}

/**
 * Register all news sources here.
 * To add a new source: just add an entry to this array with a fetch function.
 */
const NEWS_SOURCES: DirectSource[] = [
  {
    id: 'google_news',
    name: 'Google News',
    fetch: async (symbol, limit) => {
      const items = await googleNewsAdapter.fetch({ config: {}, symbol, limit });
      return items.map((item: any) => ({ ...item, sourcePlatform: 'google_news' }));
    },
    enabled: true,
  },
  {
    id: 'reddit',
    name: 'Reddit',
    fetch: async (symbol, limit) => {
      const items = await redditAdapter.fetch({ config: {}, symbol, limit });
      return items.map((item: any) => ({ ...item, sourcePlatform: 'reddit' }));
    },
    enabled: true,
  },
  // ─── Add future sources below ───
  // {
  //   id: 'youtube',
  //   name: 'YouTube',
  //   fetch: async (symbol, limit) => { ... },
  //   enabled: false,
  // },
];

/**
 * Fetch news from all enabled sources in parallel, deduplicate, and sort by impact.
 */
export async function fetchAllNews(
  symbol: string,
  options: { limit?: number; sources?: string[] } = {}
): Promise<{ items: AggregatedNewsItem[]; sources: string[]; sentiment: { bullish: number; bearish: number; neutral: number; overall: string } }> {
  const { limit = 25, sources: enabledSourceIds } = options;

  const activeSources = NEWS_SOURCES.filter(s =>
    s.enabled && (!enabledSourceIds || enabledSourceIds.includes(s.id))
  );

  const perSource = Math.ceil((limit * 1.5) / activeSources.length);

  // Fetch all sources in parallel — calls adapters directly, no HTTP
  const results = await Promise.allSettled(
    activeSources.map(source => source.fetch(symbol, perSource).catch(() => []))
  );

  // Flatten results
  const allItems: AggregatedNewsItem[] = results
    .filter((r): r is PromiseFulfilledResult<AggregatedNewsItem[]> => r.status === 'fulfilled')
    .flatMap(r => r.value);

  // Normalize dates to ISO format
  for (const item of allItems) {
    if (item.published) {
      const parsed = new Date(item.published);
      if (!isNaN(parsed.getTime())) {
        item.published = parsed.toISOString();
      }
    }
  }

  // Deduplicate by title similarity
  const seen = new Set<string>();
  const unique = allItems.filter(item => {
    const key = item.title?.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by recency first, then impact score as tiebreaker
  unique.sort((a, b) => {
    const dateA = a.published ? new Date(a.published).getTime() : 0;
    const dateB = b.published ? new Date(b.published).getTime() : 0;
    if (Math.abs(dateA - dateB) > 86400000) return dateB - dateA; // >1 day apart: recency wins
    return (b.impactScore || 0) - (a.impactScore || 0); // Same day: impact wins
  });

  const items = unique.slice(0, limit);

  // Calculate aggregate sentiment
  let bullish = 0, bearish = 0, neutral = 0;
  for (const item of items) {
    if (item.sentiment === 'Bullish') bullish++;
    else if (item.sentiment === 'Bearish') bearish++;
    else neutral++;
  }

  const total = bullish + bearish + neutral;
  const overall = total === 0 ? 'Neutral'
    : bullish > bearish * 1.5 ? 'Bullish'
    : bearish > bullish * 1.5 ? 'Bearish'
    : 'Mixed';

  return {
    items,
    sources: activeSources.map(s => s.name),
    sentiment: { bullish, bearish, neutral, overall },
  };
}

/** Get list of all available source names */
export function getAvailableSources(): { id: string; name: string; enabled: boolean }[] {
  return NEWS_SOURCES.map(s => ({ id: s.id, name: s.name, enabled: s.enabled }));
}
