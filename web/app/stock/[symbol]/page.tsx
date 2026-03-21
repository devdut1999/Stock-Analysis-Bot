'use client';

import { useState, useEffect, use } from 'react';
import { STOCK_MAP } from '../../../lib/data/indian-stocks';
import { useWatchlist } from '../../../lib/hooks/useWatchlist';
import Link from 'next/link';

type TabId = 'overview' | 'technical' | 'fundamental' | 'fno' | 'news' | 'signal';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: 'O' },
  { id: 'technical', label: 'Technical', icon: 'T' },
  { id: 'fundamental', label: 'Fundamental', icon: 'F' },
  { id: 'fno', label: 'F&O', icon: 'D' },
  { id: 'news', label: 'News', icon: 'N' },
  { id: 'signal', label: 'Signal', icon: 'S' },
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumb + Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-[#5d6178] mb-3">
          <Link href="/" className="hover:text-[#3b82f6] transition-colors">Dashboard</Link>
          <span>/</span>
          <span className="text-white font-medium">{symbol.toUpperCase()}</span>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">{symbol.toUpperCase()}</h1>
            {stockInfo && (
              <p className="text-[#8b8fa3] mt-1">
                {stockInfo.name}
                {stockInfo.sector && (
                  <span className="ml-2 text-[10px] bg-[#222636] text-[#5d6178] px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {stockInfo.sector}
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Watchlist button */}
          <button
            onClick={() => watchlist.has(symbol) ? watchlist.remove(symbol) : watchlist.add(symbol)}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-all ${
              watchlist.has(symbol)
                ? 'bg-[#3b82f6]/15 border-[#3b82f6]/30 text-[#60a5fa]'
                : 'bg-[#1a1d29] border-[#2a2e3f] text-[#8b8fa3] hover:border-[#3b82f6]/30 hover:text-[#60a5fa]'
            }`}
          >
            {watchlist.has(symbol) ? '★ In Watchlist' : '+ Watchlist'}
          </button>

          {/* Price header */}
          {overviewData?.price && (
            <div className="text-right">
              <div className="text-3xl font-bold text-white">
                ₹{overviewData.price.currentPrice?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
              <div className="flex items-center justify-end gap-2 mt-1">
                <span className={`text-lg font-semibold px-2 py-0.5 rounded-md ${
                  (overviewData.price.change ?? 0) >= 0
                    ? 'text-[#22c55e] bg-[#22c55e]/10'
                    : 'text-[#ef4444] bg-[#ef4444]/10'
                }`}>
                  {(overviewData.price.change ?? 0) >= 0 ? '+' : ''}
                  {overviewData.price.changePercent?.toFixed(2)}%
                </span>
                <span className="text-sm text-[#5d6178]">
                  ({(overviewData.price.change ?? 0) >= 0 ? '+' : ''}₹{overviewData.price.change?.toFixed(2)})
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#2a2e3f] mb-6">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#3b82f6] text-[#3b82f6]'
                  : 'border-transparent text-[#5d6178] hover:text-[#8b8fa3] hover:border-[#5d6178]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {loading[activeTab] && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#3b82f6] mb-3"></div>
              <p className="text-[#5d6178] text-sm">
                {activeTab === 'signal' ? 'Running 10 AI agents... (30-60s)' : 'Loading data...'}
              </p>
            </div>
          </div>
        )}

        {errors[activeTab] && (
          <div className="bg-[#1a1d29] border border-[#2a2e3f] rounded-xl p-8 text-center">
            <div className="text-[#5d6178] text-3xl mb-3">⚠</div>
            <h3 className="text-white font-semibold mb-1">Unable to load {activeTab} data</h3>
            <p className="text-[#5d6178] text-sm mb-4 max-w-md mx-auto">
              {errors[activeTab]?.includes('API_KEY')
                ? 'AI analysis is not configured for this deployment. Market data features are still available.'
                : 'Something went wrong while fetching data. Please try again.'}
            </p>
            <button
              onClick={() => {
                setData(prev => { const n = { ...prev }; delete n[activeTab]; return n; });
                fetchTabData(activeTab);
              }}
              className="text-sm bg-[#3b82f6]/15 text-[#60a5fa] px-4 py-2 rounded-lg hover:bg-[#3b82f6]/25 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!loading[activeTab] && !errors[activeTab] && renderTab(activeTab, data, symbol)}
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
    <div className="bg-[#1a1d29] rounded-xl border border-[#2a2e3f] p-4">
      <p className="text-[10px] text-[#5d6178] mb-1.5 uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold ${color || 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-[#5d6178] mt-0.5">{sub}</p>}
    </div>
  );
}

function OverviewContent({ data }: { data: any }) {
  const p = data.price;
  const t = data.technicals;
  const f = data.fundamentals;
  const ind = data.indiaSpecific;

  return (
    <div className="space-y-6">
      {/* Price metrics */}
      {p && (
        <div>
          <h3 className="text-xs font-semibold text-[#8b8fa3] mb-3 uppercase tracking-wider">Price Data</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard label="Day Range" value={`₹${p.low?.toFixed(2)} - ₹${p.high?.toFixed(2)}`} />
            <MetricCard label="52W Range" value={`₹${p.fiftyTwoWeekLow?.toFixed(0)} - ₹${p.fiftyTwoWeekHigh?.toFixed(0)}`} />
            <MetricCard label="Volume" value={p.volume?.toLocaleString('en-IN') || 'N/A'} />
            <MetricCard label="Market Cap" value={p.marketCap ? `₹${(p.marketCap / 1e7).toFixed(0)} Cr` : 'N/A'} />
          </div>
        </div>
      )}

      {/* Key indicators */}
      {t && (
        <div>
          <h3 className="text-xs font-semibold text-[#8b8fa3] mb-3 uppercase tracking-wider">Key Indicators</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {t.rsi != null && (
              <MetricCard
                label="RSI (14)"
                value={t.rsi.toFixed(1)}
                sub={t.rsi > 70 ? 'Overbought' : t.rsi < 30 ? 'Oversold' : 'Neutral'}
                color={t.rsi > 70 ? 'text-[#ef4444]' : t.rsi < 30 ? 'text-[#22c55e]' : undefined}
              />
            )}
            {t.movingAverages?.sma20 != null && (
              <MetricCard label="SMA 20" value={`₹${t.movingAverages.sma20.toFixed(2)}`} />
            )}
            {t.movingAverages?.sma50 != null && (
              <MetricCard label="SMA 50" value={`₹${t.movingAverages.sma50.toFixed(2)}`} />
            )}
            {t.movingAverages?.sma200 != null && (
              <MetricCard label="SMA 200" value={`₹${t.movingAverages.sma200.toFixed(2)}`} />
            )}
          </div>
        </div>
      )}

      {/* Fundamentals snapshot */}
      {f && (f.peRatio || f.roe || f.roce) && (
        <div>
          <h3 className="text-xs font-semibold text-[#8b8fa3] mb-3 uppercase tracking-wider">Fundamentals</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {f.peRatio != null && <MetricCard label="P/E Ratio" value={f.peRatio.toFixed(2)} />}
            {f.pbRatio != null && <MetricCard label="P/B Ratio" value={f.pbRatio.toFixed(2)} />}
            {f.roe != null && <MetricCard label="ROE" value={`${f.roe.toFixed(1)}%`} />}
            {f.roce != null && <MetricCard label="ROCE" value={`${f.roce.toFixed(1)}%`} />}
          </div>
        </div>
      )}

      {/* India-specific */}
      {ind?.promoterHolding && ind.promoterHolding.promoterPercentage > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-[#8b8fa3] mb-3 uppercase tracking-wider">Shareholding</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard label="Promoter" value={`${ind.promoterHolding.promoterPercentage.toFixed(1)}%`} />
            <MetricCard
              label="Pledged"
              value={`${ind.promoterHolding.pledgedPercentage.toFixed(1)}%`}
              color={ind.promoterHolding.pledgedPercentage > 20 ? 'text-[#ef4444]' : undefined}
            />
            <MetricCard label="FII" value={`${ind.promoterHolding.fiiPercentage.toFixed(1)}%`} />
            <MetricCard label="DII" value={`${ind.promoterHolding.diiPercentage.toFixed(1)}%`} />
          </div>
        </div>
      )}
    </div>
  );
}

function TechnicalContent({ data, symbol }: { data: any; symbol: string }) {
  const t = data.technicals;
  if (!t) return <p className="text-[#5d6178]">No technical data available.</p>;

  return (
    <div className="space-y-6">
      {/* RSI & MACD */}
      <div>
        <h3 className="text-xs font-semibold text-[#8b8fa3] mb-3 uppercase tracking-wider">Momentum Indicators</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {t.rsi != null && (
            <MetricCard
              label="RSI (14)"
              value={t.rsi.toFixed(1)}
              sub={t.rsi > 70 ? 'Overbought' : t.rsi < 30 ? 'Oversold' : 'Neutral'}
              color={t.rsi > 70 ? 'text-[#ef4444]' : t.rsi < 30 ? 'text-[#22c55e]' : undefined}
            />
          )}
          {t.macd && (
            <>
              <MetricCard label="MACD" value={t.macd.macd?.toFixed(2) || 'N/A'} />
              <MetricCard label="MACD Signal" value={t.macd.signal?.toFixed(2) || 'N/A'} />
              <MetricCard
                label="MACD Histogram"
                value={t.macd.histogram?.toFixed(2) || 'N/A'}
                color={t.macd.histogram > 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}
              />
            </>
          )}
        </div>
      </div>

      {/* Moving Averages */}
      {t.movingAverages && (
        <div>
          <h3 className="text-xs font-semibold text-[#8b8fa3] mb-3 uppercase tracking-wider">Moving Averages</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
          <h3 className="text-xs font-semibold text-[#8b8fa3] mb-3 uppercase tracking-wider">Support & Resistance</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {t.supportResistance.support1 != null && <MetricCard label="Support 1" value={`₹${t.supportResistance.support1.toFixed(2)}`} color="text-[#22c55e]" />}
            {t.supportResistance.support2 != null && <MetricCard label="Support 2" value={`₹${t.supportResistance.support2.toFixed(2)}`} color="text-[#22c55e]" />}
            {t.supportResistance.resistance1 != null && <MetricCard label="Resistance 1" value={`₹${t.supportResistance.resistance1.toFixed(2)}`} color="text-[#ef4444]" />}
            {t.supportResistance.resistance2 != null && <MetricCard label="Resistance 2" value={`₹${t.supportResistance.resistance2.toFixed(2)}`} color="text-[#ef4444]" />}
          </div>
        </div>
      )}

      {/* Bollinger Bands */}
      {t.bollingerBands && (
        <div>
          <h3 className="text-xs font-semibold text-[#8b8fa3] mb-3 uppercase tracking-wider">Bollinger Bands</h3>
          <div className="grid grid-cols-3 gap-3">
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

  if (!f && !ind) return <p className="text-[#5d6178]">No fundamental data available.</p>;

  return (
    <div className="space-y-6">
      {f && (
        <div>
          <h3 className="text-xs font-semibold text-[#8b8fa3] mb-3 uppercase tracking-wider">Valuation</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {f.peRatio != null && <MetricCard label="P/E Ratio" value={f.peRatio.toFixed(2)} />}
            {f.pegRatio != null && <MetricCard label="PEG Ratio" value={f.pegRatio.toFixed(2)} />}
            {f.pbRatio != null && <MetricCard label="P/B Ratio" value={f.pbRatio.toFixed(2)} />}
            {f.dividendYield != null && <MetricCard label="Dividend Yield" value={`${f.dividendYield.toFixed(2)}%`} />}
          </div>
        </div>
      )}

      {f && (f.roe || f.roce) && (
        <div>
          <h3 className="text-xs font-semibold text-[#8b8fa3] mb-3 uppercase tracking-wider">Profitability</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {f.roe != null && <MetricCard label="ROE" value={`${f.roe.toFixed(1)}%`} />}
            {f.roce != null && <MetricCard label="ROCE" value={`${f.roce.toFixed(1)}%`} />}
            {f.debtToEquity != null && <MetricCard label="D/E Ratio" value={f.debtToEquity.toFixed(2)} />}
            {f.eps != null && <MetricCard label="EPS" value={`₹${f.eps.toFixed(2)}`} />}
          </div>
        </div>
      )}

      {ind?.promoterHolding && ind.promoterHolding.promoterPercentage > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-[#8b8fa3] mb-3 uppercase tracking-wider">Shareholding Pattern</h3>
          <div className="bg-[#1a1d29] border border-[#2a2e3f] rounded-xl p-5">
            <div className="space-y-3">
              {[
                { label: 'Promoter', pct: ind.promoterHolding.promoterPercentage, color: 'bg-[#3b82f6]' },
                { label: 'FII', pct: ind.promoterHolding.fiiPercentage, color: 'bg-[#22c55e]' },
                { label: 'DII', pct: ind.promoterHolding.diiPercentage, color: 'bg-yellow-500' },
                { label: 'Public', pct: ind.promoterHolding.publicPercentage, color: 'bg-[#5d6178]' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#8b8fa3]">{item.label}</span>
                    <span className="font-medium text-white">{item.pct?.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-[#222636] rounded-full h-2">
                    <div className={`${item.color} h-2 rounded-full transition-all`} style={{ width: `${Math.min(item.pct || 0, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            {ind.promoterHolding.pledgedPercentage > 0 && (
              <div className="mt-4 pt-3 border-t border-[#2a2e3f]">
                <div className="flex justify-between text-sm">
                  <span className="text-[#8b8fa3]">Pledged Shares</span>
                  <span className={`font-medium ${ind.promoterHolding.pledgedPercentage > 20 ? 'text-[#ef4444]' : 'text-white'}`}>
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
          <h3 className="text-xs font-semibold text-[#8b8fa3] mb-3 uppercase tracking-wider">FII/DII Activity</h3>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="FII Net"
              value={`₹${ind.fiiDii.fiiNetBuySell?.toFixed(0)} Cr`}
              color={ind.fiiDii.fiiNetBuySell >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}
              sub={ind.fiiDii.interpretation}
            />
            <MetricCard
              label="DII Net"
              value={`₹${ind.fiiDii.diiNetBuySell?.toFixed(0)} Cr`}
              color={ind.fiiDii.diiNetBuySell >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function FnOContent({ data }: { data: any }) {
  const fno = data.indiaSpecific?.fno;
  if (!fno) return <p className="text-[#5d6178]">No F&O data available for this stock.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-semibold text-[#8b8fa3] mb-3 uppercase tracking-wider">F&O Overview</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {fno.putCallRatio != null && (
            <MetricCard
              label="Put-Call Ratio"
              value={fno.putCallRatio.toFixed(3)}
              sub={fno.putCallRatio > 1 ? 'Bearish' : fno.putCallRatio < 0.7 ? 'Bullish' : 'Neutral'}
              color={fno.putCallRatio > 1 ? 'text-[#ef4444]' : fno.putCallRatio < 0.7 ? 'text-[#22c55e]' : undefined}
            />
          )}
          {fno.maxPain != null && <MetricCard label="Max Pain" value={`₹${fno.maxPain.toFixed(0)}`} />}
          {fno.openInterest != null && <MetricCard label="Open Interest" value={fno.openInterest.toLocaleString('en-IN')} />}
          {fno.impliedVolatility != null && <MetricCard label="IV" value={`${fno.impliedVolatility.toFixed(1)}%`} />}
        </div>
      </div>

      {fno.interpretation && (
        <div className="bg-[#3b82f6]/10 border border-[#3b82f6]/20 rounded-xl p-4">
          <p className="text-sm text-blue-300">{fno.interpretation}</p>
        </div>
      )}

      {/* Options Strategy Advisor - ready for real data */}
      <div className="bg-[#3b82f6]/10 border border-[#3b82f6]/20 rounded-xl p-4">
        <h4 className="text-sm font-medium text-blue-300 mb-1">Options Strategy Advisor</h4>
        <p className="text-xs text-blue-300/60">
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
    } catch { /* ignore */ } finally {
      setVcpLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-[#8b8fa3] uppercase tracking-wider">VCP Analysis (Minervini)</h3>
        <button
          onClick={runVCP}
          disabled={vcpLoading}
          className="text-xs bg-[#3b82f6]/15 text-[#60a5fa] px-3 py-1.5 rounded-lg hover:bg-[#3b82f6]/25 disabled:opacity-50 transition-colors"
        >
          {vcpLoading ? 'Analyzing...' : 'Run VCP Scan'}
        </button>
      </div>
      {vcpData ? (
        <div className="bg-[#1a1d29] border border-[#2a2e3f] rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${vcpData.vcp?.isVcp ? 'bg-[#22c55e]/15 text-[#22c55e]' : 'bg-[#222636] text-[#5d6178]'}`}>
              {vcpData.vcp?.isVcp ? 'VCP Detected' : 'No VCP'}
            </span>
            <span className="text-sm text-[#8b8fa3]">
              Score: <strong className="text-white">{vcpData.compositeScore}/100</strong> ({vcpData.quality})
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            <div className="bg-[#222636] rounded-lg p-2.5">
              <div className="text-[#5d6178]">Trend Stage</div>
              <div className="font-bold text-white mt-0.5">Stage {vcpData.trendTemplate?.stage}</div>
            </div>
            <div className="bg-[#222636] rounded-lg p-2.5">
              <div className="text-[#5d6178]">Trend Score</div>
              <div className="font-bold text-white mt-0.5">{vcpData.trendTemplate?.score?.toFixed(0)}/100</div>
            </div>
            <div className="bg-[#222636] rounded-lg p-2.5">
              <div className="text-[#5d6178]">Volume Dry-Up</div>
              <div className="font-bold text-white mt-0.5">{vcpData.volumePattern?.dryUpRatio?.toFixed(2)}</div>
            </div>
            <div className="bg-[#222636] rounded-lg p-2.5">
              <div className="text-[#5d6178]">Pivot</div>
              <div className="font-bold text-white mt-0.5">{vcpData.vcp?.pivot ? `₹${vcpData.vcp.pivot.toFixed(0)}` : 'N/A'}</div>
            </div>
            <div className="bg-[#222636] rounded-lg p-2.5">
              <div className="text-[#5d6178]">RS vs Nifty</div>
              <div className="font-bold text-white mt-0.5">{vcpData.relativeStrength?.rsValue?.toFixed(1)}</div>
            </div>
          </div>
        </div>
      ) : !vcpLoading ? (
        <div className="bg-[#1a1d29] border border-[#2a2e3f] rounded-xl p-4 text-center text-[#5d6178] text-xs">
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
      const res = await fetch(`/api/news?symbol=${encodeURIComponent(symbol)}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setNews(data.items || []);
        setSentiment(data.sentiment);
      }
    } catch { /* ignore */ } finally {
      setNewsLoading(false);
    }
  };

  if (newsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#3b82f6] mb-2"></div>
          <p className="text-[#5d6178] text-sm">Fetching news from 9 RSS sources...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sentiment Summary */}
      {sentiment && (
        <div className="flex items-center gap-4 bg-[#1a1d29] border border-[#2a2e3f] rounded-xl p-4">
          <span className="text-sm font-medium text-[#8b8fa3]">Sentiment:</span>
          <span className={`text-sm font-bold ${sentiment.overall === 'Bullish' ? 'text-[#22c55e]' : sentiment.overall === 'Bearish' ? 'text-[#ef4444]' : 'text-[#8b8fa3]'}`}>
            {sentiment.overall}
          </span>
          <span className="text-xs text-[#5d6178]">
            ({sentiment.bullish} bullish / {sentiment.bearish} bearish / {sentiment.neutral} neutral)
          </span>
        </div>
      )}

      {/* News Feed */}
      {news.length > 0 ? (
        <div className="space-y-2">
          {news.map((item, i) => (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-[#1a1d29] border border-[#2a2e3f] rounded-xl p-4 hover:border-[#3b82f6]/25 hover:bg-[#222636] transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-sm font-medium text-white line-clamp-2">{item.title}</h4>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-[#5d6178]">
                    <span>{item.source}</span>
                    <span className="text-[#2a2e3f]">|</span>
                    <span>{item.eventType}</span>
                    {item.sectors?.length > 0 && (
                      <>
                        <span className="text-[#2a2e3f]">|</span>
                        <span>{item.sectors.join(', ')}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    item.sentiment === 'Bullish' ? 'bg-[#22c55e]/15 text-[#22c55e]' :
                    item.sentiment === 'Bearish' ? 'bg-[#ef4444]/15 text-[#ef4444]' :
                    'bg-[#222636] text-[#5d6178]'
                  }`}>
                    {item.sentiment}
                  </span>
                  <span className="text-xs text-[#5d6178]">{item.impactScore}/10</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="bg-[#1a1d29] border border-[#2a2e3f] rounded-xl p-8 text-center text-[#5d6178] text-sm">
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
        <p className="text-[#8b8fa3] mb-2">Deep analysis not yet run for this stock.</p>
        <p className="text-[#5d6178] text-sm">Switch to this tab to trigger 10 AI agents analysis.</p>
      </div>
    );
  }

  const signal = data.signal;
  const analysis = data.analysis;

  return (
    <div className="space-y-6">
      {/* Signal Summary */}
      {signal && (
        <div className={`rounded-xl border-2 p-6 ${
          signal.signal === 'BUY' ? 'border-[#22c55e] bg-[#22c55e]/10' :
          signal.signal === 'SELL' ? 'border-[#ef4444] bg-[#ef4444]/10' :
          'border-yellow-500 bg-yellow-500/10'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className={`text-3xl font-bold ${
                signal.signal === 'BUY' ? 'text-[#22c55e]' :
                signal.signal === 'SELL' ? 'text-[#ef4444]' :
                'text-yellow-400'
              }`}>
                {signal.signal}
              </span>
              <span className="ml-3 text-sm text-[#8b8fa3]">
                Confidence: {signal.confidence}% | Conviction: {signal.conviction}/10
              </span>
            </div>
            <span className="text-sm text-[#5d6178]">{signal.timeHorizon}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard label="Entry" value={`₹${signal.entryPrice?.toFixed(2)}`} />
            <MetricCard label="Stop Loss" value={`₹${signal.stopLoss?.toFixed(2)}`} color="text-[#ef4444]" />
            <MetricCard label="Target 1" value={`₹${signal.takeProfit1?.toFixed(2)}`} color="text-[#22c55e]" />
            {signal.takeProfit2 && <MetricCard label="Target 2" value={`₹${signal.takeProfit2?.toFixed(2)}`} color="text-[#22c55e]" />}
          </div>
        </div>
      )}

      {/* Risk Metrics */}
      {signal?.riskMetrics && (
        <div>
          <h3 className="text-xs font-semibold text-[#8b8fa3] mb-3 uppercase tracking-wider">Risk Metrics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
          <h3 className="text-xs font-semibold text-[#8b8fa3] mb-3 uppercase tracking-wider">CIO Synthesis</h3>
          <div className="bg-[#1a1d29] border border-[#2a2e3f] rounded-xl p-5">
            <pre className="text-sm text-[#8b8fa3] whitespace-pre-wrap font-sans leading-relaxed">
              {analysis.synthesis.analysis}
            </pre>
          </div>
        </div>
      )}

      {/* Agent Breakdown */}
      {analysis && (
        <div>
          <h3 className="text-xs font-semibold text-[#8b8fa3] mb-3 uppercase tracking-wider">Agent Analysis</h3>
          <div className="space-y-3">
            {[
              { panel: 'Technical Panel', agents: analysis.technical },
              { panel: 'Fundamental Panel', agents: analysis.fundamental },
              { panel: 'Trading Panel', agents: analysis.trading },
            ].map(({ panel, agents }) => agents && (
              <details key={panel} className="bg-[#1a1d29] border border-[#2a2e3f] rounded-xl">
                <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-[#8b8fa3] hover:bg-[#222636] rounded-xl transition-colors">
                  {panel} ({agents.length} agents)
                </summary>
                <div className="px-4 pb-4 space-y-3">
                  {agents.map((a: any) => (
                    <div key={a.agentId} className="border-l-2 border-[#3b82f6]/40 pl-3">
                      <p className="text-xs font-medium text-[#60a5fa]">{a.agentName}</p>
                      <p className="text-sm text-[#8b8fa3] mt-1 leading-relaxed">{a.analysis}</p>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}

      {/* Backtest Evaluator - ready for real data */}
      <div className="bg-[#3b82f6]/10 border border-[#3b82f6]/20 rounded-xl p-4">
        <h4 className="text-sm font-medium text-blue-300 mb-1">Backtest Evaluator</h4>
        <p className="text-xs text-blue-300/60">
          5-dimension scoring with India-specific costs (STT, stamp duty, exchange fees, GST).
          Available for strategy validation when historical signals are generated.
        </p>
      </div>
    </div>
  );
}
