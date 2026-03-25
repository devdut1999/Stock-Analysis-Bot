'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { INDIAN_STOCKS, StockInfo } from '../../lib/data/indian-stocks';
import StockLogo from './StockLogo';
import { useAuth } from '../../lib/hooks/useAuth';

function fuzzySearch(query: string, stocks: StockInfo[], limit = 6): StockInfo[] {
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

    if (score > 0) results.push({ stock, score });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit).map(r => r.stock);
}

export default function Navbar() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<StockInfo[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

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
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
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
    <nav className="sticky top-0 z-50 bg-white border-b border-[#e5e5e5]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8">
              <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="32" height="32" rx="8" fill="#5367ff"/>
                <path d="M8 20L12 16L16 18L24 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 10H24V14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-[18px] font-bold text-[#1a1a1a]">Nivesh</span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            <Link href="/" className="px-4 py-2 text-[14px] font-medium text-[#1a1a1a] hover:bg-[#f7f7f7] rounded-lg transition-colors">
              Explore
            </Link>
            <Link href="/" className="px-4 py-2 text-[14px] font-medium text-[#666] hover:bg-[#f7f7f7] rounded-lg transition-colors">
              Watchlist
            </Link>
            <Link href="/" className="px-4 py-2 text-[14px] font-medium text-[#666] hover:bg-[#f7f7f7] rounded-lg transition-colors">
              Orders
            </Link>
            <Link href="/integrations" className="px-4 py-2 text-[14px] font-medium text-[#666] hover:bg-[#f7f7f7] rounded-lg transition-colors">
              Integrations
            </Link>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-sm mx-4">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#999]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                onFocus={() => query.length >= 1 && suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-2 text-[14px] rounded-lg bg-[#f7f7f7] text-[#1a1a1a] placeholder-[#999] focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#5367ff] transition-all"
                autoComplete="off"
              />
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute z-50 w-full mt-1 bg-white border border-[#e5e5e5] rounded-lg shadow-lg overflow-hidden"
              >
                {suggestions.map((stock, index) => (
                  <button
                    key={stock.symbol}
                    type="button"
                    onClick={() => navigateToStock(stock)}
                    className={`w-full px-3 py-2.5 text-left flex items-center gap-3 transition-colors ${
                      index === selectedIndex ? 'bg-[#f7f7f7]' : 'hover:bg-[#f7f7f7]'
                    } ${index !== suggestions.length - 1 ? 'border-b border-[#f0f0f0]' : ''}`}
                  >
                    <StockLogo symbol={stock.symbol} name={stock.name} size={32} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#1a1a1a]">{stock.symbol}</p>
                      <p className="text-[11px] text-[#999] truncate">{stock.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Notifications placeholder */}
            <button
              className="relative p-2 text-[#666] hover:bg-[#f7f7f7] rounded-lg transition-colors"
              title="Notifications coming soon"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              {authLoading ? (
                <div className="w-8 h-8 rounded-full bg-[#f0f0f0] animate-pulse" />
              ) : user ? (
                <>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="w-8 h-8 rounded-full bg-[#5367ff] flex items-center justify-center text-white text-[13px] font-semibold hover:bg-[#4356e6] transition-colors"
                  >
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </button>
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-[#e5e5e5] rounded-xl shadow-lg overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-[#f0f0f0]">
                        <p className="text-[13px] font-medium text-[#1a1a1a] truncate">{user.email}</p>
                      </div>
                      <Link
                        href="/integrations"
                        onClick={() => setShowUserMenu(false)}
                        className="block px-4 py-2.5 text-[13px] text-[#666] hover:bg-[#f7f7f7] transition-colors"
                      >
                        Integrations
                      </Link>
                      <button
                        onClick={() => { setShowUserMenu(false); signOut(); }}
                        className="w-full text-left px-4 py-2.5 text-[13px] text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href="/login"
                  className="text-[13px] font-semibold text-white bg-[#5367ff] hover:bg-[#4356e6] px-4 py-2 rounded-lg transition-colors"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
