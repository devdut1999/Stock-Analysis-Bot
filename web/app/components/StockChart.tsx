'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, LineSeries, AreaSeries, CandlestickSeries } from 'lightweight-charts';

type TimeRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' | 'ALL';
type ChartType = 'line' | 'candle';

interface StockChartProps {
  symbol: string;
  currentPrice?: number;
  change?: number;
  changePercent?: number;
  historicalData?: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

const TIME_RANGES: TimeRange[] = ['1D', '1W', '1M', '3M', '6M', '1Y', '3Y', '5Y', 'ALL'];

// How many days of data each range needs
const RANGE_DAYS: Record<TimeRange, number> = {
  '1D': 2, '1W': 7, '1M': 30, '3M': 90, '6M': 180,
  '1Y': 365, '3Y': 1095, '5Y': 1825, 'ALL': 3650,
};

export default function StockChart({ 
  symbol, 
  currentPrice, 
  change = 0, 
  changePercent = 0,
  historicalData = []
}: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | ISeriesApi<'Candlestick'> | null>(null);
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1M');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [isLoading, setIsLoading] = useState(false);
  const [extendedData, setExtendedData] = useState<typeof historicalData>([]);

  const isPositive = change >= 0;
  const lineColor = isPositive ? '#10b981' : '#ef4444';

  // Merge initial + extended data (memoized)
  const allData = useMemo(() => {
    const merged = [...historicalData, ...extendedData];
    const seen = new Set<string>();
    return merged.filter(d => {
      if (seen.has(d.date)) return false;
      seen.add(d.date);
      return true;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [historicalData, extendedData]);

  // Track the max days we've fetched so far
  const maxFetchedRef = useRef(30);

  const handleRangeChange = async (range: TimeRange) => {
    setSelectedRange(range);
    const neededDays = RANGE_DAYS[range];

    // Only fetch if we need more data than we have
    if (neededDays > maxFetchedRef.current * 1.2 && symbol) {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/analyze?symbol=${encodeURIComponent(symbol)}&type=quick&days=${neededDays}`);
        if (res.ok) {
          const data = await res.json();
          if (data.historical?.length) {
            setExtendedData(data.historical);
            maxFetchedRef.current = neededDays;
          }
        }
      } catch { }
      setIsLoading(false);
    }
    // If data already loaded, the useEffect will re-filter and fitContent
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#64748b',
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: '#f1f5f9' },
        horzLines: { color: '#f1f5f9' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 320,
      rightPriceScale: {
        borderColor: '#e2e8f0',
        scaleMargins: { top: 0.15, bottom: 0.15 },
        entireTextOnly: true,
      },
      timeScale: {
        borderColor: '#e2e8f0',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: {
          color: '#6366f1',
          width: 1,
          style: 2,
          labelBackgroundColor: '#6366f1',
        },
        horzLine: {
          color: '#6366f1',
          width: 1,
          style: 2,
          labelBackgroundColor: '#6366f1',
        },
      },
      handleScroll: { vertTouchDrag: false },
    });

    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current || allData.length === 0) return;

    if (seriesRef.current) {
      chartRef.current.removeSeries(seriesRef.current);
    }

    // Always set ALL data on the series
    const allLineData = allData.map(d => ({ time: d.date as string, value: d.close }));
    const allCandleData = allData.map(d => ({ time: d.date as string, open: d.open, high: d.high, low: d.low, close: d.close }));

    if (chartType === 'line') {
      const lineSeries = chartRef.current.addSeries(LineSeries, {
        color: lineColor,
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: lineColor,
        crosshairMarkerBackgroundColor: '#ffffff',
        priceLineVisible: false,
        lastValueVisible: true,
      });

      lineSeries.setData(allLineData);
      seriesRef.current = lineSeries;

      const areaSeries = chartRef.current.addSeries(AreaSeries, {
        topColor: isPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
        bottomColor: 'transparent',
        lineColor: 'transparent',
        priceLineVisible: false,
        lastValueVisible: false,
      });

      areaSeries.setData(allLineData);
    } else {
      const candleSeries = chartRef.current.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderUpColor: '#10b981',
        borderDownColor: '#ef4444',
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
        priceLineVisible: false,
        lastValueVisible: true,
      });

      candleSeries.setData(allCandleData);
      seriesRef.current = candleSeries;
    }

    // Zoom to the selected range instead of filtering data
    if (selectedRange === 'ALL') {
      chartRef.current.timeScale().fitContent();
    } else {
      const rangeData = filterDataByRange(allData, selectedRange);
      if (rangeData.length > 0) {
        // Find the index of the first visible data point in allData
        const firstVisibleDate = rangeData[0].date;
        const startIdx = allData.findIndex(d => d.date === firstVisibleDate);
        chartRef.current.timeScale().setVisibleLogicalRange({
          from: startIdx,
          to: allData.length - 1,
        });
      } else {
        chartRef.current.timeScale().fitContent();
      }
    }
  }, [allData, selectedRange, chartType, lineColor, isPositive]);

  const filterDataByRange = (data: typeof historicalData, range: TimeRange) => {
    const now = new Date();
    let startDate = new Date();

    switch (range) {
      case '1D':
        startDate.setDate(now.getDate() - 1);
        break;
      case '1W':
        startDate.setDate(now.getDate() - 7);
        break;
      case '1M':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3M':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6M':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1Y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case '3Y':
        startDate.setFullYear(now.getFullYear() - 3);
        break;
      case '5Y':
        startDate.setFullYear(now.getFullYear() - 5);
        break;
      case 'ALL':
      default:
        return data;
    }

    return data.filter(d => new Date(d.date) >= startDate);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          {/* Time Range Selector */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {TIME_RANGES.map((range) => (
              <button
                key={range}
                onClick={() => handleRangeChange(range)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  selectedRange === range
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Type Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChartType('line')}
            className={`p-2 rounded-lg transition-all ${
              chartType === 'line' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:text-slate-600'
            }`}
            title="Line Chart"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </button>
          <button
            onClick={() => setChartType('candle')}
            className={`p-2 rounded-lg transition-all ${
              chartType === 'candle' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:text-slate-600'
            }`}
            title="Candlestick Chart"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Chart Container */}
      <div 
        ref={chartContainerRef} 
        className={`w-full ${isLoading ? 'opacity-50' : ''}`}
        style={{ minHeight: '320px' }}
      />

      {/* Loading Skeleton */}
      {allData.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90">
          <div className="w-full px-8">
            {/* Animated chart skeleton */}
            <div className="flex items-end gap-1 h-32 mb-4">
              {[40, 55, 45, 60, 50, 70, 65, 75, 60, 80, 70, 85, 75, 90, 80, 95, 85, 78, 82, 88].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-indigo-100 to-indigo-50 rounded-t animate-pulse"
                  style={{ height: `${h}%`, animationDelay: `${i * 50}ms` }}
                />
              ))}
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400 font-medium">Loading chart</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
