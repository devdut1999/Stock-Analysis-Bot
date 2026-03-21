'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { INDIAN_STOCKS, StockInfo } from '../../lib/data/indian-stocks';
import AuthButton from './AuthButton';

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
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="text-lg font-bold text-slate-900">
              Nivesh
            </span>
          </a>

          {/* Nav links - Groww style */}
          <div className="hidden md:flex items-center gap-1">
            <a href="/" className="text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">
              Explore
            </a>
            <a href="/" className="text-sm font-medium text-slate-500 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">
              Watchlist
            </a>
            <a href="/integrations" className="text-sm font-medium text-slate-500 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">
              Integrations
            </a>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                onFocus={() => query.length >= 1 && suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Search stocks..."
                className="w-full pl-10 pr-10 py-2 text-sm rounded-lg bg-slate-100 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
                autoComplete="off"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">⌘K</span>
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-80 overflow-y-auto"
              >
                {suggestions.map((stock, index) => (
                  <button
                    key={stock.symbol}
                    type="button"
                    onClick={() => navigateToStock(stock)}
                    className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-all text-sm ${
                      index === selectedIndex ? 'bg-slate-50' : 'hover:bg-slate-50'
                    } ${index !== suggestions.length - 1 ? 'border-b border-slate-100' : ''}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold">
                      {stock.symbol.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">{stock.symbol}</p>
                      <p className="text-xs text-slate-400 truncate">{stock.name}</p>
                    </div>
                    <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <AuthButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
