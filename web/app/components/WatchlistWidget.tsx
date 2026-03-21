'use client';

import { useState, useEffect } from 'react';
import { useWatchlist } from '../../lib/hooks/useWatchlist';
import StockCard from './StockCard';
import { STOCK_MAP } from '../../lib/data/indian-stocks';

interface WatchlistStock {
  symbol: string;
  name: string;
  price?: number;
  change?: number;
  changePercent?: number;
}

export default function WatchlistWidget() {
  const { symbols, remove } = useWatchlist();
  const [stocks, setStocks] = useState<WatchlistStock[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (symbols.length === 0) {
      setStocks([]);
      return;
    }
    fetchPrices();
  }, [symbols]);

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled(
        symbols.map(async (sym) => {
          const res = await fetch(`/api/analyze?symbol=${sym}&type=quick`);
          if (!res.ok) throw new Error('Failed');
          const data = await res.json();
          const info = STOCK_MAP.get(sym);
          return {
            symbol: sym,
            name: info?.name || sym,
            price: data.price?.currentPrice,
            change: data.price?.change,
            changePercent: data.price?.changePercent,
          };
        })
      );

      setStocks(
        results
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
          .map(r => r.value as WatchlistStock)
      );
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  if (symbols.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Watchlist</h2>
        <span className="text-xs text-[#5d6178]">{symbols.length} stocks</span>
      </div>
      <div className="bg-[#1a1d29] rounded-xl border border-[#2a2e3f] p-2">
        {loading && stocks.length === 0 ? (
          <div className="p-4 text-center text-sm text-[#5d6178]">Loading watchlist...</div>
        ) : (
          stocks.map(stock => (
            <div key={stock.symbol} className="flex items-center">
              <div className="flex-1">
                <StockCard
                  symbol={stock.symbol}
                  name={stock.name}
                  price={stock.price}
                  change={stock.change}
                  changePercent={stock.changePercent}
                  compact
                />
              </div>
              <button
                onClick={() => remove(stock.symbol)}
                className="text-[#5d6178] hover:text-[#ef4444] px-2 text-xs transition-colors"
                title="Remove from watchlist"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
