'use client';

import { NewsItem } from '../../lib/skills/news-tracker';

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const sentimentColors = {
  Bullish: 'bg-emerald-100 text-emerald-700',
  Bearish: 'bg-red-100 text-red-600',
  Neutral: 'bg-slate-100 text-slate-500',
};

interface NewsFeedProps {
  items: NewsItem[];
  compact?: boolean;
  showSource?: boolean;
}

export default function NewsFeed({ items, compact = false, showSource = true }: NewsFeedProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-slate-400">
        No news available
      </div>
    );
  }

  return (
    <div className="space-y-0 divide-y divide-slate-100">
      {items.map((item, i) => (
        <a
          key={`${item.link}-${i}`}
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className={`block hover:bg-slate-50 transition-colors ${compact ? 'px-4 py-3' : 'px-5 py-4'}`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className={`text-slate-900 leading-snug ${compact ? 'text-sm' : 'text-sm font-medium'}`}>
                {item.title}
              </p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {showSource && (
                  <span className="text-[10px] text-slate-400 font-medium">{item.source}</span>
                )}
                <span className="text-[10px] text-slate-300">·</span>
                <span className="text-[10px] text-slate-400">{timeAgo(item.published)}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${sentimentColors[item.sentiment]}`}>
                  {item.sentiment}
                </span>
                {item.impactScore >= 7 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                    High Impact
                  </span>
                )}
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
