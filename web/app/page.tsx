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

type Category = 'most_bought' | 'top_gainers' | 'top_losers' | '52w_high' | '52w_low';

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'most_bought', label: 'Most Bought on Nivesh' },
  { id: 'top_gainers', label: 'Top Gainers' },
  { id: 'top_losers', label: 'Top Losers' },
  { id: '52w_high', label: '52 Week High' },
  { id: '52w_low', label: '52 Week Low' },
];

const SECTORS = [
  { name: 'Technology', icon: '💻', color: 'bg-blue-50 text-blue-600' },
  { name: 'Banking', icon: '🏦', color: 'bg-emerald-50 text-emerald-600' },
  { name: 'Auto', icon: '🚗', color: 'bg-orange-50 text-orange-600' },
  { name: 'Pharma', icon: '💊', color: 'bg-pink-50 text-pink-600' },
  { name: 'Energy', icon: '⚡', color: 'bg-yellow-50 text-yellow-600' },
  { name: 'FMCG', icon: '🛒', color: 'bg-purple-50 text-purple-600' },
  { name: 'Metals', icon: '🔩', color: 'bg-slate-100 text-slate-600' },
  { name: 'Realty', icon: '🏢', color: 'bg-cyan-50 text-cyan-600' },
];

export default function Dashboard() {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [gainers, setGainers] = useState<StockMover[]>([]);
  const [losers, setLosers] = useState<StockMover[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>('top_gainers');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<typeof INDIAN_STOCKS>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (searchQuery.length > 0) {
      const filtered = INDIAN_STOCKS.filter(
        s => s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
             s.name.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 8);
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

  const getCategoryStocks = () => {
    switch (activeCategory) {
      case 'top_gainers':
        return gainers;
      case 'top_losers':
        return losers;
      case 'most_bought':
        return gainers.slice(0, 5);
      case '52w_high':
        return gainers.filter(s => s.changePercent > 3);
      case '52w_low':
        return losers.filter(s => s.changePercent < -3);
      default:
        return gainers;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Indices Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6 py-2 overflow-x-auto scrollbar-hide">
            {loading ? (
              <div className="flex gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
                    <div className="h-3 w-12 bg-slate-100 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              indices.map(idx => (
                <div key={idx.symbol} className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-medium text-slate-500">{idx.name}</span>
                  <span className="text-xs font-semibold text-slate-900">
                    {idx.price?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                  <span className={`text-xs font-semibold ${idx.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {idx.change >= 0 ? '+' : ''}{idx.changePercent?.toFixed(2)}%
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search Bar */}
        <div ref={searchRef} className="relative mb-8">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stocks..."
              className="w-full h-12 pl-12 pr-4 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
              ⌘K
            </div>
          </div>

          {/* Search Results Dropdown */}
          {showSearch && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
              {searchResults.map(stock => (
                <Link
                  key={stock.symbol}
                  href={`/stock/${stock.symbol}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                  onClick={() => setShowSearch(false)}
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                    {stock.symbol.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{stock.symbol}</p>
                    <p className="text-xs text-slate-400 truncate">{stock.name}</p>
                  </div>
                  <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Category Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stock Cards - Horizontal Scroll */}
        <div className="mb-8">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="w-[200px] shrink-0 bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 animate-pulse" />
                    <div>
                      <div className="h-4 w-16 bg-slate-100 rounded animate-pulse mb-1" />
                      <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="h-5 w-20 bg-slate-100 rounded animate-pulse" />
                </div>
              ))
            ) : (
              getCategoryStocks().map(stock => (
                <Link
                  key={stock.symbol}
                  href={`/stock/${stock.symbol}`}
                  className="w-[200px] shrink-0 bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                      {stock.symbol.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{stock.symbol}</p>
                      <p className="text-xs text-slate-400 truncate">{stock.name}</p>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-slate-900">
                      ₹{stock.price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                    <span className={`text-sm font-semibold ${stock.changePercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Sectors */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Explore by Sector</h2>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {SECTORS.map(sector => (
              <button
                key={sector.name}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl ${sector.color} hover:opacity-80 transition-opacity`}
              >
                <span className="text-2xl">{sector.icon}</span>
                <span className="text-xs font-medium">{sector.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Two Column: Gainers & Losers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <StockTable 
            title="Top Gainers" 
            stocks={gainers} 
            loading={loading}
            isGainer={true}
          />
          <StockTable 
            title="Top Losers" 
            stocks={losers} 
            loading={loading}
            isGainer={false}
          />
        </div>

        {/* All Stocks Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">All Stocks</h2>
            <Link href="/stocks" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              View All →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {INDIAN_STOCKS.slice(0, 20).map(stock => (
              <Link
                key={stock.symbol}
                href={`/stock/${stock.symbol}`}
                className="bg-white rounded-xl border border-slate-200 p-3 hover:border-slate-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold">
                    {stock.symbol.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{stock.symbol}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 truncate">{stock.name}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="pt-6 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-400">
            Nivesh AI · NSE/BSE Market Data · Not financial advice
          </p>
        </footer>
      </div>
    </div>
  );
}

function StockTable({ 
  title, 
  stocks, 
  loading,
  isGainer 
}: { 
  title: string; 
  stocks: StockMover[]; 
  loading: boolean;
  isGainer: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <Link href={`/stocks?filter=${isGainer ? 'gainers' : 'losers'}`} className="text-xs text-indigo-600 font-medium">
          See All
        </Link>
      </div>
      
      {loading ? (
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse" />
                <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
              </div>
              <div className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div>
          {stocks.slice(0, 5).map((stock, i) => (
            <Link
              key={stock.symbol}
              href={`/stock/${stock.symbol}`}
              className={`flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors ${
                i !== Math.min(stocks.length, 5) - 1 ? 'border-b border-slate-50' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold">
                  {stock.symbol.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{stock.symbol}</p>
                  <p className="text-xs text-slate-400">{stock.name?.slice(0, 20)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">
                  ₹{stock.price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
                <p className={`text-xs font-semibold ${isGainer ? 'text-emerald-600' : 'text-red-600'}`}>
                  {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
