/**
 * Market types and configurations
 */

export type Market = 'US' | 'INDIA';

export type Exchange =
  // US Exchanges
  | 'NYSE'
  | 'NASDAQ'
  | 'AMEX'
  // Indian Exchanges
  | 'NSE'
  | 'BSE'
  | 'MCX'  // Commodity exchange
  | 'NCDEX';  // Commodity derivatives

export interface TradingHours {
  open: string;  // HH:MM format
  close: string; // HH:MM format
  timezone: string;
  preMarket?: {
    open: string;
    close: string;
  };
  postMarket?: {
    open: string;
    close: string;
  };
}

export interface CircuitBreakerLimits {
  level1: number;  // Percentage
  level2: number;
  level3: number;
}

export interface MarketConfig {
  region: Market;
  exchanges: Exchange[];
  tradingHours: TradingHours;
  circuitBreakers: CircuitBreakerLimits;
  settlementCycle: string;  // e.g., "T+1", "T+2"
  minLotSize: number;
  currency: string;
  apis: {
    marketData: string[];
    fundamentals: string[];
    news: string[];
  };
}

export interface MarketStatus {
  isOpen: boolean;
  nextOpen?: Date;
  nextClose?: Date;
  currentPhase: 'pre-market' | 'regular' | 'post-market' | 'closed';
}

export const MARKET_CONFIGS: Record<Market, MarketConfig> = {
  US: {
    region: 'US',
    exchanges: ['NYSE', 'NASDAQ', 'AMEX'],
    tradingHours: {
      open: '09:30',
      close: '16:00',
      timezone: 'America/New_York',
      preMarket: { open: '04:00', close: '09:30' },
      postMarket: { open: '16:00', close: '20:00' }
    },
    circuitBreakers: {
      level1: 7,
      level2: 13,
      level3: 20
    },
    settlementCycle: 'T+1',
    minLotSize: 1,
    currency: 'USD',
    apis: {
      marketData: ['polygon', 'twelvedata', 'alphaVantage'],
      fundamentals: ['fmp', 'alphaVantage'],
      news: ['alphaVantage', 'newsapi']
    }
  },

  INDIA: {
    region: 'INDIA',
    exchanges: ['NSE', 'BSE', 'MCX', 'NCDEX'],
    tradingHours: {
      open: '09:15',
      close: '15:30',
      timezone: 'Asia/Kolkata',
      preMarket: { open: '09:00', close: '09:15' },
      postMarket: { open: '15:40', close: '16:00' }
    },
    circuitBreakers: {
      level1: 10,
      level2: 15,
      level3: 20
    },
    settlementCycle: 'T+1',
    minLotSize: 1,  // Varies by stock
    currency: 'INR',
    apis: {
      marketData: ['truedata', 'breeze', 'twelvedata', 'indianapi'],
      fundamentals: ['eodhd', 'fmp', 'breeze'],
      news: ['newsapi', 'moneycontrol']
    }
  }
};
