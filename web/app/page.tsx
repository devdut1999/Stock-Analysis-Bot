'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { INDIAN_STOCKS, StockInfo } from '../lib/data/indian-stocks';

// Fuzzy search function - matches symbols and company names
function fuzzySearch(query: string, stocks: StockInfo[], limit = 10): StockInfo[] {
  if (!query.trim()) return [];
  
  const searchTerm = query.toUpperCase().trim();
  const results: { stock: StockInfo; score: number }[] = [];
  
  for (const stock of stocks) {
    let score = 0;
    const symbolUpper = stock.symbol.toUpperCase();
    const nameUpper = stock.name.toUpperCase();
    
    // Exact symbol match - highest priority
    if (symbolUpper === searchTerm) {
      score = 1000;
    }
    // Symbol starts with query
    else if (symbolUpper.startsWith(searchTerm)) {
      score = 500 + (100 - symbolUpper.length); // Shorter symbols rank higher
    }
    // Symbol contains query
    else if (symbolUpper.includes(searchTerm)) {
      score = 200;
    }
    // Name starts with query
    else if (nameUpper.startsWith(searchTerm)) {
      score = 150;
    }
    // Name contains query (word boundary)
    else if (nameUpper.includes(' ' + searchTerm) || nameUpper.includes(searchTerm)) {
      score = 100;
    }
    // Fuzzy match - characters in order
    else {
      let queryIdx = 0;
      let matches = 0;
      for (let i = 0; i < symbolUpper.length && queryIdx < searchTerm.length; i++) {
        if (symbolUpper[i] === searchTerm[queryIdx]) {
          matches++;
          queryIdx++;
        }
      }
      if (queryIdx === searchTerm.length) {
        score = 50 + matches * 5;
      }
    }
    
    if (score > 0) {
      results.push({ stock, score });
    }
  }
  
  // Sort by score descending and return top results
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(r => r.stock);
}

export default function Home() {
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Autocomplete state
  const [suggestions, setSuggestions] = useState<StockInfo[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Update suggestions when symbol changes
  useEffect(() => {
    if (symbol.length >= 1) {
      const matches = fuzzySearch(symbol, INDIAN_STOCKS, 8);
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
      setSelectedIndex(-1);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [symbol]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          e.preventDefault();
          selectStock(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  }, [showSuggestions, suggestions, selectedIndex]);

  const selectStock = (stock: StockInfo) => {
    setSymbol(stock.symbol);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleAnalyze = async (analysisType: 'quick' | 'deep') => {
    if (!symbol.trim()) {
      setError('Please enter a stock symbol');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/analyze?symbol=${encodeURIComponent(symbol)}&type=${analysisType}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <main className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Stock Analysis Bot
          </h1>
          <p className="text-xl text-gray-600">
            AI-Powered Market Intelligence with 10 Specialized Agents
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Currently supporting Indian stocks (NSE/BSE) • US market coming soon
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="mb-6">
            <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 mb-2">
              Stock Symbol
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                id="symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                onFocus={() => symbol.length >= 1 && suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Type to search stocks... (e.g., RELIANCE, TCS, INFY)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                disabled={loading}
                autoComplete="off"
              />
              
              {/* Search icon */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              {/* Autocomplete dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div 
                  ref={suggestionsRef}
                  className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-y-auto"
                >
                  {suggestions.map((stock, index) => (
                    <button
                      key={stock.symbol}
                      type="button"
                      onClick={() => selectStock(stock)}
                      className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-blue-50 transition-colors ${
                        index === selectedIndex ? 'bg-blue-100' : ''
                      } ${index !== suggestions.length - 1 ? 'border-b border-gray-100' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-blue-600 min-w-[80px]">{stock.symbol}</span>
                        <span className="text-gray-700 truncate">{stock.name}</span>
                      </div>
                      {stock.sector && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full ml-2 whitespace-nowrap">
                          {stock.sector}
                        </span>
                      )}
                    </button>
                  ))}
                  <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-t">
                    💡 Use ↑↓ to navigate, Enter to select, Esc to close
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Search {INDIAN_STOCKS.length}+ Indian stocks • Start typing to see suggestions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleAnalyze('quick')}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Analyzing...' : '⚡ Quick Analysis'}
            </button>
            <button
              onClick={() => handleAnalyze('deep')}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Analyzing...' : '🤖 Deep Analysis (10 AI Agents)'}
            </button>
          </div>

          {loading && (
            <div className="mt-6 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 mt-2">
                {symbol} analysis in progress... This may take 30-60 seconds.
              </p>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <h3 className="text-red-800 font-semibold mb-2">Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6">
              Analysis Results: {result.symbol}
            </h2>

            {/* Price Summary */}
            {result.price && (
              <div className="mb-8 p-6 bg-blue-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Price Data</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Current Price</p>
                    <p className="text-2xl font-bold">
                      ₹{result.price.currentPrice.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Change</p>
                    <p className={`text-2xl font-bold ${result.price.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {result.price.change >= 0 ? '+' : ''}
                      {result.price.changePercent.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Day Range</p>
                    <p className="text-lg">
                      ₹{result.price.low.toFixed(2)} - ₹{result.price.high.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Volume</p>
                    <p className="text-lg">{result.price.volume.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Technical Indicators */}
            {result.technicals && result.technicals.rsi !== null && (
              <div className="mb-8 p-6 bg-green-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Technical Indicators</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">RSI</p>
                    <p className="text-lg font-semibold">
                      {result.technicals.rsi.toFixed(1)}
                      <span className="text-sm ml-2">
                        {result.technicals.rsi > 70 ? '(Overbought)' : result.technicals.rsi < 30 ? '(Oversold)' : '(Neutral)'}
                      </span>
                    </p>
                  </div>
                  {result.technicals.movingAverages && (
                    <>
                      <div>
                        <p className="text-sm text-gray-600">SMA-20</p>
                        <p className="text-lg font-semibold">
                          ₹{result.technicals.movingAverages.sma20?.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">SMA-50</p>
                        <p className="text-lg font-semibold">
                          ₹{result.technicals.movingAverages.sma50?.toFixed(2)}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* India-Specific Data */}
            {result.indiaSpecific && result.indiaSpecific.promoterHolding && result.indiaSpecific.promoterHolding.promoterPercentage > 0 && (
              <div className="mb-8 p-6 bg-yellow-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">India-Specific Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Promoter Holding</p>
                    <p className="text-lg font-semibold">
                      {result.indiaSpecific.promoterHolding.promoterPercentage.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Pledged Shares</p>
                    <p className="text-lg font-semibold">
                      {result.indiaSpecific.promoterHolding.pledgedPercentage.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">FII Holding</p>
                    <p className="text-lg font-semibold">
                      {result.indiaSpecific.promoterHolding.fiiPercentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Multi-Agent Analysis */}
            {result.analysis && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">🤖 Multi-Agent Analysis</h3>
                <div className="prose max-w-none">
                  <pre className="bg-gray-50 p-6 rounded-lg overflow-auto text-sm">
                    {JSON.stringify(result.analysis, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Raw Data Toggle */}
            <details className="mt-6">
              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                Show raw data (JSON)
              </summary>
              <pre className="mt-4 bg-gray-50 p-6 rounded-lg overflow-auto text-xs">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Features Section */}
        {!result && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="font-semibold mb-2">Technical Analysis</h3>
              <p className="text-sm text-gray-600">
                RSI, MACD, Bollinger Bands, Moving Averages, Support/Resistance
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-3xl mb-3">💼</div>
              <h3 className="font-semibold mb-2">Fundamental Analysis</h3>
              <p className="text-sm text-gray-600">
                Value investing insights from Buffett, Munger, Ackman, and Dalio personas
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-3xl mb-3">🇮🇳</div>
              <h3 className="font-semibold mb-2">India-Specific</h3>
              <p className="text-sm text-gray-600">
                Promoter holding, FII/DII activity, F&O data, Circuit breakers
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 text-center text-sm text-gray-500">
        <p>Built with Claude Agent SDK • Phase 1-3 Complete</p>
        <p className="mt-2">
          ⚠️ For educational purposes only. Not financial advice.
        </p>
      </footer>
    </div>
  );
}
