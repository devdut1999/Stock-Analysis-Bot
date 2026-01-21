/**
 * Technical indicators calculator
 * RSI, MACD, Bollinger Bands, Moving Averages, Support/Resistance
 */
import { TechnicalIndicators } from '../../types/stock-data.js';
export interface PricePoint {
    date: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}
/**
 * Calculate RSI (Relative Strength Index)
 * RSI > 70 = Overbought, RSI < 30 = Oversold
 */
export declare function calculateRSI(prices: number[], period?: number): number | null;
/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
export declare function calculateMACD(prices: number[], fastPeriod?: number, slowPeriod?: number, signalPeriod?: number): {
    value: number;
    signal: number;
    histogram: number;
} | null;
/**
 * Calculate Bollinger Bands
 */
export declare function calculateBollingerBands(prices: number[], period?: number, stdDev?: number): {
    upper: number;
    middle: number;
    lower: number;
} | null;
/**
 * Calculate EMA (Exponential Moving Average)
 */
export declare function calculateEMA(prices: number[], period: number): number | null;
/**
 * Calculate SMA (Simple Moving Average)
 */
export declare function calculateSMA(prices: number[], period: number): number | null;
/**
 * Find support and resistance levels
 * Uses pivot points and local minima/maxima
 */
export declare function findSupportResistance(priceData: PricePoint[], lookback?: number): {
    support: number[];
    resistance: number[];
};
/**
 * Calculate Fibonacci retracement levels
 */
export declare function calculateFibonacci(high: number, low: number): {
    level236: number;
    level382: number;
    level500: number;
    level618: number;
};
/**
 * Calculate all technical indicators for a stock
 */
export declare function calculateAllIndicators(priceData: PricePoint[]): TechnicalIndicators;
/**
 * Interpret technical indicators for trading signals
 */
export declare function interpretTechnicalIndicators(indicators: TechnicalIndicators, currentPrice: number): {
    signals: string[];
    overallTrend: 'bullish' | 'bearish' | 'neutral';
    strength: number;
};
//# sourceMappingURL=indicators.d.ts.map