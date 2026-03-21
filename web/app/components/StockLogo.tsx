'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

// In-memory cache for logo URLs and their validity
const logoCache = new Map<string, { url: string | null; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// LocalStorage cache key
const LOGO_CACHE_KEY = 'nivesh_stock_logos';

// Load cache from localStorage on init
function loadCacheFromStorage(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const stored = localStorage.getItem(LOGO_CACHE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const now = Date.now();
      
      // Load valid entries into memory cache
      Object.entries(parsed).forEach(([symbol, data]: [string, any]) => {
        if (data.timestamp && now - data.timestamp < CACHE_TTL) {
          logoCache.set(symbol, data);
        }
      });
    }
  } catch {
    // Ignore localStorage errors
  }
}

// Save cache to localStorage
function saveCacheToStorage(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const cacheObj: Record<string, any> = {};
    logoCache.forEach((value, key) => {
      cacheObj[key] = value;
    });
    localStorage.setItem(LOGO_CACHE_KEY, JSON.stringify(cacheObj));
  } catch {
    // Ignore localStorage errors (quota exceeded, etc.)
  }
}

// Initialize cache from storage
if (typeof window !== 'undefined') {
  loadCacheFromStorage();
}

// Fallback colors for when logo is not available
const STOCK_COLORS = [
  '#e3f2fd', '#e8f5e9', '#fff3e0', '#fce4ec', '#f3e5f5', 
  '#e0f7fa', '#fffde7', '#eceff1', '#fbe9e7', '#e8eaf6'
];

function getStockColor(symbol: string): string {
  const index = symbol.charCodeAt(0) % STOCK_COLORS.length;
  return STOCK_COLORS[index];
}

function getStockInitials(symbol: string): string {
  return symbol.slice(0, 2).toUpperCase();
}

// Build logo URL - using Logo.dev with .IN suffix for Indian stocks
function buildLogoUrl(symbol: string, size: number): string {
  const token = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN;
  if (!token) return '';
  
  const ticker = `${symbol.toUpperCase()}.IN`;
  return `https://img.logo.dev/ticker/${ticker}?token=${token}&size=${size}&format=png`;
}

interface StockLogoProps {
  symbol: string;
  name?: string;
  size?: number;
  className?: string;
}

export default function StockLogo({ symbol, name, size = 40, className = '' }: StockLogoProps) {
  const [logoState, setLogoState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  
  const bgColor = getStockColor(symbol);
  const initials = getStockInitials(symbol);
  const cacheKey = symbol.toUpperCase();

  useEffect(() => {
    // Check memory cache first
    const cached = logoCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && now - cached.timestamp < CACHE_TTL) {
      if (cached.url) {
        setLogoUrl(cached.url);
        setLogoState('loaded');
      } else {
        setLogoState('error'); // Cached as failed
      }
      return;
    }

    // Build URL and try to load
    const url = buildLogoUrl(symbol, size * 2);
    if (!url) {
      setLogoState('error');
      return;
    }

    // Preload image to check if it exists
    const img = new window.Image();
    img.onload = () => {
      // Cache successful load
      logoCache.set(cacheKey, { url, timestamp: now });
      saveCacheToStorage();
      setLogoUrl(url);
      setLogoState('loaded');
    };
    img.onerror = () => {
      // Cache failed load (so we don't retry)
      logoCache.set(cacheKey, { url: null, timestamp: now });
      saveCacheToStorage();
      setLogoState('error');
    };
    img.src = url;
  }, [symbol, size, cacheKey]);

  // Show fallback for loading or error states
  if (logoState !== 'loaded' || !logoUrl) {
    return (
      <div
        className={`rounded-full flex items-center justify-center font-bold text-[#444] shrink-0 ${className}`}
        style={{ 
          width: size, 
          height: size, 
          backgroundColor: bgColor,
          fontSize: Math.max(10, size * 0.28)
        }}
        title={name || symbol}
      >
        {initials}
      </div>
    );
  }

  return (
    <div 
      className={`relative rounded-full overflow-hidden bg-white border border-[#eee] shrink-0 ${className}`}
      style={{ width: size, height: size }}
      title={name || symbol}
    >
      <Image
        src={logoUrl}
        alt={name || symbol}
        width={size}
        height={size}
        className="object-contain p-1"
        unoptimized
      />
    </div>
  );
}

// Utility to preload logos for a list of symbols (call on page load)
export function preloadLogos(symbols: string[]): void {
  if (typeof window === 'undefined') return;
  
  const token = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN;
  if (!token) return;

  symbols.forEach(symbol => {
    const cacheKey = symbol.toUpperCase();
    const cached = logoCache.get(cacheKey);
    
    // Skip if already cached
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) return;

    const url = buildLogoUrl(symbol, 80);
    const img = new window.Image();
    img.onload = () => {
      logoCache.set(cacheKey, { url, timestamp: Date.now() });
      saveCacheToStorage();
    };
    img.onerror = () => {
      logoCache.set(cacheKey, { url: null, timestamp: Date.now() });
      saveCacheToStorage();
    };
    img.src = url;
  });
}

// Export for use in other components
export { getStockColor, getStockInitials };
