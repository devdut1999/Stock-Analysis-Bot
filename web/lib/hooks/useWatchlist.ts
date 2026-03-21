'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'stockbot-watchlist';

export function useWatchlist() {
  const [symbols, setSymbols] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSymbols(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const save = useCallback((updated: string[]) => {
    setSymbols(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch { /* ignore */ }
  }, []);

  const add = useCallback((symbol: string) => {
    const upper = symbol.toUpperCase();
    setSymbols(prev => {
      if (prev.includes(upper)) return prev;
      const updated = [...prev, upper];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const remove = useCallback((symbol: string) => {
    const upper = symbol.toUpperCase();
    setSymbols(prev => {
      const updated = prev.filter(s => s !== upper);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const has = useCallback((symbol: string) => symbols.includes(symbol.toUpperCase()), [symbols]);

  return { symbols, add, remove, has };
}
