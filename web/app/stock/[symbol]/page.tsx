'use client';

import { useState, useEffect, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { STOCK_MAP } from '../../../lib/data/indian-stocks';
import { useWatchlist } from '../../../lib/hooks/useWatchlist';
import Link from 'next/link';
import StockChart from '../../components/StockChart';
import TradingPanel from '../../components/TradingPanel';
import AnimatedTabs, { TabContent } from '../../components/AnimatedTabs';

type TabId = 'overview' | 'technical' | 'fundamental' | 'fno' | 'news' | 'signal';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'technical', label: 'Technical' },
  { id: 'fundamental', label: 'Fundamental' },
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-slate-400 mb-4"
        >
          <Link href="/" className="hover:text-indigo-600 transition-colors">Home</Link>
          <span>›</span>
          <Link href="/" className="hover:text-indigo-600 transition-colors">Stocks</Link>
          <span>›</span>
          <span className="text-slate-700 font-medium">{symbol.toUpperCase()}</span>
        </motion.div>

        {/* Main Layout: Content + Trading Panel */}
        <div className="flex gap-6">
          {/* Left: Main Content */}
          <div className="flex-1 min-w-0">
            {/* Stock Header */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start justify-between mb-6"
            >
              <div className="flex items-center gap-4">
                {/* Stock Logo Placeholder */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {symbol.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-slate-900">{stockInfo?.name || symbol.toUpperCase()}</h1>
                    <button
                      onClick={() => watchlist.has(symbol) ? watchlist.remove(symbol) : watchlist.add(symbol)}
                      className={`p-1.5 rounded-lg transition-all ${
                        watchlist.has(symbol)
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-slate-100 text-slate-400 hover:bg-amber-50 hover:text-amber-500'
                      }`}
                    >
                      <svg className="w-5 h-5" fill={watchlist.has(symbol) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-medium text-slate-500">{symbol.toUpperCase()}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs text-slate-400">NSE</span>
                    {stockInfo?.sector && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-medium">
                          {stockInfo.sector}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Price Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6"
            >
              <StockChart
                symbol={symbol}
                currentPrice={priceData?.currentPrice}
                change={priceData?.change}
                changePercent={priceData?.changePercent}
                historicalData={historicalData}
              />
            </motion.div>

            {/* Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <AnimatedTabs
                tabs={TABS}
                activeTab={activeTab}
                onChange={(id) => handleTabChange(id as TabId)}
              />
            </motion.div>

            {/* Tab Content */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="min-h-[400px]"
            >
              {loading[activeTab] && (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="relative w-12 h-12 mx-auto mb-4">
                      <div className="absolute inset-0 rounded-full border-2 border-indigo-100"></div>
                      <div className="absolute inset-0 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">
                      {activeTab === 'signal' ? 'Running AI analysis...' : 'Loading...'}
                    </p>
                    {activeTab === 'signal' && (
                      <p className="text-slate-400 text-xs mt-1">10 agents analyzing (30-60s)</p>
                    )}
                  </div>
                </div>
              )}

              {errors[activeTab] && (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-slate-900 font-bold mb-2">Unable to load data</h3>
                  <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">{errors[activeTab]}</p>
                  <button
                    onClick={() => {
                      setData(prev => { const n = { ...prev }; delete n[activeTab]; return n; });
                      fetchTabData(activeTab);
                    }}
                    className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}

              <AnimatePresence mode="wait">
                {!loading[activeTab] && !errors[activeTab] && (
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderTab(activeTab, data, symbol)}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Right: Trading Panel (Desktop) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="hidden lg:block w-80 shrink-0"
          >
            <div className="sticky top-6">
              <TradingPanel
                symbol={symbol.toUpperCase()}
                currentPrice={priceData?.currentPrice || 0}
                change={priceData?.change || 0}
                changePercent={priceData?.changePercent || 0}
              />
            </div>
          </motion.div>
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
      {/* Key Stats Row */}
      {p && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Key Statistics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">Day Range</p>
              <p className="text-sm font-semibold text-slate-900">₹{p.low?.toFixed(2)} - ₹{p.high?.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">52W Range</p>
              <p className="text-sm font-semibold text-slate-900">₹{p.fiftyTwoWeekLow?.toFixed(0)} - ₹{p.fiftyTwoWeekHigh?.toFixed(0)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Volume</p>
              <p className="text-sm font-semibold text-slate-900">{p.volume?.toLocaleString('en-IN') || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Market Cap</p>
              <p className="text-sm font-semibold text-slate-900">{p.marketCap ? `₹${(p.marketCap / 1e7).toFixed(0)} Cr` : '—'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Technical Indicators */}
        {t && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Technical Indicators</h3>
            <div className="space-y-3">
              {t.rsi != null && (
                <div className="flex items-center justify-between py-2 border-b border-slate-50">
                  <span className="text-sm text-slate-500">RSI (14)</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${t.rsi > 70 ? 'text-red-600' : t.rsi < 30 ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {t.rsi.toFixed(1)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      t.rsi > 70 ? 'bg-red-50 text-red-600' : 
                      t.rsi < 30 ? 'bg-emerald-50 text-emerald-600' : 
                      'bg-slate-50 text-slate-500'
                    }`}>
                      {t.rsi > 70 ? 'Overbought' : t.rsi < 30 ? 'Oversold' : 'Neutral'}
                    </span>
                  </div>
                </div>
              )}
              {t.movingAverages?.sma20 != null && (
                <div className="flex items-center justify-between py-2 border-b border-slate-50">
                  <span className="text-sm text-slate-500">SMA 20</span>
                  <span className="text-sm font-semibold text-slate-900">₹{t.movingAverages.sma20.toFixed(2)}</span>
                </div>
              )}
              {t.movingAverages?.sma50 != null && (
                <div className="flex items-center justify-between py-2 border-b border-slate-50">
                  <span className="text-sm text-slate-500">SMA 50</span>
                  <span className="text-sm font-semibold text-slate-900">₹{t.movingAverages.sma50.toFixed(2)}</span>
                </div>
              )}
              {t.movingAverages?.sma200 != null && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-500">SMA 200</span>
                  <span className="text-sm font-semibold text-slate-900">₹{t.movingAverages.sma200.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fundamentals */}
        {f && (f.peRatio || f.roe || f.roce) && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Fundamentals</h3>
            <div className="space-y-3">
              {f.peRatio != null && (
                <div className="flex items-center justify-between py-2 border-b border-slate-50">
                  <span className="text-sm text-slate-500">P/E Ratio</span>
                  <span className="text-sm font-semibold text-slate-900">{f.peRatio.toFixed(2)}</span>
                </div>
              )}
              {f.pbRatio != null && (
                <div className="flex items-center justify-between py-2 border-b border-slate-50">
                  <span className="text-sm text-slate-500">P/B Ratio</span>
                  <span className="text-sm font-semibold text-slate-900">{f.pbRatio.toFixed(2)}</span>
                </div>
              )}
              {f.roe != null && (
                <div className="flex items-center justify-between py-2 border-b border-slate-50">
                  <span className="text-sm text-slate-500">ROE</span>
                  <span className="text-sm font-semibold text-slate-900">{f.roe.toFixed(1)}%</span>
                </div>
              )}
              {f.roce != null && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-500">ROCE</span>
                  <span className="text-sm font-semibold text-slate-900">{f.roce.toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Shareholding Pattern */}
      {ind?.promoterHolding && ind.promoterHolding.promoterPercentage > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Shareholding Pattern</h3>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Promoter', value: ind.promoterHolding.promoterPercentage, color: 'bg-indigo-500' },
              { label: 'FII', value: ind.promoterHolding.fiiPercentage, color: 'bg-emerald-500' },
              { label: 'DII', value: ind.promoterHolding.diiPercentage, color: 'bg-amber-500' },
              { label: 'Public', value: ind.promoterHolding.publicPercentage, color: 'bg-slate-400' },
            ].map(item => (
              <div key={item.label} className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-2">
                  <svg className="w-16 h-16 transform -rotate-90">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#f1f5f9" strokeWidth="6" />
                    <circle 
                      cx="32" cy="32" r="28" fill="none" 
                      className={item.color.replace('bg-', 'stroke-')}
                      strokeWidth="6"
                      strokeDasharray={`${(item.value || 0) * 1.76} 176`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">
                    {item.value?.toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">{item.label}</p>
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

function NewsContent({ symbol }: { symbol: string }) {
  const [news, setNews] = useState<any[]>([]);
  const [sentiment, setSentiment] = useState<any>(null);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    fetchNewsData();
  }, [symbol]);

  const fetchNewsData = async () => {
    setNewsLoading(true);
    try {
      const [rssRes, googleRes] = await Promise.all([
        fetch(`/api/news?symbol=${encodeURIComponent(symbol)}&limit=15`).then(r => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] })),
        fetch(`/api/integrations/google-news?symbol=${encodeURIComponent(symbol)}&limit=10`).then(r => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] })),
      ]);

      // Merge and deduplicate by title similarity
      const allItems = [...(rssRes.items || []), ...(googleRes.items || [])];
      const seen = new Set<string>();
      const unique = allItems.filter(item => {
        const key = item.title?.toLowerCase().slice(0, 50);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Sort by impact score then date
      unique.sort((a: any, b: any) => (b.impactScore || 0) - (a.impactScore || 0));
      setNews(unique.slice(0, 25));
      setSentiment(rssRes.sentiment);
    } catch { } finally {
      setNewsLoading(false);
    }
  };

  if (newsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3"></div>
          <p className="text-slate-400 text-sm">Fetching news from 9 RSS sources...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Sentiment Summary */}
      {sentiment && (
        <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <span className="text-sm font-semibold text-slate-500">Sentiment:</span>
          <span className={`text-sm font-bold ${sentiment.overall === 'Bullish' ? 'text-emerald-600' : sentiment.overall === 'Bearish' ? 'text-red-600' : 'text-slate-500'}`}>
            {sentiment.overall}
          </span>
          <span className="text-xs text-slate-400">
            ({sentiment.bullish} bullish / {sentiment.bearish} bearish / {sentiment.neutral} neutral)
          </span>
        </div>
      )}

      {/* News Feed */}
      {news.length > 0 ? (
        <div className="space-y-3">
          {news.map((item, i) => (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-200 hover:shadow-md transition-all shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-slate-900 line-clamp-2">{item.title}</h4>
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                    <span className="font-medium">{item.source}</span>
                    <span className="text-slate-200">|</span>
                    <span>{item.eventType}</span>
                    {item.sectors?.length > 0 && (
                      <>
                        <span className="text-slate-200">|</span>
                        <span>{item.sectors.join(', ')}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    item.sentiment === 'Bullish' ? 'bg-emerald-100 text-emerald-700' :
                    item.sentiment === 'Bearish' ? 'bg-red-100 text-red-600' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {item.sentiment}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">{item.impactScore}/10</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 text-sm shadow-sm">
          No news found for {symbol}. Try searching for a more popular stock.
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
