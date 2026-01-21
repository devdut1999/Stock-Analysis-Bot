/**
 * Risk Manager
 * Calculates position sizing and manages portfolio risk
 */
export const DEFAULT_PORTFOLIO_CONFIG = {
    totalCapital: 1000000, // ₹10 Lakhs or $10K (user should override)
    maxPositionSize: 20,
    maxRiskPerTrade: 2,
    maxPortfolioRisk: 6,
    riskFreeRate: 4
};
/**
 * Calculate position size using Kelly Criterion (modified for safety)
 */
function calculateKellyPositionSize(winRate, // 0-1 (e.g., 0.6 for 60%)
avgWin, // Average win %
avgLoss, // Average loss %
maxSize // Maximum allowed size
) {
    // Kelly formula: f = (p * b - q) / b
    // where p = win probability, q = loss probability, b = win/loss ratio
    const b = avgWin / Math.abs(avgLoss);
    const kellyPercent = (winRate * b - (1 - winRate)) / b;
    // Use fractional Kelly (25% of full Kelly) for safety
    const fractionalKelly = kellyPercent * 0.25;
    // Cap at maximum allowed size
    return Math.min(Math.max(fractionalKelly * 100, 0), maxSize);
}
/**
 * Calculate position size based on risk (volatility-adjusted)
 */
function calculateRiskBasedPositionSize(riskPerTrade, // % of portfolio to risk
stopLossPercent, // % from entry to stop loss
volatility, // Stock volatility
maxSize // Maximum allowed size
) {
    // Position size = (Risk per trade %) / (Stop loss %)
    const baseSize = riskPerTrade / stopLossPercent;
    // Adjust for volatility (higher volatility = smaller position)
    const volatilityAdjustment = 1 / (1 + volatility / 20); // Normalize around 20% volatility
    const adjustedSize = baseSize * volatilityAdjustment;
    return Math.min(Math.max(adjustedSize, 0.5), maxSize); // Min 0.5%, max as configured
}
/**
 * Calculate position size based on conviction level
 */
function calculateConvictionBasedSize(conviction, // 1-10
baseSize, // Base position size
maxSize // Maximum allowed size
) {
    // Scale linearly: conviction 5 = base size, 10 = max size, 1 = min size
    const minSize = baseSize * 0.25;
    const scaledSize = minSize + ((conviction - 1) / 9) * (maxSize - minSize);
    return Math.min(Math.max(scaledSize, minSize), maxSize);
}
/**
 * Calculate comprehensive position sizing
 */
export function calculatePositionSize(conviction, // 1-10 from CIO
entryPrice, stopLoss, marketData, config = DEFAULT_PORTFOLIO_CONFIG) {
    // Calculate stop loss percentage
    const stopLossPercent = Math.abs(((stopLoss - entryPrice) / entryPrice) * 100);
    // Estimate volatility from technical data
    const volatility = estimateVolatility(marketData);
    // Method 1: Risk-based sizing
    const riskBasedSize = calculateRiskBasedPositionSize(config.maxRiskPerTrade, stopLossPercent, volatility, config.maxPositionSize);
    // Method 2: Conviction-based sizing
    const convictionSize = calculateConvictionBasedSize(conviction, riskBasedSize, config.maxPositionSize);
    // Method 3: Kelly Criterion (if we have historical data)
    // For now, use estimated win rate based on technical indicators
    const estimatedWinRate = estimateWinRate(marketData);
    const kellySize = calculateKellyPositionSize(estimatedWinRate, stopLossPercent * 2, // Assume 2:1 reward/risk
    stopLossPercent, config.maxPositionSize);
    // Final size: Average of methods, weighted by conviction
    const weightedSize = conviction >= 7
        ? (convictionSize * 0.6 + kellySize * 0.4) // High conviction: favor conviction-based
        : (riskBasedSize * 0.7 + kellySize * 0.3); // Lower conviction: favor risk-based
    const recommendedSize = Math.min(weightedSize, config.maxPositionSize);
    // Determine scaling strategy
    let scalingStrategy;
    if (recommendedSize > 10) {
        scalingStrategy = 'scale-in-3'; // Large positions: scale in 3 tranches
    }
    else if (recommendedSize > 5) {
        scalingStrategy = 'scale-in-2'; // Medium positions: scale in 2 tranches
    }
    else {
        scalingStrategy = 'all-at-once'; // Small positions: enter all at once
    }
    // Calculate capital required
    const capitalRequired = (config.totalCapital * recommendedSize) / 100;
    const numberOfShares = Math.floor(capitalRequired / entryPrice);
    return {
        recommendedSize: Math.round(recommendedSize * 100) / 100,
        minSize: Math.max(recommendedSize * 0.5, 0.5),
        maxSize: Math.min(recommendedSize * 1.5, config.maxPositionSize),
        scalingStrategy,
        capitalRequired,
        numberOfShares
    };
}
/**
 * Calculate risk metrics for a position
 */
export function calculateRiskMetrics(entryPrice, stopLoss, takeProfit, marketData, config = DEFAULT_PORTFOLIO_CONFIG) {
    // Calculate basic metrics
    const stopLossPercent = Math.abs(((stopLoss - entryPrice) / entryPrice) * 100);
    const takeProfitPercent = Math.abs(((takeProfit - entryPrice) / entryPrice) * 100);
    const riskRewardRatio = takeProfitPercent / stopLossPercent;
    // Estimate volatility
    const volatility = estimateVolatility(marketData);
    // Estimate beta (correlation with market)
    const beta = marketData.market === 'INDIA' ? 1.0 : 1.0; // Simplified
    // Calculate Value at Risk (95% confidence)
    // VaR = position size * price * volatility * z-score (1.65 for 95%)
    const valueAtRisk = stopLossPercent * 1.65;
    // Estimate Sharpe ratio (if we have historical returns)
    let sharpeRatio;
    if (marketData.fundamentals.revenueGrowth) {
        const estimatedReturn = marketData.fundamentals.revenueGrowth;
        sharpeRatio = (estimatedReturn - config.riskFreeRate) / volatility;
    }
    // Determine risk level
    let riskLevel;
    if (stopLossPercent > 10 || volatility > 40) {
        riskLevel = 'extreme';
    }
    else if (stopLossPercent > 6 || volatility > 30) {
        riskLevel = 'high';
    }
    else if (stopLossPercent > 3 || volatility > 20) {
        riskLevel = 'moderate';
    }
    else {
        riskLevel = 'low';
    }
    return {
        maxDrawdown: -stopLossPercent,
        volatility,
        beta,
        valueAtRisk,
        sharpeRatio,
        riskRewardRatio: Math.round(riskRewardRatio * 100) / 100,
        riskLevel
    };
}
/**
 * Estimate volatility from historical data
 */
function estimateVolatility(marketData) {
    // Method 1: Use 52-week range
    if (marketData.price.fiftyTwoWeekHigh && marketData.price.fiftyTwoWeekLow) {
        const range = marketData.price.fiftyTwoWeekHigh - marketData.price.fiftyTwoWeekLow;
        const avgPrice = (marketData.price.fiftyTwoWeekHigh + marketData.price.fiftyTwoWeekLow) / 2;
        return (range / avgPrice) * 100;
    }
    // Method 2: Use current day range
    const dayRange = marketData.price.high - marketData.price.low;
    const dayVolatility = (dayRange / marketData.price.currentPrice) * 100;
    // Annualize (approximate)
    return dayVolatility * Math.sqrt(252); // 252 trading days
}
/**
 * Estimate win rate from technical indicators
 */
function estimateWinRate(marketData) {
    let score = 0.5; // Base 50% win rate
    if (marketData.technicals.rsi !== null) {
        // Oversold = bullish = higher win rate
        if (marketData.technicals.rsi < 30)
            score += 0.1;
        if (marketData.technicals.rsi > 70)
            score -= 0.1;
    }
    if (marketData.technicals.macd) {
        // Positive histogram = bullish
        if (marketData.technicals.macd.histogram > 0)
            score += 0.05;
        else
            score -= 0.05;
    }
    // Clamp between 0.4 and 0.7
    return Math.max(0.4, Math.min(0.7, score));
}
/**
 * Format risk metrics as human-readable string
 */
export function formatRiskMetrics(metrics) {
    const lines = [];
    lines.push('=== RISK METRICS ===');
    lines.push('');
    lines.push(`Risk Level: ${metrics.riskLevel.toUpperCase()}`);
    lines.push(`Max Drawdown: ${metrics.maxDrawdown.toFixed(2)}%`);
    lines.push(`Volatility: ${metrics.volatility.toFixed(2)}%`);
    lines.push(`Beta: ${metrics.beta.toFixed(2)}`);
    lines.push(`Value at Risk (95%): ${metrics.valueAtRisk.toFixed(2)}%`);
    lines.push(`Risk/Reward Ratio: 1:${metrics.riskRewardRatio.toFixed(2)}`);
    if (metrics.sharpeRatio !== undefined) {
        lines.push(`Sharpe Ratio: ${metrics.sharpeRatio.toFixed(2)}`);
    }
    return lines.join('\n');
}
/**
 * Format position sizing as human-readable string
 */
export function formatPositionSizing(sizing, currency = '₹') {
    const lines = [];
    lines.push('=== POSITION SIZING ===');
    lines.push('');
    lines.push(`Recommended Size: ${sizing.recommendedSize.toFixed(2)}% of portfolio`);
    lines.push(`Range: ${sizing.minSize.toFixed(2)}% - ${sizing.maxSize.toFixed(2)}%`);
    lines.push(`Capital Required: ${currency}${sizing.capitalRequired.toLocaleString()}`);
    if (sizing.numberOfShares) {
        lines.push(`Number of Shares: ${sizing.numberOfShares.toLocaleString()}`);
    }
    lines.push(`Scaling Strategy: ${sizing.scalingStrategy.replace(/-/g, ' ').toUpperCase()}`);
    return lines.join('\n');
}
//# sourceMappingURL=risk-manager.js.map