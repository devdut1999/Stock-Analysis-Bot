'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { INDIAN_STOCKS } from '../lib/data/indian-stocks';
import StockLogo, { getStockColor } from './components/StockLogo';

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

const SECTORS = [
  { name: 'IT', icon: '💻', stocks: ['TCS', 'INFY', 'WIPRO', 'HCLTECH', 'TECHM'] },
  { name: 'Banking', icon: '🏦', stocks: ['HDFCBANK', 'ICICIBANK', 'SBIN', 'KOTAKBANK', 'AXISBANK'] },
  { name: 'Auto', icon: '🚗', stocks: ['MARUTI', 'TATAMOTORS', 'M_M', 'HEROMOTOCO', 'EICHERMOT'] },
  { name: 'Pharma', icon: '💊', stocks: ['SUNPHARMA', 'DRREDDY', 'CIPLA', 'DIVISLAB', 'APOLLOHOSP'] },
  { name: 'FMCG', icon: '🛒', stocks: ['HINDUNILVR', 'ITC', 'NESTLEIND', 'BRITANNIA', 'TATACONSUM'] },
  { name: 'Energy', icon: '⚡', stocks: ['RELIANCE', 'ONGC', 'NTPC', 'POWERGRID', 'COALINDIA'] },
  { name: 'Metals', icon: '⛏️', stocks: ['TATASTEEL', 'JSWSTEEL', 'HINDALCO'] },
  { name: 'Finance', icon: '📊', stocks: ['BAJFINANCE', 'BAJAJFINSV', 'HDFCLIFE', 'SBILIFE', 'SHRIRAMFIN'] },
];

export default function HomePage() {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [gainers, setGainers] = useState<StockMover[]>([]);
  const [losers, setLosers] = useState<StockMover[]>([]);
  const [loading, setLoading] = useState(true);
  const [marketStatus] = useState(isMarketOpen());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [indicesRes, moversRes] = await Promise.all([
        fetch('/api/market-overview'),
        fetch('/api/market-movers'),
      ]);

      if (indicesRes.ok) {
        const data = await indicesRes.json();
        setIndices(data.indices || []);
      }

      if (moversRes.ok) {
        const data = await moversRes.json();
        setGainers(data.gainers || []);
        setLosers(data.losers || []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Indices Ticker Bar */}
      <div className="bg-white border-b border-[#eee]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center h-12 gap-6 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-2 shrink-0">
              <span className={`w-2 h-2 rounded-full ${marketStatus.open ? 'bg-[#00b386] animate-pulse' : 'bg-[#999]'}`} />
              <span className="text-[12px] font-medium text-[#666]">{marketStatus.label}</span>
            </div>
            <div className="w-px h-5 bg-[#eee]" />
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-2 shrink-0">
                  <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                </div>
              ))
            ) : (
              indices.map(idx => {
                const isUp = idx.change >= 0;
                return (
                  <div key={idx.symbol} className="flex items-center gap-2 shrink-0">
                    <span className="text-[13px] text-[#1a1a1a] font-semibold">{idx.name}</span>
                    <span className="text-[13px] font-bold text-[#1a1a1a]">
                      {idx.price?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                    <span className={`text-[12px] font-semibold px-1.5 py-0.5 rounded ${isUp ? 'bg-[#e6f9f1] text-[#00b386]' : 'bg-[#fde8e8] text-[#eb5757]'}`}>
                      {isUp ? '▲' : '▼'} {Math.abs(idx.changePercent).toFixed(2)}%
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">

        {/* Top Gainers & Losers — Side by Side */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MoverTable title="Top Gainers" stocks={gainers} loading={loading} isGainer />
            <MoverTable title="Top Losers" stocks={losers} loading={loading} isGainer={false} />
          </div>
        </section>

        {/* Explore by Sector */}
        <section>
          <h2 className="text-[17px] font-semibold text-[#1a1a1a] mb-4">Explore by Sector</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SECTORS.map(sector => (
              <div
                key={sector.name}
                className="bg-white rounded-2xl border border-[#eee] p-4 hover:shadow-md hover:border-[#ddd] transition-all"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{sector.icon}</span>
                  <span className="text-[14px] font-semibold text-[#1a1a1a]">{sector.name}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sector.stocks.slice(0, 4).map(sym => (
                    <Link
                      key={sym}
                      href={`/stock/${sym}`}
                      className="text-[11px] font-medium text-[#5367ff] bg-[#f0f3ff] px-2 py-1 rounded-md hover:bg-[#e0e5ff] transition-colors"
                    >
                      {sym}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Nifty 50 Stocks — Horizontal Scroll */}
        <section>
          <h2 className="text-[17px] font-semibold text-[#1a1a1a] mb-4">Nifty 50 Stocks</h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {INDIAN_STOCKS.slice(0, 20).map(stock => (
              <Link
                key={stock.symbol}
                href={`/stock/${stock.symbol}`}
                className="w-[160px] shrink-0 bg-white rounded-2xl border border-[#eee] p-4 hover:shadow-md hover:border-[#ddd] transition-all"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <StockLogo symbol={stock.symbol} name={stock.name} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-[#1a1a1a] truncate">{stock.symbol}</p>
                    <p className="text-[10px] text-[#999] truncate">{stock.name}</p>
                  </div>
                </div>
                {stock.sector && (
                  <span className="text-[10px] font-medium text-[#666] bg-[#f5f5f5] px-2 py-0.5 rounded-full">
                    {stock.sector}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>

        {/* Trending Today */}
        {gainers.length > 0 && (
          <section>
            <h2 className="text-[17px] font-semibold text-[#1a1a1a] mb-4">Trending Today</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {[...gainers.slice(0, 3), ...losers.slice(0, 3)].map(stock => {
                const isUp = stock.change >= 0;
                return (
                  <Link
                    key={stock.symbol}
                    href={`/stock/${stock.symbol}`}
                    className="bg-white rounded-2xl border border-[#eee] p-4 hover:shadow-md hover:border-[#ddd] transition-all text-center"
                  >
                    <StockLogo symbol={stock.symbol} name={stock.name} size={40} className="mx-auto mb-2" />
                    <p className="text-[13px] font-semibold text-[#1a1a1a]">{stock.symbol}</p>
                    <p className="text-[14px] font-bold text-[#1a1a1a] mt-1">
                      ₹{stock.price?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </p>
                    <span className={`text-[12px] font-bold ${isUp ? 'text-[#00b386]' : 'text-[#eb5757]'}`}>
                      {isUp ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* AI Features Banner */}
        <section>
          <div className="bg-gradient-to-r from-[#1a1a2e] to-[#16213e] rounded-2xl p-6 md:p-8 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold mb-2">AI-Powered Stock Analysis</h3>
                <p className="text-[14px] text-white/70 max-w-lg mb-4">
                  Search any stock to get instant technical indicators, fundamental data, shareholding patterns, and F&O analytics.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['RSI & MACD', 'Support/Resistance', 'FII/DII Flows', 'Promoter Holdings', 'Put-Call Ratio', 'VCP Screener'].map(tag => (
                    <span key={tag} className="text-[11px] font-medium bg-white/10 px-3 py-1.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="hidden md:block text-5xl opacity-40">🤖</div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-6 text-center border-t border-[#eee]">
          <p className="text-[12px] text-[#999]">
            Nivesh AI · NSE/BSE Market Data · Not financial advice
          </p>
        </footer>
      </div>
    </div>
  );
}

/* ─── Mover Table ─── */
function MoverTable({
  title,
  stocks,
  loading,
  isGainer,
}: {
  title: string;
  stocks: StockMover[];
  loading: boolean;
  isGainer: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className={`w-1.5 h-5 rounded-full ${isGainer ? 'bg-[#00b386]' : 'bg-[#eb5757]'}`} />
        <h2 className="text-[17px] font-semibold text-[#1a1a1a]">{title}</h2>
      </div>
      <div className="bg-white rounded-2xl border border-[#eee] overflow-hidden">
        <div className="grid grid-cols-[1fr_90px_80px] gap-3 px-5 py-3 text-[11px] text-[#999] uppercase tracking-wide font-semibold border-b border-[#f5f5f5] bg-[#fafafa]">
          <span>Company</span>
          <span className="text-right">LTP</span>
          <span className="text-right">Chg%</span>
        </div>
        {loading ? (
          <div className="p-5 space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
                  <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                </div>
                <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : stocks.length > 0 ? (
          <div>
            {stocks.map((stock, i) => (
              <Link
                key={stock.symbol}
                href={`/stock/${stock.symbol}`}
                className={`grid grid-cols-[1fr_90px_80px] gap-3 px-5 py-3.5 items-center hover:bg-[#fafafa] transition-colors ${
                  i !== stocks.length - 1 ? 'border-b border-[#f5f5f5]' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <StockLogo symbol={stock.symbol} name={stock.name} size={32} />
                  <div className="min-w-0">
                    <span className="text-[13px] font-semibold text-[#1a1a1a]">{stock.symbol}</span>
                    <span className="text-[11px] text-[#999] ml-2 hidden sm:inline truncate">{stock.name}</span>
                  </div>
                </div>
                <span className="text-[13px] font-semibold text-[#1a1a1a] text-right">
                  ₹{stock.price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
                <span className={`text-[12px] font-bold text-right ${isGainer ? 'text-[#00b386]' : 'text-[#eb5757]'}`}>
                  {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-[13px] text-[#999]">No data available</div>
        )}
      </div>
    </div>
  );
}
