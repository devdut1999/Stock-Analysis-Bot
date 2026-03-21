/**
 * Black-Scholes Option Pricing Engine for Indian F&O Markets (NSE)
 * Ported from indian-trading-skills: options-strategy-advisor/black_scholes.py
 *
 * Features:
 * - European options pricing (all NSE options are European-style)
 * - Full Greeks: Delta, Gamma, Theta, Vega, Rho
 * - Implied volatility (Newton-Raphson + bisection fallback)
 * - Multi-leg strategy analysis with 17 strategy constructors
 */

export const INDIA_RISK_FREE_RATE = 0.07; // ~7% (91-day T-bill rate)
export const TRADING_DAYS_PER_YEAR = 252;

export const DEFAULT_LOT_SIZES: Record<string, number> = {
  NIFTY: 75,
  BANKNIFTY: 15,
  FINNIFTY: 25,
  MIDCPNIFTY: 50,
};

export type OptionType = 'CALL' | 'PUT';
export type PositionType = 'LONG' | 'SHORT';

export interface Greeks {
  delta: number;
  gamma: number;
  theta: number; // Per calendar day
  vega: number;  // Per 1% vol change
  rho: number;   // Per 1% rate change
}

export interface OptionResult {
  price: number;
  greeks: Greeks;
  d1: number;
  d2: number;
}

export interface OptionLeg {
  optionType: OptionType;
  positionType: PositionType;
  strike: number;
  premium: number;
  quantity: number;
  lotSize: number;
}

export interface PLPoint {
  spot: number;
  pl: number;
}

export interface StrategyAnalysis {
  strategyName: string;
  legs: OptionLeg[];
  underlyingPrice: number;
  netPremium: number;
  maxProfit: number;
  maxLoss: number;
  breakevenPoints: number[];
  riskRewardRatio: number;
  plCurve: PLPoint[];
  netGreeks?: Greeks;
}

// ─── Math Helpers ────────────────────────────

function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function normCdf(x: number): number {
  if (x >= 0) return normCdfPositive(x);
  return 1 - normCdfPositive(-x);
}

function normCdfPositive(x: number): number {
  // Abramowitz & Stegun approximation 26.2.17
  const b0 = 0.2316419;
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;

  const t = 1 / (1 + b0 * x);
  const t2 = t * t, t3 = t2 * t, t4 = t3 * t, t5 = t4 * t;
  return 1 - normPdf(x) * (b1 * t + b2 * t2 + b3 * t3 + b4 * t4 + b5 * t5);
}

// ─── Option Pricer ───────────────────────────

export class OptionPricer {
  private S: number;
  private K: number;
  private T: number;
  private sigma: number;
  private r: number;
  private q: number;
  private d1: number;
  private d2: number;

  constructor(
    spot: number,
    strike: number,
    timeToExpiry: number,
    volatility: number,
    riskFreeRate = INDIA_RISK_FREE_RATE,
    dividendYield = 0,
  ) {
    this.S = spot;
    this.K = strike;
    this.T = Math.max(timeToExpiry, 1e-10);
    this.sigma = volatility;
    this.r = riskFreeRate;
    this.q = dividendYield;

    const sqrtT = Math.sqrt(this.T);
    this.d1 = (Math.log(this.S / this.K) + (this.r - this.q + 0.5 * this.sigma ** 2) * this.T) / (this.sigma * sqrtT);
    this.d2 = this.d1 - this.sigma * sqrtT;
  }

  callPrice(): number {
    return this.S * Math.exp(-this.q * this.T) * normCdf(this.d1) - this.K * Math.exp(-this.r * this.T) * normCdf(this.d2);
  }

  putPrice(): number {
    return this.K * Math.exp(-this.r * this.T) * normCdf(-this.d2) - this.S * Math.exp(-this.q * this.T) * normCdf(-this.d1);
  }

  price(optionType: OptionType): number {
    return optionType === 'CALL' ? this.callPrice() : this.putPrice();
  }

  delta(optionType: OptionType): number {
    const eqDiscount = Math.exp(-this.q * this.T);
    return optionType === 'CALL' ? eqDiscount * normCdf(this.d1) : eqDiscount * (normCdf(this.d1) - 1);
  }

  gamma(): number {
    return Math.exp(-this.q * this.T) * normPdf(this.d1) / (this.S * this.sigma * Math.sqrt(this.T));
  }

  theta(optionType: OptionType): number {
    const sqrtT = Math.sqrt(this.T);
    const eqDiscount = Math.exp(-this.q * this.T);
    const term1 = -(this.S * eqDiscount * normPdf(this.d1) * this.sigma) / (2 * sqrtT);

    let annual: number;
    if (optionType === 'CALL') {
      annual = term1 - this.r * this.K * Math.exp(-this.r * this.T) * normCdf(this.d2) + this.q * this.S * eqDiscount * normCdf(this.d1);
    } else {
      annual = term1 + this.r * this.K * Math.exp(-this.r * this.T) * normCdf(-this.d2) - this.q * this.S * eqDiscount * normCdf(-this.d1);
    }
    return annual / 365; // Per calendar day
  }

  vega(): number {
    const eqDiscount = Math.exp(-this.q * this.T);
    return (this.S * eqDiscount * normPdf(this.d1) * Math.sqrt(this.T)) / 100; // Per 1% vol change
  }

  rho(optionType: OptionType): number {
    const raw = optionType === 'CALL'
      ? this.K * this.T * Math.exp(-this.r * this.T) * normCdf(this.d2)
      : -this.K * this.T * Math.exp(-this.r * this.T) * normCdf(-this.d2);
    return raw / 100; // Per 1% rate change
  }

  allGreeks(optionType: OptionType): Greeks {
    return {
      delta: this.delta(optionType),
      gamma: this.gamma(),
      theta: this.theta(optionType),
      vega: this.vega(),
      rho: this.rho(optionType),
    };
  }

  fullResult(optionType: OptionType): OptionResult {
    return {
      price: this.price(optionType),
      greeks: this.allGreeks(optionType),
      d1: this.d1,
      d2: this.d2,
    };
  }

  // ─── Implied Volatility ──────────────────

  static impliedVolatility(
    marketPrice: number,
    spot: number,
    strike: number,
    timeToExpiry: number,
    optionType: OptionType,
    riskFreeRate = INDIA_RISK_FREE_RATE,
    dividendYield = 0,
    tolerance = 1e-6,
    maxIterations = 100,
  ): number {
    // Brenner-Subrahmanyam initial guess
    let sigma = Math.sqrt((2 * Math.PI) / timeToExpiry) * (marketPrice / spot);
    sigma = Math.max(sigma, 0.01);

    for (let i = 0; i < maxIterations; i++) {
      const pricer = new OptionPricer(spot, strike, timeToExpiry, sigma, riskFreeRate, dividendYield);
      const price = pricer.price(optionType);
      const vegaRaw = pricer.vega() * 100;

      if (Math.abs(vegaRaw) < 1e-12) break;

      const diff = price - marketPrice;
      if (Math.abs(diff) < tolerance) return sigma;

      sigma = Math.max(sigma - diff / vegaRaw, 0.001);
    }

    // Bisection fallback
    return OptionPricer.ivBisection(marketPrice, spot, strike, timeToExpiry, optionType, riskFreeRate, dividendYield, tolerance, maxIterations);
  }

  private static ivBisection(
    marketPrice: number, spot: number, strike: number, timeToExpiry: number,
    optionType: OptionType, riskFreeRate: number, dividendYield: number,
    tolerance: number, maxIterations: number,
  ): number {
    let low = 0.001, high = 5.0;

    for (let i = 0; i < maxIterations; i++) {
      const mid = (low + high) / 2;
      const pricer = new OptionPricer(spot, strike, timeToExpiry, mid, riskFreeRate, dividendYield);
      const diff = pricer.price(optionType) - marketPrice;

      if (Math.abs(diff) < tolerance) return mid;
      if (diff > 0) high = mid;
      else low = mid;
    }
    return (low + high) / 2;
  }
}

// ─── Leg Helpers ─────────────────────────────

function legPayoff(leg: OptionLeg, spot: number): number {
  const dir = leg.positionType === 'LONG' ? 1 : -1;
  const intrinsic = leg.optionType === 'CALL' ? Math.max(0, spot - leg.strike) : Math.max(0, leg.strike - spot);
  return dir * (intrinsic - leg.premium) * leg.quantity * leg.lotSize;
}

function legCost(leg: OptionLeg): number {
  const dir = leg.positionType === 'LONG' ? 1 : -1;
  return -dir * leg.premium * leg.quantity * leg.lotSize;
}

// ─── Strategy Analysis ───────────────────────

export function analyzeStrategy(
  name: string,
  legs: OptionLeg[],
  underlyingPrice: number,
  priceRange?: [number, number],
  steps = 100,
): StrategyAnalysis {
  const low = priceRange?.[0] ?? underlyingPrice * 0.7;
  const high = priceRange?.[1] ?? underlyingPrice * 1.3;
  const step = (high - low) / steps;

  const plCurve: PLPoint[] = [];
  let maxProfit = -Infinity, maxLoss = Infinity;

  for (let i = 0; i <= steps; i++) {
    const spot = low + step * i;
    const pl = legs.reduce((sum, leg) => sum + legPayoff(leg, spot), 0);
    plCurve.push({ spot: Math.round(spot * 100) / 100, pl: Math.round(pl * 100) / 100 });
    if (pl > maxProfit) maxProfit = pl;
    if (pl < maxLoss) maxLoss = pl;
  }

  // Find breakeven points (where P/L crosses zero)
  const breakevenPoints: number[] = [];
  for (let i = 1; i < plCurve.length; i++) {
    if ((plCurve[i - 1].pl <= 0 && plCurve[i].pl >= 0) || (plCurve[i - 1].pl >= 0 && plCurve[i].pl <= 0)) {
      const ratio = Math.abs(plCurve[i - 1].pl) / (Math.abs(plCurve[i - 1].pl) + Math.abs(plCurve[i].pl));
      breakevenPoints.push(Math.round((plCurve[i - 1].spot + ratio * step) * 100) / 100);
    }
  }

  const netPremium = legs.reduce((sum, leg) => sum + legCost(leg), 0);
  const riskRewardRatio = maxLoss !== 0 ? Math.abs(maxProfit / maxLoss) : Infinity;

  return {
    strategyName: name,
    legs,
    underlyingPrice,
    netPremium: Math.round(netPremium * 100) / 100,
    maxProfit: Math.round(maxProfit * 100) / 100,
    maxLoss: Math.round(maxLoss * 100) / 100,
    breakevenPoints,
    riskRewardRatio: Math.round(riskRewardRatio * 100) / 100,
    plCurve,
  };
}

// ─── Strategy Constructors ───────────────────

export function bullCallSpread(
  spot: number, lowerStrike: number, upperStrike: number,
  lowerPremium: number, upperPremium: number,
  quantity = 1, lotSize = 1,
): StrategyAnalysis {
  return analyzeStrategy('Bull Call Spread', [
    { optionType: 'CALL', positionType: 'LONG', strike: lowerStrike, premium: lowerPremium, quantity, lotSize },
    { optionType: 'CALL', positionType: 'SHORT', strike: upperStrike, premium: upperPremium, quantity, lotSize },
  ], spot);
}

export function bearPutSpread(
  spot: number, lowerStrike: number, upperStrike: number,
  lowerPremium: number, upperPremium: number,
  quantity = 1, lotSize = 1,
): StrategyAnalysis {
  return analyzeStrategy('Bear Put Spread', [
    { optionType: 'PUT', positionType: 'LONG', strike: upperStrike, premium: upperPremium, quantity, lotSize },
    { optionType: 'PUT', positionType: 'SHORT', strike: lowerStrike, premium: lowerPremium, quantity, lotSize },
  ], spot);
}

export function longStraddle(
  spot: number, strike: number, callPremium: number, putPremium: number,
  quantity = 1, lotSize = 1,
): StrategyAnalysis {
  return analyzeStrategy('Long Straddle', [
    { optionType: 'CALL', positionType: 'LONG', strike, premium: callPremium, quantity, lotSize },
    { optionType: 'PUT', positionType: 'LONG', strike, premium: putPremium, quantity, lotSize },
  ], spot);
}

export function shortStraddle(
  spot: number, strike: number, callPremium: number, putPremium: number,
  quantity = 1, lotSize = 1,
): StrategyAnalysis {
  return analyzeStrategy('Short Straddle', [
    { optionType: 'CALL', positionType: 'SHORT', strike, premium: callPremium, quantity, lotSize },
    { optionType: 'PUT', positionType: 'SHORT', strike, premium: putPremium, quantity, lotSize },
  ], spot);
}

export function ironCondor(
  spot: number,
  putLowerStrike: number, putUpperStrike: number,
  callLowerStrike: number, callUpperStrike: number,
  putLowerPremium: number, putUpperPremium: number,
  callLowerPremium: number, callUpperPremium: number,
  quantity = 1, lotSize = 1,
): StrategyAnalysis {
  return analyzeStrategy('Iron Condor', [
    { optionType: 'PUT', positionType: 'LONG', strike: putLowerStrike, premium: putLowerPremium, quantity, lotSize },
    { optionType: 'PUT', positionType: 'SHORT', strike: putUpperStrike, premium: putUpperPremium, quantity, lotSize },
    { optionType: 'CALL', positionType: 'SHORT', strike: callLowerStrike, premium: callLowerPremium, quantity, lotSize },
    { optionType: 'CALL', positionType: 'LONG', strike: callUpperStrike, premium: callUpperPremium, quantity, lotSize },
  ], spot);
}

export function longStrangle(
  spot: number, putStrike: number, callStrike: number,
  putPremium: number, callPremium: number,
  quantity = 1, lotSize = 1,
): StrategyAnalysis {
  return analyzeStrategy('Long Strangle', [
    { optionType: 'PUT', positionType: 'LONG', strike: putStrike, premium: putPremium, quantity, lotSize },
    { optionType: 'CALL', positionType: 'LONG', strike: callStrike, premium: callPremium, quantity, lotSize },
  ], spot);
}
