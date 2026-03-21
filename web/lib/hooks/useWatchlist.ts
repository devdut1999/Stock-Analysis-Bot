'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';

const STORAGE_KEY = 'stockbot-watchlist';

function getLocalSymbols(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setLocalSymbols(symbols: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
  } catch { /* ignore */ }
}

export function useWatchlist() {
  const { user } = useAuth();
  const [symbols, setSymbols] = useState<string[]>([]);
  const migrated = useRef(false);

  // Load watchlist — from Supabase if authenticated, localStorage if not
  useEffect(() => {
    if (user) {
      // Authenticated — fetch from Supabase
      fetch('/api/watchlist')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.symbols) {
            setSymbols(data.symbols);
            // Migrate localStorage items on first login
            if (!migrated.current) {
              migrated.current = true;
              const local = getLocalSymbols();
              const toMigrate = local.filter(s => !data.symbols.includes(s));
              if (toMigrate.length > 0) {
                Promise.all(
                  toMigrate.map(symbol =>
                    fetch('/api/watchlist', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ symbol }),
                    })
                  )
                ).then(() => {
                  setSymbols(prev => [...new Set([...prev, ...toMigrate])]);
                  // Clear localStorage after migration
                  localStorage.removeItem(STORAGE_KEY);
                });
              }
            }
          }
        })
        .catch(() => {
          // Fallback to localStorage if API fails
          setSymbols(getLocalSymbols());
        });
    } else {
      // Not authenticated — use localStorage
      setSymbols(getLocalSymbols());
    }
  }, [user]);

  const add = useCallback((symbol: string) => {
    const upper = symbol.toUpperCase();
    setSymbols(prev => {
      if (prev.includes(upper)) return prev;
      const updated = [...prev, upper];

      if (user) {
        fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: upper }),
        });
      } else {
        setLocalSymbols(updated);
      }

      return updated;
    });
  }, [user]);

  const remove = useCallback((symbol: string) => {
    const upper = symbol.toUpperCase();
    setSymbols(prev => {
      const updated = prev.filter(s => s !== upper);

      if (user) {
        fetch(`/api/watchlist?symbol=${upper}`, { method: 'DELETE' });
      } else {
        setLocalSymbols(updated);
      }

      return updated;
    });
  }, [user]);

  const has = useCallback((symbol: string) => symbols.includes(symbol.toUpperCase()), [symbols]);

  return { symbols, add, remove, has };
}
