'use client';

import { useState, useEffect, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { STOCK_MAP } from '../../../lib/data/indian-stocks';
import { useWatchlist } from '../../../lib/hooks/useWatchlist';
import Link from 'next/link';
import StockChart from '../../components/StockChart';
import TradingPanel from '../../components/TradingPanel';
import AnimatedTabs, { TabContent } from '../../components/AnimatedTabs';
import StockLogo from '../../components/StockLogo';

type TabId = 'overview' | 'technical' | 'fundamental' | 'minervini' | 'fno' | 'news' | 'signal';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'technical', label: 'Technical' },
  { id: 'fundamental', label: 'Fundamental' },
  { id: 'minervini', label: 'SEPA' },
  { id: 'fno', label: 'F&O' },
  { id: 'news', label: 'News' },
  { id: 'signal', label: 'AI Signal' },
];

export default function StockDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = use(params);
  const stockInfo = STOCK_MAP.get(symbol.toUpperCase());
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [data, setData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const watchlist = useWatchlist();

  // Fetch overview data on mount
  useEffect(() => {
    fetchTabData('overview');
  }, [symbol]);

  const fetchTabData = async (tab: TabId) => {
    if (data[tab]) return; // Already loaded
    if (tab === 'minervini') return; // MinerviniContent handles its own fetch

    setLoading(prev => ({ ...prev, [tab]: true }));
    setErrors(prev => ({ ...prev, [tab]: '' }));

    try {
      const type = tab === 'signal' ? 'deep' : 'quick';
      const response = await fetch(`/api/analyze?symbol=${encodeURIComponent(symbol)}&type=${type}`);
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Failed to fetch data');

      setData(prev => ({ ...prev, [tab]: result }));
    } catch (err) {
      setErrors(prev => ({
        ...prev,
        [tab]: err instanceof Error ? err.message : 'An error occurred',
      }));
    } finally {
      setLoading(prev => ({ ...prev, [tab]: false }));
    }
  };

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    fetchTabData(tab);
  };

  const overviewData = data['overview'] || data['signal'];
  const priceData = overviewData?.price;
  const historicalData = overviewData?.historical || [];
  const isPositive = (priceData?.change ?? 0) >= 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
          <Link href="/" className="hover:text-indigo-600 transition-colors">Home</Link>
          <span>›</span>
          <Link href="/" className="hover:text-indigo-600 transition-colors">Stocks</Link>
          <span>›</span>
          <span className="text-slate-700 font-medium">{stockInfo?.name || symbol.toUpperCase()}</span>
        </div>

        {/* Main Layout: Content + Trading Panel */}
        <div className="flex gap-6">
          {/* Left: Main Content */}
          <div className="flex-1 min-w-0">
            {/* Stock Header - Groww Style */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4 shadow-sm">
              <div className="flex items-start gap-4">
                {/* Stock Logo */}
                <StockLogo symbol={symbol.toUpperCase()} name={stockInfo?.name} size={56} showRealLogo />
                
                <div className="flex-1 min-w-0">
                  {/* Symbol & Exchange Row */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-slate-500">{symbol.toUpperCase()}</span>
                    <span className="text-slate-300">•</span>
                    <button className="flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors">
                      NSE
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Company Name */}
                  <h1 className="text-xl font-bold text-slate-900 mb-2">{stockInfo?.name || symbol.toUpperCase()}</h1>
                  
                  {/* Price Display - Prominent */}
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-bold text-slate-900">
                      ₹{priceData?.currentPrice?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '—'}
                    </span>
                    <span className={`text-lg font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isPositive ? '+' : ''}{priceData?.change?.toFixed(2) || '0.00'} ({isPositive ? '+' : ''}{priceData?.changePercent?.toFixed(2) || '0.00'}%)
                    </span>
                    <span className="text-xs text-slate-400 font-medium">1D</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => watchlist.has(symbol) ? watchlist.remove(symbol) : watchlist.add(symbol)}
                    className={`p-2.5 rounded-xl border transition-all ${
                      watchlist.has(symbol)
                        ? 'bg-amber-50 border-amber-200 text-amber-600'
                        : 'bg-white border-slate-200 text-slate-400 hover:border-amber-200 hover:text-amber-500'
                    }`}
                    title={watchlist.has(symbol) ? 'Remove from watchlist' : 'Add to watchlist'}
                  >
                    <svg className="w-5 h-5" fill={watchlist.has(symbol) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </button>
                  <button className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:border-indigo-200 hover:text-indigo-500 transition-all" title="Share">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </button>
                  <button className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:border-indigo-200 hover:text-indigo-500 transition-all" title="More options">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Price Chart */}
            <div className="mb-4">
              <StockChart
                symbol={symbol}
                currentPrice={priceData?.currentPrice}
                change={priceData?.change}
                changePercent={priceData?.changePercent}
                historicalData={historicalData}
              />
            </div>

            {/* Tabs - Underline Style like Groww */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="border-b border-slate-100">
                <nav className="flex">
                  {TABS.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id as TabId)}
                      className={`relative px-5 py-3.5 text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'text-indigo-600'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {tab.label}
                      {activeTab === tab.id && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      )}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-5 min-h-[400px]">
                {loading[activeTab] && (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <div className="relative w-10 h-10 mx-auto mb-3">
                        <div className="absolute inset-0 rounded-full border-2 border-slate-100"></div>
                        <div className="absolute inset-0 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
                      </div>
                      <p className="text-slate-500 text-sm">
                        {activeTab === 'signal' ? 'Running AI analysis...' : 'Loading...'}
                      </p>
                      {activeTab === 'signal' && (
                        <p className="text-slate-400 text-xs mt-1">10 agents • 30-60 seconds</p>
                      )}
                    </div>
                  </div>
                )}

                {errors[activeTab] && (
                  <div className="text-center py-16">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                      <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h3 className="text-slate-900 font-semibold mb-2">Unable to load data</h3>
                    <p className="text-slate-400 text-sm mb-4 max-w-sm mx-auto">{errors[activeTab]}</p>
                    <button
                      onClick={() => {
                        setData(prev => { const n = { ...prev }; delete n[activeTab]; return n; });
                        fetchTabData(activeTab);
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {!loading[activeTab] && !errors[activeTab] && (
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      {renderTab(activeTab, data, symbol)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Right: Trading Panel (Desktop) */}
          <div className="hidden lg:block w-[340px] shrink-0">
            <div className="sticky top-4">
              <TradingPanel
                symbol={symbol.toUpperCase()}
                currentPrice={priceData?.currentPrice || 0}
                change={priceData?.change || 0}
                changePercent={priceData?.changePercent || 0}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderTab(tab: TabId, data: Record<string, any>, symbol: string) {
  const tabData = data[tab] || data['overview'];
  if (!tabData) return null;

  switch (tab) {
    case 'overview':
      return <OverviewContent data={tabData} />;
    case 'technical':
      return <TechnicalContent data={tabData} symbol={symbol} />;
    case 'fundamental':
      return <FundamentalContent data={tabData} />;
    case 'minervini':
      return <MinerviniContent symbol={symbol} />;
    case 'fno':
      return <FnOContent data={tabData} />;
    case 'news':
      return <NewsContent symbol={symbol} />;
    case 'signal':
      return <SignalContent data={data['signal']} />;
    default:
      return null;
  }
}

function MetricCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-xl border border-slate-100 p-4 hover:border-slate-200 hover:shadow-sm transition-all"
    >
      <p className="text-[11px] text-slate-400 mb-1.5 uppercase tracking-wide font-medium">{label}</p>
      <p className={`text-lg font-bold ${color || 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </motion.div>
  );
}

function OverviewContent({ data }: { data: any }) {
  const p = data.price;
  const t = data.technicals;
  const f = data.fundamentals;
  const ind = data.indiaSpecific;

  return (
    <div className="space-y-6">
      {/* Performance Stats - Horizontal Row */}
      {p && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 mb-1">Today's Low</span>
            <span className="text-sm font-semibold text-slate-900">₹{p.low?.toFixed(2)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 mb-1">Today's High</span>
            <span className="text-sm font-semibold text-slate-900">₹{p.high?.toFixed(2)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 mb-1">52W Low</span>
            <span className="text-sm font-semibold text-slate-900">₹{p.fiftyTwoWeekLow?.toFixed(2)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 mb-1">52W High</span>
            <span className="text-sm font-semibold text-slate-900">₹{p.fiftyTwoWeekHigh?.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Key Metrics Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            {p?.open && (
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500">Open</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">₹{p.open?.toFixed(2)}</td>
              </tr>
            )}
            {p?.previousClose && (
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500">Prev. Close</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">₹{p.previousClose?.toFixed(2)}</td>
              </tr>
            )}
            {p?.volume && (
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500">Volume</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">{p.volume?.toLocaleString('en-IN')}</td>
              </tr>
            )}
            {p?.marketCap && (
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500">Market Cap</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">₹{(p.marketCap / 1e7).toFixed(0)} Cr</td>
              </tr>
            )}
            {f?.peRatio && (
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500">P/E Ratio</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">{f.peRatio?.toFixed(2)}</td>
              </tr>
            )}
            {f?.pbRatio && (
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500">P/B Ratio</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">{f.pbRatio?.toFixed(2)}</td>
              </tr>
            )}
            {f?.dividendYield != null && (
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500">Dividend Yield</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">{f.dividendYield?.toFixed(2)}%</td>
              </tr>
            )}
            {f?.eps && (
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500">EPS (TTM)</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">₹{f.eps?.toFixed(2)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Shareholding Pattern */}
      {ind?.promoterHolding && ind.promoterHolding.promoterPercentage > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Shareholding Pattern</h3>
          <div className="space-y-3">
            {[
              { label: 'Promoters', value: ind.promoterHolding.promoterPercentage, color: 'bg-indigo-500' },
              { label: 'FII', value: ind.promoterHolding.fiiPercentage, color: 'bg-emerald-500' },
              { label: 'DII', value: ind.promoterHolding.diiPercentage, color: 'bg-amber-500' },
              { label: 'Public', value: ind.promoterHolding.publicPercentage, color: 'bg-slate-400' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">{item.label}</span>
                  <span className="font-semibold text-slate-900">{item.value?.toFixed(2)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div 
                    className={`${item.color} h-2 rounded-full transition-all`} 
                    style={{ width: `${Math.min(item.value || 0, 100)}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TechnicalContent({ data, symbol }: { data: any; symbol: string }) {
  const t = data.technicals;
  if (!t) return <p className="text-slate-400">No technical data available.</p>;

  return (
    <div className="space-y-8">
      {/* RSI & MACD */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">Momentum Indicators</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {t.rsi != null && (
            <MetricCard
              label="RSI (14)"
              value={t.rsi.toFixed(1)}
              sub={t.rsi > 70 ? 'Overbought' : t.rsi < 30 ? 'Oversold' : 'Neutral'}
              color={t.rsi > 70 ? 'text-red-600' : t.rsi < 30 ? 'text-emerald-600' : undefined}
            />
          )}
          {t.macd && (
            <>
              <MetricCard label="MACD" value={t.macd.macd?.toFixed(2) || 'N/A'} />
              <MetricCard label="MACD Signal" value={t.macd.signal?.toFixed(2) || 'N/A'} />
              <MetricCard
                label="MACD Histogram"
                value={t.macd.histogram?.toFixed(2) || 'N/A'}
                color={t.macd.histogram > 0 ? 'text-emerald-600' : 'text-red-600'}
              />
            </>
          )}
        </div>
      </div>

      {/* Moving Averages */}
      {t.movingAverages && (
        <div>
          <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">Moving Averages</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {(['sma20', 'sma50', 'sma100', 'sma200', 'ema20'] as const).map(key => (
              t.movingAverages[key] != null && (
                <MetricCard key={key} label={key.toUpperCase()} value={`₹${t.movingAverages[key].toFixed(2)}`} />
              )
            ))}
          </div>
        </div>
      )}

      {/* Support & Resistance */}
      {t.supportResistance && (
        <div>
          <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">Support & Resistance</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {t.supportResistance.support1 != null && <MetricCard label="Support 1" value={`₹${t.supportResistance.support1.toFixed(2)}`} color="text-emerald-600" />}
            {t.supportResistance.support2 != null && <MetricCard label="Support 2" value={`₹${t.supportResistance.support2.toFixed(2)}`} color="text-emerald-600" />}
            {t.supportResistance.resistance1 != null && <MetricCard label="Resistance 1" value={`₹${t.supportResistance.resistance1.toFixed(2)}`} color="text-red-600" />}
            {t.supportResistance.resistance2 != null && <MetricCard label="Resistance 2" value={`₹${t.supportResistance.resistance2.toFixed(2)}`} color="text-red-600" />}
          </div>
        </div>
      )}

      {/* Bollinger Bands */}
      {t.bollingerBands && (
        <div>
          <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">Bollinger Bands</h3>
          <div className="grid grid-cols-3 gap-4">
            <MetricCard label="Upper" value={`₹${t.bollingerBands.upper?.toFixed(2)}`} />
            <MetricCard label="Middle" value={`₹${t.bollingerBands.middle?.toFixed(2)}`} />
            <MetricCard label="Lower" value={`₹${t.bollingerBands.lower?.toFixed(2)}`} />
          </div>
        </div>
      )}

      {/* VCP Analysis */}
      <VCPSection symbol={symbol} />
    </div>
  );
}

function FundamentalContent({ data }: { data: any }) {
  const f = data.fundamentals;
  const ind = data.indiaSpecific;

  if (!f && !ind) return <p className="text-slate-400">No fundamental data available.</p>;

  return (
    <div className="space-y-8">
      {f && (
        <div>
          <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">Valuation</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {f.peRatio != null && <MetricCard label="P/E Ratio" value={f.peRatio.toFixed(2)} />}
            {f.pegRatio != null && <MetricCard label="PEG Ratio" value={f.pegRatio.toFixed(2)} />}
            {f.pbRatio != null && <MetricCard label="P/B Ratio" value={f.pbRatio.toFixed(2)} />}
            {f.dividendYield != null && <MetricCard label="Dividend Yield" value={`${f.dividendYield.toFixed(2)}%`} />}
          </div>
        </div>
      )}

      {f && (f.roe || f.roce) && (
        <div>
          <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">Profitability</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {f.roe != null && <MetricCard label="ROE" value={`${f.roe.toFixed(1)}%`} />}
            {f.roce != null && <MetricCard label="ROCE" value={`${f.roce.toFixed(1)}%`} />}
            {f.debtToEquity != null && <MetricCard label="D/E Ratio" value={f.debtToEquity.toFixed(2)} />}
            {f.eps != null && <MetricCard label="EPS" value={`₹${f.eps.toFixed(2)}`} />}
          </div>
        </div>
      )}

      {ind?.promoterHolding && ind.promoterHolding.promoterPercentage > 0 && (
        <div>
          <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">Shareholding Pattern</h3>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="space-y-4">
              {[
                { label: 'Promoter', pct: ind.promoterHolding.promoterPercentage, color: 'bg-indigo-500' },
                { label: 'FII', pct: ind.promoterHolding.fiiPercentage, color: 'bg-emerald-500' },
                { label: 'DII', pct: ind.promoterHolding.diiPercentage, color: 'bg-amber-500' },
                { label: 'Public', pct: ind.promoterHolding.publicPercentage, color: 'bg-slate-400' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-500 font-medium">{item.label}</span>
                    <span className="font-bold text-slate-900">{item.pct?.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div className={`${item.color} h-2.5 rounded-full transition-all`} style={{ width: `${Math.min(item.pct || 0, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            {ind.promoterHolding.pledgedPercentage > 0 && (
              <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Pledged Shares</span>
                  <span className={`font-bold ${ind.promoterHolding.pledgedPercentage > 20 ? 'text-red-600' : 'text-slate-900'}`}>
                    {ind.promoterHolding.pledgedPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {ind?.fiiDii && (
        <div>
          <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">FII/DII Activity</h3>
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              label="FII Net"
              value={`₹${ind.fiiDii.fiiNetBuySell?.toFixed(0)} Cr`}
              color={ind.fiiDii.fiiNetBuySell >= 0 ? 'text-emerald-600' : 'text-red-600'}
              sub={ind.fiiDii.interpretation}
            />
            <MetricCard
              label="DII Net"
              value={`₹${ind.fiiDii.diiNetBuySell?.toFixed(0)} Cr`}
              color={ind.fiiDii.diiNetBuySell >= 0 ? 'text-emerald-600' : 'text-red-600'}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function FnOContent({ data }: { data: any }) {
  const fno = data.indiaSpecific?.fno;
  if (!fno) return <p className="text-slate-400">No F&O data available for this stock.</p>;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">F&O Overview</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {fno.putCallRatio != null && (
            <MetricCard
              label="Put-Call Ratio"
              value={fno.putCallRatio.toFixed(3)}
              sub={fno.putCallRatio > 1 ? 'Bearish' : fno.putCallRatio < 0.7 ? 'Bullish' : 'Neutral'}
              color={fno.putCallRatio > 1 ? 'text-red-600' : fno.putCallRatio < 0.7 ? 'text-emerald-600' : undefined}
            />
          )}
          {fno.maxPain != null && <MetricCard label="Max Pain" value={`₹${fno.maxPain.toFixed(0)}`} />}
          {fno.openInterest != null && <MetricCard label="Open Interest" value={fno.openInterest.toLocaleString('en-IN')} />}
          {fno.impliedVolatility != null && <MetricCard label="IV" value={`${fno.impliedVolatility.toFixed(1)}%`} />}
        </div>
      </div>

      {fno.interpretation && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
          <p className="text-sm text-indigo-700">{fno.interpretation}</p>
        </div>
      )}

      {/* Options Strategy Advisor */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5">
        <h4 className="text-sm font-bold text-indigo-700 mb-2">Options Strategy Advisor</h4>
        <p className="text-xs text-indigo-600/70">
          Black-Scholes pricing engine with 17 strategies available.
          Connect Groww/Zerodha MCP for live Greeks and options chain data.
        </p>
      </div>
    </div>
  );
}

function MinerviniContent({ symbol }: { symbol: string }) {
  const [sepaData, setSepaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/screener/minervini?symbol=${encodeURIComponent(symbol)}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setSepaData(data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#5367ff] mb-3" />
          <p className="text-[#999] text-sm">Running Minervini SEPA analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
        <p className="text-red-600 font-medium mb-1">Unable to run SEPA analysis</p>
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (!sepaData?.sepa) return null;

  const { sepa } = sepaData;
  const tt = sepa.trendTemplate;
  const vcp = sepa.vcp;
  const entry = sepa.entry;

  const stageColors: Record<string, string> = {
    'stage1-accumulation': 'bg-yellow-100 text-yellow-700',
    'stage2-uptrend': 'bg-emerald-100 text-emerald-700',
    'stage3-distribution': 'bg-orange-100 text-orange-700',
    'stage4-decline': 'bg-red-100 text-red-700',
  };

  const stageLabels: Record<string, string> = {
    'stage1-accumulation': 'Stage 1 — Accumulation',
    'stage2-uptrend': 'Stage 2 — Uptrend ✓',
    'stage3-distribution': 'Stage 3 — Distribution',
    'stage4-decline': 'Stage 4 — Decline',
  };

  return (
    <div className="space-y-6">
      {/* Summary Banner */}
      <div className={`rounded-2xl p-5 border ${sepa.valid ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-slate-900">
            SEPA Score: {sepa.score.toFixed(0)}/100
          </h3>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${stageColors[tt.stage] || 'bg-slate-100 text-slate-600'}`}>
            {stageLabels[tt.stage] || tt.stage}
          </span>
        </div>
        <p className="text-sm text-slate-600">{sepa.summary}</p>
      </div>

      {/* Trend Template — 8 Criteria */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Trend Template</h3>
          <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${tt.passes ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
            {tt.score}/8
          </span>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {tt.criteria.map((c: any, i: number) => (
            <div
              key={c.id}
              className={`flex items-start gap-3 px-5 py-3.5 ${i !== tt.criteria.length - 1 ? 'border-b border-slate-100' : ''}`}
            >
              <span className={`mt-0.5 text-sm ${c.passes ? 'text-emerald-500' : 'text-red-400'}`}>
                {c.passes ? '✓' : '✗'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-slate-800">{c.label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{c.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* VCP Pattern */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">VCP Pattern Detection</h3>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${vcp.detected ? 'bg-emerald-400' : 'bg-slate-300'}`} />
              <span className="text-sm font-semibold text-slate-800">
                {vcp.detected ? 'VCP Detected' : 'No VCP Pattern'}
              </span>
            </div>
            <span className="text-xs text-slate-400">Confidence: {vcp.confidence}%</span>
          </div>

          {vcp.contractions && vcp.contractions.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Contractions</p>
              <div className="flex gap-2 items-end">
                {vcp.contractions.map((c: any) => (
                  <div key={c.number} className="flex-1 text-center">
                    <div
                      className="bg-indigo-100 rounded-lg mx-auto mb-1"
                      style={{
                        height: `${Math.max(c.depthPercent * 3, 12)}px`,
                        width: '100%',
                      }}
                    />
                    <p className="text-[11px] font-bold text-slate-700">{c.depthPercent.toFixed(1)}%</p>
                    <p className="text-[10px] text-slate-400">{c.days}d</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {vcp.pivotPrice && (
            <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">Pivot:</span>
              <span className="text-sm font-bold text-indigo-600">₹{vcp.pivotPrice.toFixed(2)}</span>
            </div>
          )}

          <p className="text-xs text-slate-500 mt-3">
            Volume {vcp.volumeDeclining ? 'declining ✓' : 'not declining'}
          </p>
        </div>
      </div>

      {/* Entry Recommendation */}
      {entry && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">SEPA Entry</h3>
          <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] text-emerald-600 uppercase tracking-wider font-semibold mb-1">Entry</p>
                <p className="text-lg font-bold text-slate-900">₹{entry.entryPrice?.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] text-red-500 uppercase tracking-wider font-semibold mb-1">Stop Loss</p>
                <p className="text-lg font-bold text-red-600">₹{entry.stopLoss?.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Risk</p>
                <p className="text-lg font-bold text-slate-700">{entry.riskPercent?.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">R:R</p>
                <p className="text-lg font-bold text-slate-700">1:3</p>
              </div>
            </div>
            {entry.targets && (
              <div className="mt-4 pt-4 border-t border-emerald-200 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold">Target 1 (1R)</p>
                  <p className="text-sm font-bold text-slate-700">₹{entry.targets.r1?.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold">Target 2 (2R)</p>
                  <p className="text-sm font-bold text-slate-700">₹{entry.targets.r2?.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold">Target 3 (3R)</p>
                  <p className="text-sm font-bold text-slate-700">₹{entry.targets.r3?.toFixed(0)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function VCPSection({ symbol }: { symbol: string }) {
  const [vcpData, setVcpData] = useState<any>(null);
  const [vcpLoading, setVcpLoading] = useState(false);

  const runVCP = async () => {
    setVcpLoading(true);
    try {
      const res = await fetch(`/api/screener/vcp?symbols=${symbol}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.results?.length > 0) setVcpData(data.results[0]);
      }
    } catch { } finally {
      setVcpLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">VCP Analysis (Minervini)</h3>
        <button
          onClick={runVCP}
          disabled={vcpLoading}
          className="btn-primary text-xs disabled:opacity-50"
        >
          {vcpLoading ? 'Analyzing...' : 'Run VCP Scan'}
        </button>
      </div>
      {vcpData ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className={`text-sm font-bold px-3 py-1.5 rounded-lg ${vcpData.vcp?.isVcp ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {vcpData.vcp?.isVcp ? 'VCP Detected' : 'No VCP'}
            </span>
            <span className="text-sm text-slate-500">
              Score: <strong className="text-slate-900">{vcpData.compositeScore}/100</strong> ({vcpData.quality})
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-slate-400 font-medium">Trend Stage</div>
              <div className="font-bold text-slate-900 mt-1">Stage {vcpData.trendTemplate?.stage}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-slate-400 font-medium">Trend Score</div>
              <div className="font-bold text-slate-900 mt-1">{vcpData.trendTemplate?.score?.toFixed(0)}/100</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-slate-400 font-medium">Volume Dry-Up</div>
              <div className="font-bold text-slate-900 mt-1">{vcpData.volumePattern?.dryUpRatio?.toFixed(2)}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-slate-400 font-medium">Pivot</div>
              <div className="font-bold text-slate-900 mt-1">{vcpData.vcp?.pivot ? `₹${vcpData.vcp.pivot.toFixed(0)}` : 'N/A'}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-slate-400 font-medium">RS vs Nifty</div>
              <div className="font-bold text-slate-900 mt-1">{vcpData.relativeStrength?.rsValue?.toFixed(1)}</div>
            </div>
          </div>
        </div>
      ) : !vcpLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-sm shadow-sm">
          Click &quot;Run VCP Scan&quot; to analyze Minervini VCP pattern for this stock
        </div>
      ) : null}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const PLATFORM_META: Record<string, { icon: string; color: string; bg: string }> = {
  rss: { icon: '📰', color: 'text-orange-600', bg: 'bg-orange-50' },
  google_news: { icon: '🔍', color: 'text-blue-600', bg: 'bg-blue-50' },
  reddit: { icon: '💬', color: 'text-orange-500', bg: 'bg-orange-50' },
  youtube: { icon: '▶️', color: 'text-red-600', bg: 'bg-red-50' },
  telegram: { icon: '✈️', color: 'text-sky-600', bg: 'bg-sky-50' },
};

function NewsContent({ symbol }: { symbol: string }) {
  const [news, setNews] = useState<any[]>([]);
  const [sentiment, setSentiment] = useState<any>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [activeSource, setActiveSource] = useState<string>('all');

  useEffect(() => {
    fetchNewsData();
  }, [symbol]);

  const fetchNewsData = async () => {
    setNewsLoading(true);
    try {
      const res = await fetch(`/api/news-feed?symbol=${encodeURIComponent(symbol)}&limit=30`);
      if (res.ok) {
        const data = await res.json();
        setNews(data.items || []);
        setSentiment(data.sentiment);
        setSources(data.sources || []);
      }
    } catch { } finally {
      setNewsLoading(false);
    }
  };

  // Group news by platform
  const platformCounts: Record<string, number> = { all: news.length };
  for (const item of news) {
    const p = item.sourcePlatform || 'other';
    platformCounts[p] = (platformCounts[p] || 0) + 1;
  }

  const filteredNews = activeSource === 'all'
    ? news
    : news.filter(n => n.sourcePlatform === activeSource);

  // Source tabs config
  const SOURCE_TABS = [
    { id: 'all', label: 'All', icon: '📋' },
    { id: 'google_news', label: 'News', icon: '🔍' },
    { id: 'reddit', label: 'Reddit', icon: '💬' },
    // Future: { id: 'youtube', label: 'YouTube', icon: '▶️' },
    // Future: { id: 'telegram', label: 'Telegram', icon: '✈️' },
  ];

  if (newsLoading) {
    return (
      <div className="space-y-4 p-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex gap-4 p-4 animate-pulse">
            <div className="w-10 h-10 bg-slate-100 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-100 rounded w-3/4" />
              <div className="h-3 bg-slate-50 rounded w-1/2" />
            </div>
            <div className="h-5 w-14 bg-slate-100 rounded-full shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sentiment + Source Tabs */}
      <div className="flex items-center justify-between">
        {sentiment && (
          <div className="flex items-center gap-2">
            <span className={`text-[13px] font-bold px-3 py-1 rounded-lg ${
              sentiment.overall === 'Bullish' ? 'bg-emerald-50 text-emerald-700' :
              sentiment.overall === 'Bearish' ? 'bg-red-50 text-red-600' :
              'bg-slate-50 text-slate-600'
            }`}>
              {sentiment.overall}
            </span>
            <span className="text-[11px] text-slate-400">
              {sentiment.bullish}↑ {sentiment.bearish}↓ {sentiment.neutral}→
            </span>
          </div>
        )}
      </div>

      {/* Source Filter Tabs */}
      <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1">
        {SOURCE_TABS.filter(t => t.id === 'all' || platformCounts[t.id]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSource(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-lg transition-all ${
              activeSource === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {platformCounts[tab.id] != null && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeSource === tab.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'
              }`}>
                {platformCounts[tab.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* News List */}
      {filteredNews.length > 0 ? (
        <div className="divide-y divide-slate-100">
          {filteredNews.map((item, i) => {
            const platform = PLATFORM_META[item.sourcePlatform] || PLATFORM_META.rss;
            return (
              <a
                key={i}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 py-3.5 px-1 hover:bg-slate-50 rounded-xl transition-colors group"
              >
                <div className={`w-9 h-9 rounded-lg ${platform.bg} flex items-center justify-center text-base shrink-0 mt-0.5`}>
                  {platform.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[13px] font-semibold text-slate-900 leading-snug group-hover:text-indigo-700 transition-colors line-clamp-2">
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`text-[11px] font-semibold ${platform.color}`}>{item.source}</span>
                    {item.published && (
                      <>
                        <span className="text-slate-200">·</span>
                        <span className="text-[11px] text-slate-400">{timeAgo(item.published)}</span>
                      </>
                    )}
                    <span className="text-[11px] text-indigo-500 font-medium ml-auto opacity-0 group-hover:opacity-100 transition-opacity">Read →</span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 self-start mt-1 ${
                  item.sentiment === 'Bullish' ? 'bg-emerald-50 text-emerald-600' :
                  item.sentiment === 'Bearish' ? 'bg-red-50 text-red-500' :
                  'bg-slate-50 text-slate-400'
                }`}>
                  {item.sentiment === 'Bullish' ? '↑' : item.sentiment === 'Bearish' ? '↓' : '→'}
                </span>
              </a>
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center text-slate-400 text-sm">
          No {activeSource === 'all' ? '' : activeSource.replace('_', ' ') + ' '}articles found for {symbol}
        </div>
      )}
    </div>
  );
}

function SignalContent({ data }: { data: any }) {
  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 mb-2">Deep analysis not yet run for this stock.</p>
        <p className="text-slate-400 text-sm">Switch to this tab to trigger 10 AI agents analysis.</p>
      </div>
    );
  }

  const signal = data.signal;
  const analysis = data.analysis;

  return (
    <div className="space-y-8">
      {/* Signal Summary */}
      {signal && (
        <div className={`rounded-2xl border-2 p-8 ${
          signal.signal === 'BUY' ? 'border-emerald-300 bg-emerald-50' :
          signal.signal === 'SELL' ? 'border-red-300 bg-red-50' :
          'border-amber-300 bg-amber-50'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className={`text-4xl font-bold ${
                signal.signal === 'BUY' ? 'text-emerald-600' :
                signal.signal === 'SELL' ? 'text-red-600' :
                'text-amber-600'
              }`}>
                {signal.signal}
              </span>
              <span className="ml-4 text-sm text-slate-500">
                Confidence: {signal.confidence}% | Conviction: {signal.conviction}/10
              </span>
            </div>
            <span className="text-sm text-slate-400 font-medium">{signal.timeHorizon}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard label="Entry" value={`₹${signal.entryPrice?.toFixed(2)}`} />
            <MetricCard label="Stop Loss" value={`₹${signal.stopLoss?.toFixed(2)}`} color="text-red-600" />
            <MetricCard label="Target 1" value={`₹${signal.takeProfit1?.toFixed(2)}`} color="text-emerald-600" />
            {signal.takeProfit2 && <MetricCard label="Target 2" value={`₹${signal.takeProfit2?.toFixed(2)}`} color="text-emerald-600" />}
          </div>
        </div>
      )}

      {/* Risk Metrics */}
      {signal?.riskMetrics && (
        <div>
          <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">Risk Metrics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {signal.riskMetrics.riskRewardRatio != null && <MetricCard label="Risk/Reward" value={signal.riskMetrics.riskRewardRatio.toFixed(2)} />}
            {signal.riskMetrics.riskLevel && <MetricCard label="Risk Level" value={signal.riskMetrics.riskLevel} />}
            {signal.riskMetrics.maxDrawdown != null && <MetricCard label="Max Drawdown" value={`${signal.riskMetrics.maxDrawdown.toFixed(1)}%`} />}
            {signal.riskMetrics.sharpeRatio != null && <MetricCard label="Sharpe Ratio" value={signal.riskMetrics.sharpeRatio.toFixed(2)} />}
          </div>
        </div>
      )}

      {/* CIO Synthesis */}
      {analysis?.synthesis && (
        <div>
          <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">CIO Synthesis</h3>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">
              {analysis.synthesis.analysis}
            </pre>
          </div>
        </div>
      )}

      {/* Agent Breakdown */}
      {analysis && (
        <div>
          <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">Agent Analysis</h3>
          <div className="space-y-3">
            {[
              { panel: 'Technical Panel', agents: analysis.technical },
              { panel: 'Fundamental Panel', agents: analysis.fundamental },
              { panel: 'Trading Panel', agents: analysis.trading },
            ].map(({ panel, agents }) => agents && (
              <details key={panel} className="bg-white border border-slate-200 rounded-2xl shadow-sm">
                <summary className="px-5 py-4 cursor-pointer text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-2xl transition-colors">
                  {panel} ({agents.length} agents)
                </summary>
                <div className="px-5 pb-5 space-y-4">
                  {agents.map((a: any) => (
                    <div key={a.agentId} className="border-l-3 border-indigo-400 pl-4">
                      <p className="text-xs font-bold text-indigo-600">{a.agentName}</p>
                      <p className="text-sm text-slate-600 mt-1 leading-relaxed">{a.analysis}</p>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}

      {/* Backtest Evaluator */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5">
        <h4 className="text-sm font-bold text-indigo-700 mb-2">Backtest Evaluator</h4>
        <p className="text-xs text-indigo-600/70">
          5-dimension scoring with India-specific costs (STT, stamp duty, exchange fees, GST).
          Available for strategy validation when historical signals are generated.
        </p>
      </div>
    </div>
  );
}
