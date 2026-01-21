/**
 * Technical indicators calculator
 * RSI, MACD, Bollinger Bands, Moving Averages, Support/Resistance
 */
/**
 * Calculate RSI (Relative Strength Index)
 * RSI > 70 = Overbought, RSI < 30 = Oversold
 */
export function calculateRSI(prices, period = 14) {
    if (prices.length < period + 1)
        return null;
    let gains = 0;
    let losses = 0;
    // Calculate initial average gain/loss
    for (let i = 1; i <= period; i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0)
            gains += change;
        else
            losses += Math.abs(change);
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    // Calculate subsequent values using smoothed averages
    for (let i = period + 1; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) {
            avgGain = (avgGain * (period - 1) + change) / period;
            avgLoss = (avgLoss * (period - 1)) / period;
        }
        else {
            avgGain = (avgGain * (period - 1)) / period;
            avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
        }
    }
    if (avgLoss === 0)
        return 100;
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    return rsi;
}
/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (prices.length < slowPeriod)
        return null;
    const fastEMA = calculateEMA(prices, fastPeriod);
    const slowEMA = calculateEMA(prices, slowPeriod);
    if (fastEMA === null || slowEMA === null)
        return null;
    const macdLine = fastEMA - slowEMA;
    // Calculate signal line (EMA of MACD line)
    // For simplicity, we'll use a simple moving average here
    const macdValues = [];
    for (let i = slowPeriod - 1; i < prices.length; i++) {
        const fast = calculateEMA(prices.slice(0, i + 1), fastPeriod);
        const slow = calculateEMA(prices.slice(0, i + 1), slowPeriod);
        if (fast !== null && slow !== null) {
            macdValues.push(fast - slow);
        }
    }
    const signalLine = macdValues.length >= signalPeriod
        ? macdValues.slice(-signalPeriod).reduce((a, b) => a + b) / signalPeriod
        : macdLine;
    const histogram = macdLine - signalLine;
    return {
        value: macdLine,
        signal: signalLine,
        histogram
    };
}
/**
 * Calculate Bollinger Bands
 */
export function calculateBollingerBands(prices, period = 20, stdDev = 2) {
    if (prices.length < period)
        return null;
    const recentPrices = prices.slice(-period);
    const sma = recentPrices.reduce((a, b) => a + b) / period;
    // Calculate standard deviation
    const squaredDiffs = recentPrices.map(price => Math.pow(price - sma, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b) / period;
    const standardDeviation = Math.sqrt(variance);
    return {
        upper: sma + (stdDev * standardDeviation),
        middle: sma,
        lower: sma - (stdDev * standardDeviation)
    };
}
/**
 * Calculate EMA (Exponential Moving Average)
 */
export function calculateEMA(prices, period) {
    if (prices.length < period)
        return null;
    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b) / period;
    for (let i = period; i < prices.length; i++) {
        ema = (prices[i] - ema) * multiplier + ema;
    }
    return ema;
}
/**
 * Calculate SMA (Simple Moving Average)
 */
export function calculateSMA(prices, period) {
    if (prices.length < period)
        return null;
    const recentPrices = prices.slice(-period);
    return recentPrices.reduce((a, b) => a + b) / period;
}
/**
 * Find support and resistance levels
 * Uses pivot points and local minima/maxima
 */
export function findSupportResistance(priceData, lookback = 20) {
    const support = [];
    const resistance = [];
    // Find local minima (support) and maxima (resistance)
    for (let i = lookback; i < priceData.length - lookback; i++) {
        const current = priceData[i];
        let isLocalMin = true;
        let isLocalMax = true;
        // Check if current point is local minimum or maximum
        for (let j = i - lookback; j <= i + lookback; j++) {
            if (j === i)
                continue;
            if (priceData[j].low < current.low) {
                isLocalMin = false;
            }
            if (priceData[j].high > current.high) {
                isLocalMax = false;
            }
        }
        if (isLocalMin) {
            support.push(current.low);
        }
        if (isLocalMax) {
            resistance.push(current.high);
        }
    }
    // Remove duplicates and sort
    const uniqueSupport = [...new Set(support)].sort((a, b) => b - a);
    const uniqueResistance = [...new Set(resistance)].sort((a, b) => a - b);
    // Return top 3 levels
    return {
        support: uniqueSupport.slice(0, 3),
        resistance: uniqueResistance.slice(0, 3)
    };
}
/**
 * Calculate Fibonacci retracement levels
 */
export function calculateFibonacci(high, low) {
    const diff = high - low;
    return {
        level236: high - (diff * 0.236),
        level382: high - (diff * 0.382),
        level500: high - (diff * 0.500),
        level618: high - (diff * 0.618)
    };
}
/**
 * Calculate all technical indicators for a stock
 */
export function calculateAllIndicators(priceData) {
    const closePrices = priceData.map(p => p.close);
    const rsi = calculateRSI(closePrices);
    const macd = calculateMACD(closePrices);
    const bollingerBands = calculateBollingerBands(closePrices);
    const movingAverages = {
        sma20: calculateSMA(closePrices, 20) || undefined,
        sma50: calculateSMA(closePrices, 50) || undefined,
        sma200: calculateSMA(closePrices, 200) || undefined,
        ema12: calculateEMA(closePrices, 12) || undefined,
        ema26: calculateEMA(closePrices, 26) || undefined
    };
    const { support, resistance } = findSupportResistance(priceData);
    // Calculate Fibonacci based on 52-week high/low
    const recentYear = priceData.slice(-252); // Approx 1 year of trading days
    const high52 = Math.max(...recentYear.map(p => p.high));
    const low52 = Math.min(...recentYear.map(p => p.low));
    const fibonacci = calculateFibonacci(high52, low52);
    return {
        rsi,
        macd,
        bollingerBands,
        movingAverages,
        supportLevels: support,
        resistanceLevels: resistance,
        fibonacci
    };
}
/**
 * Interpret technical indicators for trading signals
 */
export function interpretTechnicalIndicators(indicators, currentPrice) {
    const signals = [];
    let bullishSignals = 0;
    let bearishSignals = 0;
    let totalSignals = 0;
    // RSI analysis
    if (indicators.rsi !== null) {
        totalSignals++;
        if (indicators.rsi > 70) {
            signals.push(`RSI overbought at ${indicators.rsi.toFixed(1)} - potential pullback`);
            bearishSignals++;
        }
        else if (indicators.rsi < 30) {
            signals.push(`RSI oversold at ${indicators.rsi.toFixed(1)} - potential bounce`);
            bullishSignals++;
        }
        else {
            signals.push(`RSI neutral at ${indicators.rsi.toFixed(1)}`);
        }
    }
    // MACD analysis
    if (indicators.macd) {
        totalSignals++;
        if (indicators.macd.histogram > 0 && indicators.macd.value > indicators.macd.signal) {
            signals.push('MACD bullish crossover - uptrend momentum');
            bullishSignals++;
        }
        else if (indicators.macd.histogram < 0 && indicators.macd.value < indicators.macd.signal) {
            signals.push('MACD bearish crossover - downtrend momentum');
            bearishSignals++;
        }
        else {
            signals.push('MACD neutral - no clear crossover');
        }
    }
    // Bollinger Bands analysis
    if (indicators.bollingerBands) {
        totalSignals++;
        const bbPosition = ((currentPrice - indicators.bollingerBands.lower) /
            (indicators.bollingerBands.upper - indicators.bollingerBands.lower)) * 100;
        if (bbPosition > 80) {
            signals.push(`Price at upper Bollinger Band (${bbPosition.toFixed(0)}%) - potential resistance`);
            bearishSignals++;
        }
        else if (bbPosition < 20) {
            signals.push(`Price at lower Bollinger Band (${bbPosition.toFixed(0)}%) - potential support`);
            bullishSignals++;
        }
        else {
            signals.push(`Price mid-Bollinger Bands (${bbPosition.toFixed(0)}%)`);
        }
    }
    // Moving average analysis
    if (indicators.movingAverages.sma50 && indicators.movingAverages.sma200) {
        totalSignals++;
        if (indicators.movingAverages.sma50 > indicators.movingAverages.sma200) {
            signals.push('Golden Cross - bullish long-term trend');
            bullishSignals++;
        }
        else {
            signals.push('Death Cross - bearish long-term trend');
            bearishSignals++;
        }
    }
    // Determine overall trend
    const bullishPercentage = totalSignals > 0 ? (bullishSignals / totalSignals) * 100 : 50;
    let overallTrend = 'neutral';
    if (bullishPercentage > 60) {
        overallTrend = 'bullish';
    }
    else if (bullishPercentage < 40) {
        overallTrend = 'bearish';
    }
    return {
        signals,
        overallTrend,
        strength: Math.round(bullishPercentage)
    };
}
//# sourceMappingURL=indicators.js.map