/**
 * Market detection and symbol normalization service
 * Auto-detects whether a stock belongs to US or Indian markets
 */
/**
 * Detect which market a stock symbol belongs to
 */
export function detectMarket(symbol) {
    const rawSymbol = symbol.trim().toUpperCase();
    // Check for Indian exchange suffixes
    if (rawSymbol.endsWith('.NS') || rawSymbol.endsWith('.NSE')) {
        return {
            market: 'INDIA',
            exchange: 'NSE',
            normalizedSymbol: rawSymbol.replace(/\.(NS|NSE)$/, ''),
            rawSymbol
        };
    }
    if (rawSymbol.endsWith('.BO') || rawSymbol.endsWith('.BSE')) {
        return {
            market: 'INDIA',
            exchange: 'BSE',
            normalizedSymbol: rawSymbol.replace(/\.(BO|BSE)$/, ''),
            rawSymbol
        };
    }
    // Check for explicit Indian exchange prefix patterns
    if (/^(NSE|BSE|MCX|NCDEX):/i.test(rawSymbol)) {
        const [exchange, ticker] = rawSymbol.split(':');
        return {
            market: 'INDIA',
            exchange: exchange.toUpperCase(),
            normalizedSymbol: ticker,
            rawSymbol
        };
    }
    // Check for common Indian stock patterns
    // Indian stocks are typically short (4-10 chars) without special suffixes
    // Examples: RELIANCE, TCS, INFY, HDFCBANK
    const isLikelyIndian = rawSymbol.length >= 3 &&
        rawSymbol.length <= 15 &&
        /^[A-Z0-9]+$/.test(rawSymbol) &&
        !rawSymbol.includes('-') &&
        !rawSymbol.includes('.');
    // List of known Indian tickers for disambiguation
    const knownIndianTickers = new Set([
        'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN',
        'BHARTIARTL', 'ITC', 'KOTAKBANK', 'LT', 'HINDUNILVR', 'BAJFINANCE',
        'ASIANPAINT', 'MARUTI', 'TITAN', 'ULTRACEMCO', 'WIPRO', 'NESTLEIND',
        'AXISBANK', 'SUNPHARMA', 'TATASTEEL', 'TATAMOTORS', 'POWERGRID',
        'ONGC', 'NTPC', 'COAL INDIA', 'INDUSINDBK', 'TECHM', 'HCLTECH',
        'M&M', 'BAJAJFINSV', 'ADANIENT', 'ADANIGREEN', 'JSWSTEEL'
    ]);
    if (knownIndianTickers.has(rawSymbol)) {
        return {
            market: 'INDIA',
            exchange: 'NSE', // Default to NSE for known Indian stocks
            normalizedSymbol: rawSymbol,
            rawSymbol
        };
    }
    // Default to US market for standard ticker formats
    // US tickers: 1-5 characters, optionally with class suffix (e.g., BRK.A, BRK.B)
    return {
        market: 'US',
        normalizedSymbol: rawSymbol,
        rawSymbol
    };
}
/**
 * Normalize symbol for specific API providers
 */
export function normalizeSymbolForAPI(detectedMarket, apiProvider) {
    const { market, normalizedSymbol, exchange } = detectedMarket;
    if (market === 'US') {
        // Most US APIs use the standard ticker format
        switch (apiProvider.toLowerCase()) {
            case 'polygon':
            case 'alphaVantage':
            case 'twelvedata':
            case 'fmp':
            default:
                return normalizedSymbol;
        }
    }
    if (market === 'INDIA') {
        switch (apiProvider.toLowerCase()) {
            case 'truedata':
                // TrueData format: RELIANCE-EQ (for equity)
                return `${normalizedSymbol}-EQ`;
            case 'breeze':
                // Breeze uses plain ticker: RELIANCE
                return normalizedSymbol;
            case 'twelvedata':
                // Twelve Data format: RELIANCE.NSE or RELIANCE.BSE
                return `${normalizedSymbol}.${exchange || 'NSE'}`;
            case 'yahoofinance':
                // Yahoo Finance format: RELIANCE.NS or RELIANCE.BO
                const suffix = exchange === 'BSE' ? 'BO' : 'NS';
                return `${normalizedSymbol}.${suffix}`;
            case 'indianapi':
                // Free Indian Stock API uses plain ticker
                return normalizedSymbol;
            case 'nseindia':
                // NSE India official website format
                return normalizedSymbol;
            default:
                return normalizedSymbol;
        }
    }
    return normalizedSymbol;
}
/**
 * Get display name for a symbol (user-friendly format)
 */
export function getDisplayName(detectedMarket) {
    const { market, normalizedSymbol, exchange } = detectedMarket;
    if (market === 'INDIA' && exchange) {
        return `${normalizedSymbol} (${exchange})`;
    }
    return normalizedSymbol;
}
/**
 * Validate if a symbol is likely valid
 */
export function validateSymbol(symbol) {
    const trimmed = symbol.trim();
    if (!trimmed) {
        return { valid: false, reason: 'Symbol cannot be empty' };
    }
    if (trimmed.length > 20) {
        return { valid: false, reason: 'Symbol too long' };
    }
    // Check for invalid characters
    if (!/^[A-Za-z0-9.\-:&]+$/.test(trimmed)) {
        return { valid: false, reason: 'Symbol contains invalid characters' };
    }
    return { valid: true };
}
/**
 * Get market-specific info for logging/debugging
 */
export function getMarketInfo(detectedMarket) {
    const { market, exchange, normalizedSymbol, rawSymbol } = detectedMarket;
    const parts = [
        `Symbol: ${rawSymbol}`,
        `Market: ${market}`,
        exchange && `Exchange: ${exchange}`,
        rawSymbol !== normalizedSymbol && `Normalized: ${normalizedSymbol}`
    ].filter(Boolean);
    return parts.join(' | ');
}
//# sourceMappingURL=market-detector.js.map