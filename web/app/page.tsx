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

export default function Dashboard() {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [gainers, setGainers] = useState<StockMover[]>([]);
  const [losers, setLosers] = useState<StockMover[]>([]);
  const [loadingIndices, setLoadingIndices] = useState(true);
  const [loadingMovers, setLoadingMovers] = useState(true);

  useEffect(() => {
    fetchMarketOverview();
    fetchMarketMovers();
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Market Overview */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Market Overview</h2>
        {loadingIndices ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-20 mb-3" />
                <div className="h-8 bg-gray-200 rounded w-32 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        ) : indices.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {indices.map(idx => (
              <div key={idx.symbol} className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-sm text-gray-500 font-medium">{idx.name}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {idx.price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
                <p className={`text-sm font-semibold mt-1 ${idx.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {idx.change >= 0 ? '+' : ''}{idx.changePercent?.toFixed(2)}%
                  <span className="text-gray-400 font-normal ml-1">
                    ({idx.change >= 0 ? '+' : ''}{idx.change?.toFixed(2)})
                  </span>
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
            <p className="font-medium mb-1">Market data loading...</p>
            <p className="text-sm">Market overview API will be available shortly.</p>
          </div>
        )}
      </section>

      {/* Watchlist */}
      <WatchlistWidget />

      {/* Gainers & Losers */}
      <section className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Gainers */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-green-500">▲</span> Top Gainers
            </h2>
            {loadingMovers ? (
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex justify-between animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-24" />
                    <div className="h-4 bg-gray-200 rounded w-16" />
                  </div>
                ))}
              </div>
            ) : gainers.length > 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-2">
                {gainers.map(stock => (
                  <StockCard
                    key={stock.symbol}
                    symbol={stock.symbol}
                    name={stock.name}
                    price={stock.price}
                    change={stock.change}
                    changePercent={stock.changePercent}
                    compact
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-500 text-sm">
                Gainers data will appear when market overview API is ready.
              </div>
            )}
          </div>

          {/* Top Losers */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-red-500">▼</span> Top Losers
            </h2>
            {loadingMovers ? (
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex justify-between animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-24" />
                    <div className="h-4 bg-gray-200 rounded w-16" />
                  </div>
                ))}
              </div>
            ) : losers.length > 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-2">
                {losers.map(stock => (
                  <StockCard
                    key={stock.symbol}
                    symbol={stock.symbol}
                    name={stock.name}
                    price={stock.price}
                    change={stock.change}
                    changePercent={stock.changePercent}
                    compact
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-500 text-sm">
                Losers data will appear when market overview API is ready.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Quick Access - Popular Stocks */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Popular Stocks</h2>
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

      {/* Features */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { title: '10 AI Agents', desc: 'Buffett, Munger, Ackman, Dalio + technical & risk analysts', color: 'bg-purple-50 border-purple-200' },
            { title: 'India-Specific', desc: 'FII/DII flows, promoter holdings, F&O data, circuit breakers', color: 'bg-orange-50 border-orange-200' },
            { title: 'Trading Signals', desc: 'Entry/exit levels, stop loss, position sizing, risk metrics', color: 'bg-blue-50 border-blue-200' },
            { title: 'VCP + Backtest', desc: 'Volatility Contraction Patterns, strategy backtesting (coming soon)', color: 'bg-green-50 border-green-200' },
          ].map(f => (
            <div key={f.title} className={`rounded-xl border p-5 ${f.color}`}>
              <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
              <p className="text-xs text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
        <p>Built with Claude Agent SDK | Indian Stock Market Focus (NSE/BSE)</p>
        <p className="mt-1">For educational purposes only. Not financial advice.</p>
      </footer>
    </div>
  );
}
