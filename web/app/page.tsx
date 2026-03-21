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
  const inSession = time >= 555 && time <= 930;
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
    } finally {
      setLoadingMovers(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Section */}
      <section className="text-center py-6">
        <h1 className="text-4xl font-bold text-slate-900 mb-3">
          Indian Stock Market <span className="gradient-text">Intelligence</span>
        </h1>
        <p className="text-slate-500 text-lg max-w-2xl mx-auto">
          AI-powered analysis with 10 specialized agents for smarter trading decisions
        </p>
      </section>

      {/* Market Status + Indices */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <h2 className="text-lg font-bold text-slate-900">Market Overview</h2>
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-2 ${
            marketStatus.open
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 text-slate-500'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              marketStatus.open ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
            }`} />
            {marketStatus.label}
          </span>
        </div>

        {loadingIndices ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="stat-card">
                <div className="skeleton h-3 w-16 mb-3" />
                <div className="skeleton h-7 w-28 mb-2" />
                <div className="skeleton h-4 w-20" />
              </div>
            ))}
          </div>
        ) : indices.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {indices.map(idx => {
              const isUp = idx.change >= 0;
              return (
                <div key={idx.symbol} className="stat-card card-hover">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">{idx.name}</p>
                  <div className="flex items-end justify-between">
                    <p className="text-2xl font-bold text-slate-900">
                      {idx.price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                    <div className="text-right">
                      <span className={`text-sm font-bold px-2 py-1 rounded-lg ${
                        isUp ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                      }`}>
                        {isUp ? '+' : ''}{idx.changePercent?.toFixed(2)}%
                      </span>
                      <p className="text-xs text-slate-400 mt-1">
                        {isUp ? '+' : ''}{idx.change?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="stat-card text-center text-sm text-slate-400">
            Market data unavailable
          </div>
        )}
      </section>

      {/* Watchlist */}
      <WatchlistWidget />

      {/* Gainers & Losers */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MoverTable title="Top Gainers" icon="↑" iconColor="text-emerald-500" stocks={gainers} loading={loadingMovers} />
          <MoverTable title="Top Losers" icon="↓" iconColor="text-red-500" stocks={losers} loading={loadingMovers} />
        </div>
      </section>

      {/* Popular Stocks */}
      <section>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Popular Stocks</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
      <footer className="pt-8 border-t border-slate-200 text-center">
        <p className="text-sm text-slate-400">
          Indian Stock Market Focus (NSE/BSE) · Not financial advice
        </p>
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
      <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
        <span className={`${iconColor} text-xl`}>{icon}</span> {title}
      </h2>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-100 font-semibold bg-slate-50/50">
          <span>Company</span>
          <span className="text-right w-20">LTP</span>
          <span className="text-right w-16">Chg%</span>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
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
                className={`grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3.5 items-center hover:bg-slate-50 transition-colors ${
                  i !== stocks.length - 1 ? 'border-b border-slate-100' : ''
                }`}
              >
                <div className="min-w-0">
                  <span className="font-bold text-sm text-slate-900">{stock.symbol}</span>
                  <span className="text-xs text-slate-400 ml-2 hidden sm:inline truncate">{stock.name}</span>
                </div>
                <span className="text-sm font-semibold text-slate-700 text-right w-20">
                  ₹{stock.price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
                <span className={`text-sm font-bold text-right w-16 px-2 py-0.5 rounded-md ${
                  isGainer ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                }`}>
                  {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                </span>
              </a>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-slate-400">
            No data available
          </div>
        )}
      </div>
    </div>
  );
}
