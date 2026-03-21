import { IntegrationAdapter, IntegrationFetchParams } from '../types';
import {
  NewsItem,
  classifyEvent,
  detectSentiment,
  detectSectors,
  detectStocks,
  scoreImpact,
} from '../../skills/news-tracker';

const SUBREDDITS = [
  'IndianStockMarket',
  'IndianStreetBets',
  'DalalStreetTalks',
];

interface RedditPost {
  title: string;
  selftext: string;
  url: string;
  permalink: string;
  subreddit: string;
  author: string;
  score: number;
  num_comments: number;
  created_utc: number;
  link_flair_text?: string;
}

async function fetchSubreddit(subreddit: string, limit: number, query?: string): Promise<RedditPost[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    // Use search if query provided, otherwise hot posts
    const baseUrl = query
      ? `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=new&limit=${limit}`
      : `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`;

    const response = await fetch(baseUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'NiveshAI/1.0' },
    });
    clearTimeout(timeout);

    if (!response.ok) return [];

    const data = await response.json();
    const posts = data?.data?.children || [];

    return posts
      .filter((p: any) => p.kind === 't3')
      .map((p: any) => p.data as RedditPost);
  } catch {
    return [];
  }
}

export const redditAdapter: IntegrationAdapter<Record<string, never>, NewsItem[]> = {
  id: 'reddit',

  async validate() {
    return { valid: true };
  },

  async fetch(params: IntegrationFetchParams<Record<string, never>>): Promise<NewsItem[]> {
    const { symbol, limit = 15 } = params;

    // Fetch from all subreddits in parallel
    const query = symbol ? `${symbol} OR ${symbol}.NS` : undefined;
    const perSub = Math.ceil(limit / SUBREDDITS.length);

    const allPosts = await Promise.all(
      SUBREDDITS.map(sub => fetchSubreddit(sub, perSub, query))
    );

    const posts = allPosts.flat();

    const items: NewsItem[] = posts
      .filter(p => p.title && !p.title.startsWith('[deleted'))
      .map(post => {
        const title = post.title;
        const item: NewsItem = {
          title,
          source: `r/${post.subreddit}`,
          published: new Date(post.created_utc * 1000).toISOString(),
          link: `https://reddit.com${post.permalink}`,
          category: post.link_flair_text || 'Discussion',
          eventType: classifyEvent(title),
          sentiment: detectSentiment(title + ' ' + (post.selftext || '').slice(0, 200)),
          impactScore: 0,
          sectors: detectSectors(title),
          stocksMentioned: detectStocks(title),
          summary: post.selftext
            ? post.selftext.slice(0, 150).replace(/\n/g, ' ').trim() + (post.selftext.length > 150 ? '...' : '')
            : title,
        };
        item.impactScore = scoreImpact(item);

        // Boost score based on Reddit engagement
        if (post.score > 100) item.impactScore += 2;
        else if (post.score > 50) item.impactScore += 1;
        if (post.num_comments > 50) item.impactScore += 1;

        return item;
      });

    // Sort by impact score, then by recency
    return items
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, limit);
  },
};
