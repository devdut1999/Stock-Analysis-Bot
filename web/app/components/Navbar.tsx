'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { INDIAN_STOCKS, StockInfo } from '../../lib/data/indian-stocks';

function fuzzySearch(query: string, stocks: StockInfo[], limit = 8): StockInfo[] {
  if (!query.trim()) return [];
  const searchTerm = query.toUpperCase().trim();
  const results: { stock: StockInfo; score: number }[] = [];

  for (const stock of stocks) {
    let score = 0;
    const symbolUpper = stock.symbol.toUpperCase();
    const nameUpper = stock.name.toUpperCase();

    if (symbolUpper === searchTerm) score = 1000;
    else if (symbolUpper.startsWith(searchTerm)) score = 500 + (100 - symbolUpper.length);
    else if (symbolUpper.includes(searchTerm)) score = 200;
    else if (nameUpper.startsWith(searchTerm)) score = 150;
    else if (nameUpper.includes(searchTerm)) score = 100;
    else {
      let queryIdx = 0;
      for (let i = 0; i < symbolUpper.length && queryIdx < searchTerm.length; i++) {
        if (symbolUpper[i] === searchTerm[queryIdx]) queryIdx++;
      }
      if (queryIdx === searchTerm.length) score = 50;
    }

    if (score > 0) results.push({ stock, score });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit).map(r => r.stock);
}

export default function Navbar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<StockInfo[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length >= 1) {
      const matches = fuzzySearch(query, INDIAN_STOCKS);
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
      setSelectedIndex(-1);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navigateToStock = useCallback((stock: StockInfo) => {
    setQuery('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
    router.push(`/stock/${stock.symbol}`);
  }, [router]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          navigateToStock(suggestions[selectedIndex]);
        } else if (suggestions.length > 0) {
          navigateToStock(suggestions[0]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  }, [showSuggestions, suggestions, selectedIndex, navigateToStock]);

  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3 shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-shadow">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="text-xl font-bold gradient-text tracking-tight">
              StockBot
            </span>
            <span className="hidden sm:inline text-[10px] bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider shadow-sm">
              NSE/BSE
            </span>
          </a>

          {/* Search */}
          <div className="relative flex-1 max-w-xl">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                onFocus={() => query.length >= 1 && suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Search stocks... (RELIANCE, TCS, INFY)"
                className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                autoComplete="off"
              />
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/50 max-h-80 overflow-y-auto"
              >
                {suggestions.map((stock, index) => (
                  <button
                    key={stock.symbol}
                    type="button"
                    onClick={() => navigateToStock(stock)}
                    className={`w-full px-4 py-3 text-left flex items-center justify-between transition-all text-sm ${
                      index === selectedIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'
                    } ${index !== suggestions.length - 1 ? 'border-b border-slate-100' : ''} ${index === 0 ? 'rounded-t-2xl' : ''} ${index === suggestions.length - 1 ? 'rounded-b-2xl' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-indigo-600 min-w-[70px]">{stock.symbol}</span>
                      <span className="text-slate-600 truncate">{stock.name}</span>
                    </div>
                    {stock.sector && (
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full ml-2 whitespace-nowrap uppercase tracking-wider font-medium">
                        {stock.sector}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <a href="/" className="text-slate-600 hover:text-indigo-600 font-medium transition-colors px-4 py-2 rounded-lg hover:bg-indigo-50">
              Dashboard
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
