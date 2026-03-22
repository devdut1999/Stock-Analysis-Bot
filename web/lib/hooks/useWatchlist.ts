'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';

const STORAGE_KEY = 'nivesh-watchlist';

function getLocalSymbols(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setLocalSymbols(symbols: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
  } catch { /* ignore quota errors */ }
}

interface WatchlistState {
  symbols: string[];
  loading: boolean;
  error: string | null;
}

export function useWatchlist() {
  const { user } = useAuth();
  const [state, setState] = useState<WatchlistState>({
    symbols: [],
    loading: true,
    error: null,
  });
  const migrated = useRef(false);
  const pendingOps = useRef<Map<string, 'add' | 'remove'>>(new Map());

  // Load watchlist — from Supabase if authenticated, localStorage if not
  useEffect(() => {
    const loadWatchlist = async () => {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      if (user) {
        try {
          const res = await fetch('/api/watchlist');
          if (!res.ok) {
            throw new Error(`Failed to fetch watchlist: ${res.status}`);
          }
          
          const data = await res.json();
          const serverSymbols = data.symbols || [];
          setState({ symbols: serverSymbols, loading: false, error: null });
          
          // Migrate localStorage items on first login
          if (!migrated.current) {
            migrated.current = true;
            const local = getLocalSymbols();
            const toMigrate = local.filter(s => !serverSymbols.includes(s));
            
            if (toMigrate.length > 0) {
              const results = await Promise.allSettled(
                toMigrate.map(symbol =>
                  fetch('/api/watchlist', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ symbol }),
                  })
                )
              );
              
              // Only add successfully migrated symbols
              const migrated = toMigrate.filter((_, i) => results[i].status === 'fulfilled');
              if (migrated.length > 0) {
                setState(prev => ({
                  ...prev,
                  symbols: [...new Set([...prev.symbols, ...migrated])],
                }));
              }
              
              // Clear localStorage after migration attempt
              localStorage.removeItem(STORAGE_KEY);
            }
          }
        } catch (error) {
          console.error('Watchlist fetch error:', error);
          // Fallback to localStorage if API fails
          setState({
            symbols: getLocalSymbols(),
            loading: false,
            error: 'Failed to load watchlist from server',
          });
        }
      } else {
        // Not authenticated — use localStorage
        setState({
          symbols: getLocalSymbols(),
          loading: false,
          error: null,
        });
      }
    };

    loadWatchlist();
  }, [user]);

  const add = useCallback(async (symbol: string) => {
    const upper = symbol.toUpperCase();
    
    // Optimistic update
    setState(prev => {
      if (prev.symbols.includes(upper)) return prev;
      return { ...prev, symbols: [...prev.symbols, upper], error: null };
    });

    if (user) {
      // Track pending operation
      pendingOps.current.set(upper, 'add');
      
      try {
        const res = await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: upper }),
        });
        
        if (!res.ok) {
          throw new Error(`Failed to add to watchlist: ${res.status}`);
        }
      } catch (error) {
        console.error('Watchlist add error:', error);
        // Revert optimistic update
        setState(prev => ({
          ...prev,
          symbols: prev.symbols.filter(s => s !== upper),
          error: 'Failed to add to watchlist',
        }));
      } finally {
        pendingOps.current.delete(upper);
      }
    } else {
      // Update localStorage
      const updated = [...new Set([...getLocalSymbols(), upper])];
      setLocalSymbols(updated);
    }
  }, [user]);

  const remove = useCallback(async (symbol: string) => {
    const upper = symbol.toUpperCase();
    
    // Optimistic update
    setState(prev => ({
      ...prev,
      symbols: prev.symbols.filter(s => s !== upper),
      error: null,
    }));

    if (user) {
      // Track pending operation
      pendingOps.current.set(upper, 'remove');
      
      try {
        const res = await fetch(`/api/watchlist?symbol=${upper}`, { method: 'DELETE' });
        
        if (!res.ok) {
          throw new Error(`Failed to remove from watchlist: ${res.status}`);
        }
      } catch (error) {
        console.error('Watchlist remove error:', error);
        // Revert optimistic update
        setState(prev => ({
          ...prev,
          symbols: [...prev.symbols, upper],
          error: 'Failed to remove from watchlist',
        }));
      } finally {
        pendingOps.current.delete(upper);
      }
    } else {
      // Update localStorage
      const updated = getLocalSymbols().filter(s => s !== upper);
      setLocalSymbols(updated);
    }
  }, [user]);

  const has = useCallback(
    (symbol: string) => state.symbols.includes(symbol.toUpperCase()),
    [state.symbols]
  );

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    symbols: state.symbols,
    loading: state.loading,
    error: state.error,
    add,
    remove,
    has,
    clearError,
  };
}
