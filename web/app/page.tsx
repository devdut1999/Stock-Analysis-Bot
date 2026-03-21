'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { INDIAN_STOCKS } from '../lib/data/indian-stocks';
import StockLogo, { preloadLogos, getStockColor } from './components/StockLogo';

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
  { name: 'Stocks', icon: '📈', desc: 'Invest in companies', href: '/', color: '#e8f5e9' },
  { name: 'Mutual Funds', icon: '📊', desc: 'Diversified portfolios', href: '/', color: '#e3f2fd' },
  { name: 'F&O', icon: '⚡', desc: 'Futures & Options', href: '/', color: '#fff3e0' },
  { name: 'IPO', icon: '🚀', desc: 'New listings', href: '/', color: '#fce4ec' },
  { name: 'Gold', icon: '🥇', desc: 'Digital gold', href: '/', color: '#fffde7' },
  { name: 'FDs', icon: '🏦', desc: 'Fixed deposits', href: '/', color: '#f3e5f5' },
];

const SECTORS = [
  { name: 'IT', stocks: 45, color: '#e3f2fd' },
  { name: 'Banking', stocks: 38, color: '#e8f5e9' },
  { name: 'Pharma', stocks: 32, color: '#fce4ec' },
  { name: 'Auto', stocks: 28, color: '#fff3e0' },
  { name: 'FMCG', stocks: 25, color: '#f3e5f5' },
  { name: 'Energy', stocks: 22, color: '#fffde7' },
  { name: 'Metals', stocks: 20, color: '#eceff1' },
  { name: 'Realty', stocks: 18, color: '#e0f7fa' },
];

export default function ExplorePage() {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [gainers, setGainers] = useState<StockMover[]>([]);
  const [losers, setLosers] = useState<StockMover[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
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
        
        // Preload logos for visible stocks
        const allSymbols = [...(data.gainers || []), ...(data.losers || [])].map(s => s.symbol);
        preloadLogos(allSymbols);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Indices Ticker Bar */}
      <div className="bg-white border-b border-[#eee]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center h-11 gap-8 overflow-x-auto scrollbar-hide">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 shrink-0">
                  <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                </div>
              ))
            ) : (
              indices.map(idx => (
                <div key={idx.symbol} className="flex items-center gap-2 shrink-0">
                  <span className="text-[13px] text-[#666] font-medium">{idx.name}</span>
                  <span className="text-[13px] text-[#1a1a1a] font-semibold">
                    {idx.price?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                  <span className={`text-[13px] font-semibold ${idx.change >= 0 ? 'text-[#00b386]' : 'text-[#eb5757]'}`}>
                    ({idx.change >= 0 ? '+' : ''}{idx.changePercent?.toFixed(2)}%)
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Products */}
        <section className="mb-10">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {PRODUCTS.map(product => (
              <Link
                key={product.name}
                href={product.href}
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-[#eee] hover:shadow-md hover:border-[#ddd] transition-all group"
              >
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: product.color }}
                >
                  {product.icon}
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-semibold text-[#1a1a1a]">{product.name}</p>
                  <p className="text-[11px] text-[#999] hidden sm:block">{product.desc}</p>
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
          isGainer
        />

        {/* Top Losers */}
        <StockSection
          title="Top Losers"
          stocks={losers}
          loading={loading}
          viewAllHref="/stocks?filter=losers"
          showChange
          isGainer={false}
        />

        {/* Explore Sectors */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[17px] font-semibold text-[#1a1a1a]">Explore Sectors</h2>
            <Link href="/sectors" className="text-[13px] font-medium text-[#5367ff] hover:underline">
              See all
            </Link>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {SECTORS.map(sector => (
              <Link
                key={sector.name}
                href={`/stocks?sector=${sector.name.toLowerCase()}`}
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-[#eee] hover:shadow-md hover:border-[#ddd] transition-all group"
              >
                <div 
                  className="w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-bold text-[#444] group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: sector.color }}
                >
                  {sector.name.slice(0, 2)}
                </div>
                <div className="text-center">
                  <p className="text-[12px] font-semibold text-[#1a1a1a]">{sector.name}</p>
                  <p className="text-[10px] text-[#999]">{sector.stocks} stocks</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* All Stocks */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[17px] font-semibold text-[#1a1a1a]">All Stocks</h2>
            <Link href="/stocks" className="text-[13px] font-medium text-[#5367ff] hover:underline">
              See all
            </Link>
          </div>
          <div className="bg-white rounded-2xl border border-[#eee] overflow-hidden">
            <div className="grid grid-cols-[1fr_100px_90px] gap-4 px-5 py-3 text-[11px] text-[#999] font-semibold uppercase tracking-wide border-b border-[#f5f5f5]">
              <span>Company</span>
              <span className="text-right">Price</span>
              <span className="text-right">Change</span>
            </div>
            {INDIAN_STOCKS.slice(0, 8).map((stock, i) => (
              <Link
                key={stock.symbol}
                href={`/stock/${stock.symbol}`}
                className={`grid grid-cols-[1fr_100px_90px] gap-4 px-5 py-4 items-center hover:bg-[#fafafa] transition-colors ${i !== 7 ? 'border-b border-[#f5f5f5]' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <StockLogo symbol={stock.symbol} name={stock.name} size={40} />
                  <div>
                    <p className="text-[14px] font-semibold text-[#1a1a1a]">{stock.symbol}</p>
                    <p className="text-[12px] text-[#999] truncate max-w-[180px]">{stock.name}</p>
                  </div>
                </div>
                <span className="text-[14px] font-semibold text-[#1a1a1a] text-right">—</span>
                <span className="text-[13px] font-medium text-[#999] text-right">—</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 text-center">
          <p className="text-[12px] text-[#999]">
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
  showChange = false,
  isGainer = true
}: { 
  title: string; 
  stocks: StockMover[]; 
  loading: boolean;
  viewAllHref: string;
  showChange?: boolean;
  isGainer?: boolean;
}) {
  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[17px] font-semibold text-[#1a1a1a]">{title}</h2>
        <Link href={viewAllHref} className="text-[13px] font-medium text-[#5367ff] hover:underline">
          See all
        </Link>
      </div>
      
      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="w-[170px] shrink-0 bg-white rounded-2xl border border-[#eee] p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-gray-100 animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 w-14 bg-gray-100 rounded animate-pulse mb-2" />
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
              className="w-[170px] shrink-0 bg-white rounded-2xl border border-[#eee] p-4 hover:shadow-md hover:border-[#ddd] transition-all group"
            >
              <div className="flex items-center gap-3 mb-4">
                <StockLogo symbol={stock.symbol} name={stock.name} size={44} className="group-hover:scale-105 transition-transform" />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[#1a1a1a] truncate">{stock.symbol}</p>
                  <p className="text-[11px] text-[#999] truncate">{stock.name}</p>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[16px] font-bold text-[#1a1a1a]">
                  ₹{stock.price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
                {showChange && (
                  <span className={`text-[12px] font-semibold ${isGainer ? 'text-[#00b386]' : 'text-[#eb5757]'}`}>
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
