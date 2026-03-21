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
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              StockBot
            </span>
            <span className="hidden sm:inline text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
              NSE/BSE
            </span>
          </a>

          {/* Search */}
          <div className="relative flex-1 max-w-xl">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white"
                autoComplete="off"
              />
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-y-auto"
              >
                {suggestions.map((stock, index) => (
                  <button
                    key={stock.symbol}
                    type="button"
                    onClick={() => navigateToStock(stock)}
                    className={`w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-blue-50 transition-colors text-sm ${
                      index === selectedIndex ? 'bg-blue-100' : ''
                    } ${index !== suggestions.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-blue-600 min-w-[70px]">{stock.symbol}</span>
                      <span className="text-gray-700 truncate">{stock.name}</span>
                    </div>
                    {stock.sector && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full ml-2 whitespace-nowrap">
                        {stock.sector}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-4 text-sm shrink-0">
            <a href="/" className="text-gray-600 hover:text-gray-900 font-medium">Dashboard</a>
          </div>
        </div>
      </div>
    </nav>
  );
}
