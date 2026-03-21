'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
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

const PRODUCTS = [
  { name: 'Stocks', icon: '📈', desc: 'Invest in companies', href: '/' },
  { name: 'Mutual Funds', icon: '📊', desc: 'Diversified portfolios', href: '/' },
  { name: 'F&O', icon: '⚡', desc: 'Futures & Options', href: '/' },
  { name: 'IPO', icon: '🚀', desc: 'New listings', href: '/' },
  { name: 'Gold', icon: '🥇', desc: 'Digital gold', href: '/' },
  { name: 'FDs', icon: '🏦', desc: 'Fixed deposits', href: '/' },
];

const SECTORS = [
  { name: 'IT', stocks: 45 },
  { name: 'Banking', stocks: 38 },
  { name: 'Pharma', stocks: 32 },
  { name: 'Auto', stocks: 28 },
  { name: 'FMCG', stocks: 25 },
  { name: 'Energy', stocks: 22 },
  { name: 'Metals', stocks: 20 },
  { name: 'Realty', stocks: 18 },
];

export default function ExplorePage() {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [gainers, setGainers] = useState<StockMover[]>([]);
  const [losers, setLosers] = useState<StockMover[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<typeof INDIAN_STOCKS>([]);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (searchQuery.length > 0) {
      const filtered = INDIAN_STOCKS.filter(
        s => s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
             s.name.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 6);
      setSearchResults(filtered);
      setShowSearch(true);
    } else {
      setSearchResults([]);
      setShowSearch(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    <div className="min-h-screen bg-[#f7f7f7]">
      {/* Indices Ticker Bar */}
      <div className="bg-white border-b border-[#e5e5e5]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center h-10 gap-8 overflow-x-auto scrollbar-hide text-sm">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-2 shrink-0">
                  <div className="h-3 w-14 bg-gray-100 rounded animate-pulse" />
                  <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                </div>
              ))
            ) : (
              indices.map(idx => (
                <div key={idx.symbol} className="flex items-center gap-2 shrink-0">
                  <span className="text-[#666] font-medium">{idx.name}</span>
                  <span className="text-[#1a1a1a] font-semibold">
                    {idx.price?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                  <span className={`font-medium ${idx.change >= 0 ? 'text-[#00b386]' : 'text-[#eb5757]'}`}>
                    ({idx.change >= 0 ? '+' : ''}{idx.changePercent?.toFixed(2)}%)
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Search */}
        <div ref={searchRef} className="relative mb-8">
          <div className="relative max-w-xl">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#999]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stocks, mutual funds, ETFs..."
              className="w-full h-12 pl-12 pr-4 bg-white border border-[#e5e5e5] rounded-lg text-[15px] text-[#1a1a1a] placeholder-[#999] focus:outline-none focus:border-[#5367ff] focus:ring-1 focus:ring-[#5367ff] transition-all"
            />
          </div>

          {showSearch && searchResults.length > 0 && (
            <div className="absolute top-full left-0 max-w-xl w-full mt-1 bg-white border border-[#e5e5e5] rounded-lg shadow-lg z-50 overflow-hidden">
              {searchResults.map((stock, i) => (
                <Link
                  key={stock.symbol}
                  href={`/stock/${stock.symbol}`}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-[#f7f7f7] transition-colors ${i !== searchResults.length - 1 ? 'border-b border-[#f0f0f0]' : ''}`}
                  onClick={() => setShowSearch(false)}
                >
                  <div className="w-10 h-10 rounded-full bg-[#f0f0f0] flex items-center justify-center text-[#666] text-sm font-semibold">
                    {stock.symbol.slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <p className="text-[15px] font-medium text-[#1a1a1a]">{stock.name}</p>
                    <p className="text-[13px] text-[#999]">{stock.symbol} • NSE</p>
                  </div>
                  <svg className="w-5 h-5 text-[#ccc]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Products */}
        <section className="mb-8">
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {PRODUCTS.map(product => (
              <Link
                key={product.name}
                href={product.href}
                className="flex items-center gap-3 px-4 py-3 bg-white border border-[#e5e5e5] rounded-xl hover:border-[#d0d0d0] transition-colors shrink-0 min-w-[160px]"
              >
                <span className="text-2xl">{product.icon}</span>
                <div>
                  <p className="text-[14px] font-semibold text-[#1a1a1a]">{product.name}</p>
                  <p className="text-[12px] text-[#999]">{product.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Most Bought */}
        <StockSection
          title="Most Bought on Nivesh"
          stocks={gainers.slice(0, 6)}
          loading={loading}
          viewAllHref="/stocks?filter=popular"
        />

        {/* Top Gainers */}
        <StockSection
          title="Top Gainers"
          stocks={gainers}
          loading={loading}
          viewAllHref="/stocks?filter=gainers"
          showChange
        />

        {/* Top Losers */}
        <StockSection
          title="Top Losers"
          stocks={losers}
          loading={loading}
          viewAllHref="/stocks?filter=losers"
          showChange
        />

        {/* Explore Sectors */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] font-semibold text-[#1a1a1a]">Explore Sectors</h2>
            <Link href="/sectors" className="text-[14px] font-medium text-[#5367ff] hover:underline">
              See all
            </Link>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {SECTORS.map(sector => (
              <Link
                key={sector.name}
                href={`/stocks?sector=${sector.name.toLowerCase()}`}
                className="flex flex-col items-center gap-2 p-4 bg-white border border-[#e5e5e5] rounded-xl hover:border-[#d0d0d0] transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#f0f0f0] flex items-center justify-center text-[14px] font-semibold text-[#666]">
                  {sector.name.slice(0, 2)}
                </div>
                <p className="text-[13px] font-medium text-[#1a1a1a]">{sector.name}</p>
                <p className="text-[11px] text-[#999]">{sector.stocks} stocks</p>
              </Link>
            ))}
          </div>
        </section>

        {/* All Stocks */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] font-semibold text-[#1a1a1a]">All Stocks</h2>
            <Link href="/stocks" className="text-[14px] font-medium text-[#5367ff] hover:underline">
              See all
            </Link>
          </div>
          <div className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_100px_80px] gap-4 px-4 py-3 text-[12px] text-[#999] font-medium border-b border-[#f0f0f0] bg-[#fafafa]">
              <span>Company</span>
              <span className="text-right">Price</span>
              <span className="text-right">Change</span>
            </div>
            {INDIAN_STOCKS.slice(0, 10).map((stock, i) => (
              <Link
                key={stock.symbol}
                href={`/stock/${stock.symbol}`}
                className={`grid grid-cols-[1fr_100px_80px] gap-4 px-4 py-3 items-center hover:bg-[#fafafa] transition-colors ${i !== 9 ? 'border-b border-[#f0f0f0]' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#f0f0f0] flex items-center justify-center text-[12px] font-semibold text-[#666]">
                    {stock.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[#1a1a1a]">{stock.symbol}</p>
                    <p className="text-[12px] text-[#999] truncate max-w-[200px]">{stock.name}</p>
                  </div>
                </div>
                <span className="text-[14px] font-medium text-[#1a1a1a] text-right">—</span>
                <span className="text-[13px] font-medium text-[#999] text-right">—</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="py-6 text-center border-t border-[#e5e5e5]">
          <p className="text-[13px] text-[#999]">
            Nivesh AI • NSE/BSE Market Data • Not financial advice
          </p>
        </footer>
      </div>
    </div>
  );
}

function StockSection({ 
  title, 
  stocks, 
  loading, 
  viewAllHref,
  showChange = false
}: { 
  title: string; 
  stocks: StockMover[]; 
  loading: boolean;
  viewAllHref: string;
  showChange?: boolean;
}) {
  const isGainer = title.includes('Gainer') || title.includes('Bought');
  
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[18px] font-semibold text-[#1a1a1a]">{title}</h2>
        <Link href={viewAllHref} className="text-[14px] font-medium text-[#5367ff] hover:underline">
          See all
        </Link>
      </div>
      
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="w-[180px] shrink-0 bg-white border border-[#e5e5e5] rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 w-16 bg-gray-100 rounded animate-pulse mb-1" />
                  <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
              <div className="h-5 w-20 bg-gray-100 rounded animate-pulse" />
            </div>
          ))
        ) : (
          stocks.map(stock => (
            <Link
              key={stock.symbol}
              href={`/stock/${stock.symbol}`}
              className="w-[180px] shrink-0 bg-white border border-[#e5e5e5] rounded-xl p-4 hover:border-[#d0d0d0] hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#f0f0f0] flex items-center justify-center text-[12px] font-semibold text-[#666]">
                  {stock.symbol.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[#1a1a1a] truncate">{stock.symbol}</p>
                  <p className="text-[12px] text-[#999] truncate">{stock.name}</p>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[16px] font-semibold text-[#1a1a1a]">
                  ₹{stock.price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
                {showChange && (
                  <span className={`text-[13px] font-medium ${isGainer ? 'text-[#00b386]' : 'text-[#eb5757]'}`}>
                    {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                  </span>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
