'use client';

import { useState } from 'react';

export default function Home() {
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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
            <input
              type="text"
              id="symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="e.g., RELIANCE.NS, TCS.BO, INFY"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-2">
              Examples: RELIANCE.NS (NSE), TCS.BO (BSE), or INFY (auto-detected)
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
