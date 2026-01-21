/**
 * Screener.in Data Scraper
 * Fetches comprehensive Indian stock data from screener.in
 * Includes: Promoter holding, FII/DII, fundamentals, financial metrics
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { rateLimiter } from '../../services/rate-limiter.js';
import { PromoterHolding, FundamentalData } from '../../types/stock-data.js';

const SCREENER_BASE_URL = 'https://www.screener.in';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Referer': 'https://www.screener.in/',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1'
};

/**
 * Get promoter holding and shareholding pattern from screener.in
 */
export async function getScreenerPromoterData(symbol: string): Promise<PromoterHolding> {
  await rateLimiter.waitForSlot('screener');

  try {
    const url = `${SCREENER_BASE_URL}/company/${symbol}/`;

    const response = await axios.get(url, {
      headers: HEADERS,
      timeout: 15000
    });

    const $ = cheerio.load(response.data);

    // Extract shareholding pattern from the page
    let promoterPercentage = 0;
    let fiiPercentage = 0;
    let diiPercentage = 0;
    let publicPercentage = 0;
    let pledgedPercentage = 0;

    // First, try to get promoter holding from meta description (quick and reliable)
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const promoterMatch = metaDescription.match(/Promoter Holding:\s*([\d.]+)%/i);
    if (promoterMatch) {
      promoterPercentage = parseFloat(promoterMatch[1]);
    }

    // Look for shareholding pattern section in list items
    $('li').each((_, element) => {
      const text = $(element).text().trim();

      if (text.includes('Promoters:') && promoterPercentage === 0) {
        const match = text.match(/Promoters:\s*([\d.]+)%/);
        if (match) promoterPercentage = parseFloat(match[1]);
      }

      if (text.includes('FIIs:') || text.includes('FII:')) {
        const match = text.match(/FII[s]?:\s*([\d.]+)%/);
        if (match) fiiPercentage = parseFloat(match[1]);
      }

      if (text.includes('DIIs:') || text.includes('DII:')) {
        const match = text.match(/DII[s]?:\s*([\d.]+)%/);
        if (match) diiPercentage = parseFloat(match[1]);
      }

      if (text.includes('Public:')) {
        const match = text.match(/Public:\s*([\d.]+)%/);
        if (match) publicPercentage = parseFloat(match[1]);
      }
    });

    // Calculate public percentage if not found (promoter + FII + DII + public = 100%)
    if (publicPercentage === 0 && promoterPercentage > 0) {
      publicPercentage = 100 - promoterPercentage - fiiPercentage - diiPercentage;
      if (publicPercentage < 0) publicPercentage = 0;
    }

    // Look for pledge percentage in various locations
    // Check for "Pledged shares" text
    const pageText = $('body').text();
    const pledgeMatch = pageText.match(/Pledged\s+shares?:?\s*([\d.]+)%/i);
    if (pledgeMatch) {
      pledgedPercentage = parseFloat(pledgeMatch[1]);
    }

    return {
      promoterPercentage,
      pledgedPercentage,
      publicPercentage,
      fiiPercentage,
      diiPercentage,
      lastUpdated: new Date()
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.warn(`[Screener] Failed to fetch data for ${symbol}: ${error.message}`);

      // Return empty data
      return {
        promoterPercentage: 0,
        pledgedPercentage: 0,
        publicPercentage: 0,
        fiiPercentage: 0,
        diiPercentage: 0,
        lastUpdated: new Date()
      };
    }
    throw error;
  }
}

/**
 * Get fundamental data from screener.in
 */
export async function getScreenerFundamentals(symbol: string): Promise<Partial<FundamentalData>> {
  await rateLimiter.waitForSlot('screener');

  try {
    const url = `${SCREENER_BASE_URL}/company/${symbol}/`;

    const response = await axios.get(url, {
      headers: HEADERS,
      timeout: 15000
    });

    const $ = cheerio.load(response.data);

    // Extract key metrics
    const fundamentals: Partial<FundamentalData> = {};

    // Look for specific metrics in the page
    $('li').each((_, element) => {
      const text = $(element).text().trim();

      // Market Cap (already in price data, but good for validation)
      if (text.includes('Market Cap')) {
        // Example: "Market Cap: ₹1,89,468 Cr"
        // We'll skip this as it's in price data
      }

      // P/E Ratio
      if (text.includes('Stock P/E:')) {
        const match = text.match(/Stock P\/E:\s*([\d.]+)/);
        if (match) fundamentals.peRatio = parseFloat(match[1]);
      }

      // Book Value -> Price to Book
      if (text.includes('Book Value:')) {
        const match = text.match(/Book Value:\s*₹\s*([\d,.]+)/);
        if (match) {
          const bookValue = parseFloat(match[1].replace(/,/g, ''));
          // We'd need current price to calculate P/B ratio
          // For now, we'll leave this out
        }
      }

      // Dividend Yield
      if (text.includes('Dividend Yield:')) {
        const match = text.match(/Dividend Yield:\s*([\d.]+)%/);
        if (match) fundamentals.dividendYield = parseFloat(match[1]);
      }

      // ROCE
      if (text.includes('ROCE:')) {
        const match = text.match(/ROCE:\s*([\d.]+)%/);
        if (match) fundamentals.roce = parseFloat(match[1]);
      }

      // ROE
      if (text.includes('ROE:')) {
        const match = text.match(/ROE:\s*([\d.]+)%/);
        if (match) fundamentals.roe = parseFloat(match[1]);
      }
    });

    // Look for profit margins in tables or other sections
    // This would require more specific selectors based on page structure

    return fundamentals;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.warn(`[Screener] Failed to fetch fundamentals for ${symbol}: ${error.message}`);
      return {};
    }
    throw error;
  }
}

/**
 * Get comprehensive company data from screener.in
 */
export async function getScreenerCompanyData(symbol: string): Promise<{
  promoterHolding: PromoterHolding;
  fundamentals: Partial<FundamentalData>;
}> {
  // Fetch both in sequence to avoid overwhelming the server
  const promoterHolding = await getScreenerPromoterData(symbol);

  // Wait a bit before next request
  await new Promise(resolve => setTimeout(resolve, 1000));

  const fundamentals = await getScreenerFundamentals(symbol);

  return {
    promoterHolding,
    fundamentals
  };
}
