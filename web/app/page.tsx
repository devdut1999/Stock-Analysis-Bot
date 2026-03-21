'use client';

import { useState, useEffect } from 'react';
import StockCard from './components/StockCard';
import WatchlistWidget from './components/WatchlistWidget';
import { INDIAN_STOCKS } from '../lib/data/indian-stocks';

interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

interface StockMover {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  sector?: string;
}

function isMarketOpen(): { open: boolean; label: string } {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = ist.getDay();
  const hours = ist.getHours();
  const minutes = ist.getMinutes();
  const time = hours * 60 + minutes;
  const isWeekday = day >= 1 && day <= 5;
  const inSession = time >= 555 && time <= 930; // 9:15 AM to 3:30 PM
  if (!isWeekday) return { open: false, label: 'Closed · Weekend' };
  if (inSession) return { open: true, label: 'Market Open' };
  if (time < 555) return { open: false, label: 'Pre-market' };
  return { open: false, label: 'Market Closed' };
}

export default function Dashboard() {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [gainers, setGainers] = useState<StockMover[]>([]);
  const [losers, setLosers] = useState<StockMover[]>([]);
  const [loadingIndices, setLoadingIndices] = useState(true);
  const [loadingMovers, setLoadingMovers] = useState(true);
  const [marketStatus, setMarketStatus] = useState(isMarketOpen());

  useEffect(() => {
    fetchMarketOverview();
    fetchMarketMovers();
    const interval = setInterval(() => setMarketStatus(isMarketOpen()), 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchMarketOverview = async () => {
    try {
      const res = await fetch('/api/market-overview');
      if (res.ok) {
        const data = await res.json();
        setIndices(data.indices || []);
      }
    } catch {
      // Will show placeholder
    } finally {
      setLoadingIndices(false);
    }
  };

  const fetchMarketMovers = async () => {
    try {
      const res = await fetch('/api/market-movers');
      if (res.ok) {
        const data = await res.json();
        setGainers(data.gainers || []);
        setLosers(data.losers || []);
      }
    } catch {
      // Will show placeholder
    } finally {
      setLoadingMovers(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Market Status + Indices */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-base font-semibold text-white">Market Overview</h2>
          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
            marketStatus.open
              ? 'bg-[#22c55e]/15 text-[#22c55e]'
              : 'bg-[#5d6178]/15 text-[#8b8fa3]'
          }`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${
              marketStatus.open ? 'bg-[#22c55e] animate-pulse' : 'bg-[#5d6178]'
            }`} />
            {marketStatus.label}
          </span>
        </div>

        {loadingIndices ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-[#1a1d29] rounded-xl border border-[#2a2e3f] p-4">
                <div className="skeleton h-3 w-16 mb-3" />
                <div className="skeleton h-7 w-28 mb-2" />
                <div className="skeleton h-4 w-20" />
              </div>
            ))}
          </div>
        ) : indices.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {indices.map(idx => {
              const isUp = idx.change >= 0;
              return (
                <div key={idx.symbol} className="bg-[#1a1d29] rounded-xl border border-[#2a2e3f] p-4 hover:border-[#3b82f6]/20 transition-colors">
                  <p className="text-[11px] text-[#5d6178] font-medium uppercase tracking-wider mb-1">{idx.name}</p>
                  <div className="flex items-end justify-between">
                    <p className="text-xl font-bold text-white">
                      {idx.price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                    <div className="text-right">
                      <span className={`text-sm font-semibold ${isUp ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                        {isUp ? '+' : ''}{idx.changePercent?.toFixed(2)}%
                      </span>
                      <p className="text-[11px] text-[#5d6178]">
                        {isUp ? '+' : ''}{idx.change?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#1a1d29] rounded-xl border border-[#2a2e3f] p-6 text-center text-sm text-[#5d6178]">
            Market data unavailable
          </div>
        )}
      </section>

      {/* Watchlist */}
      <WatchlistWidget />

      {/* Gainers & Losers */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MoverTable title="Top Gainers" icon="▲" iconColor="text-[#22c55e]" stocks={gainers} loading={loadingMovers} />
          <MoverTable title="Top Losers" icon="▼" iconColor="text-[#ef4444]" stocks={losers} loading={loadingMovers} />
        </div>
      </section>

      {/* Popular Stocks */}
      <section>
        <h2 className="text-base font-semibold text-white mb-3">Popular Stocks</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {INDIAN_STOCKS.slice(0, 15).map(stock => (
            <StockCard
              key={stock.symbol}
              symbol={stock.symbol}
              name={stock.name}
              sector={stock.sector}
            />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-6 border-t border-[#2a2e3f] text-center text-xs text-[#5d6178]">
        <p>Indian Stock Market Focus (NSE/BSE) · Not financial advice</p>
      </footer>
    </div>
  );
}

function MoverTable({
  title, icon, iconColor, stocks, loading,
}: {
  title: string;
  icon: string;
  iconColor: string;
  stocks: StockMover[];
  loading: boolean;
}) {
  const isGainer = title.includes('Gainer');

  return (
    <div>
      <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
        <span className={iconColor}>{icon}</span> {title}
      </h2>
      <div className="bg-[#1a1d29] rounded-xl border border-[#2a2e3f] overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2.5 text-[11px] text-[#5d6178] uppercase tracking-wider border-b border-[#2a2e3f]/60 font-medium">
          <span>Company</span>
          <span className="text-right w-20">LTP</span>
          <span className="text-right w-16">Chg%</span>
        </div>
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex justify-between">
                <div className="skeleton h-4 w-28" />
                <div className="skeleton h-4 w-16" />
              </div>
            ))}
          </div>
        ) : stocks.length > 0 ? (
          <div>
            {stocks.map((stock, i) => (
              <a
                key={stock.symbol}
                href={`/stock/${stock.symbol}`}
                className={`grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 items-center hover:bg-[#222636] transition-colors ${
                  i !== stocks.length - 1 ? 'border-b border-[#2a2e3f]/40' : ''
                }`}
              >
                <div className="min-w-0">
                  <span className="font-semibold text-sm text-white">{stock.symbol}</span>
                  <span className="text-xs text-[#5d6178] ml-2 hidden sm:inline truncate">{stock.name}</span>
                </div>
                <span className="text-sm font-medium text-[#e1e4ea] text-right w-20">
                  ₹{stock.price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
                <span className={`text-sm font-semibold text-right w-16 ${isGainer ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                  {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                </span>
              </a>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-sm text-[#5d6178]">
            No data available
          </div>
        )}
      </div>
    </div>
  );
}
