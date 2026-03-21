/**
 * VCP (Volatility Contraction Pattern) Screener
 * Ported from indian-trading-skills: nse-vcp-screener
 *
 * Detects Mark Minervini's VCP setups with composite scoring:
 *   - Trend Template (25%): 7-point Stage 2 check
 *   - Contraction Quality (25%): Tightening depth detection
 *   - Volume Pattern (20%): Volume dry-up ratio
 *   - Pivot Proximity (15%): Distance from breakout pivot
 *   - Relative Strength (15%): Minervini-weighted RS vs Nifty 50
 */

export interface PriceBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TrendTemplateResult {
  criteria: boolean[];
  score: number;
  stage: number;
  details: {
    price: number;
    ma50: number;
    ma150: number;
    ma200: number;
    ma200TrendingUp: boolean;
    criteriaMet: number;
  };
}

export interface Contraction {
  high: number;
  low: number;
  depthPct: number;
  durationDays: number;
}

export interface VCPResult {
  isVcp: boolean;
  score: number;
  contractions: Contraction[];
  pivot: number | null;
  details: Record<string, any>;
}

export interface VolumePatternResult {
  dryUpRatio: number;
  score: number;
  details: { avgVolume50d: number; avgVolume10d: number };
}

export interface PivotProximityResult {
  distancePct: number;
  score: number;
  position: string;
}

export interface RelativeStrengthResult {
  rsValue: number;
  score: number;
  stockReturns: Record<string, number>;
  benchmarkReturns: Record<string, number>;
  excessReturns: Record<string, number>;
}

export interface VCPCompositeResult {
  compositeScore: number;
  quality: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  trendTemplate: TrendTemplateResult;
  vcp: VCPResult;
  volumePattern: VolumePatternResult;
  pivotProximity: PivotProximityResult;
  relativeStrength: RelativeStrengthResult;
}

// ─── Helpers ─────────────────────────────────

function sma(closes: number[], period: number): number {
  if (closes.length < period) return 0;
  const slice = closes.slice(-period);
  return slice.reduce((s, v) => s + v, 0) / period;
}

// ─── Trend Template (Minervini 7-point) ──────

export function calculateTrendTemplate(bars: PriceBar[]): TrendTemplateResult {
  if (bars.length < 200) {
    return {
      criteria: Array(7).fill(false),
      score: 0,
      stage: 0,
      details: { price: 0, ma50: 0, ma150: 0, ma200: 0, ma200TrendingUp: false, criteriaMet: 0 },
    };
  }

  const closes = bars.map(b => b.close);
  const currentPrice = closes[closes.length - 1];
  const ma50 = sma(closes, 50);
  const ma150 = sma(closes, 150);
  const ma200 = sma(closes, 200);

  // Check 200-day MA trending up for 1 month (22 trading days)
  const closes22Ago = closes.slice(0, -22);
  const ma200MonthAgo = closes22Ago.length >= 200 ? sma(closes22Ago, 200) : ma200;
  const ma200TrendingUp = ma200 > ma200MonthAgo;

  const criteria = [
    currentPrice > ma150,   // 1. Price > 150-day MA
    currentPrice > ma200,   // 2. Price > 200-day MA
    ma150 > ma200,          // 3. 150-day MA > 200-day MA
    ma200TrendingUp,        // 4. 200-day MA trending up >= 1 month
    ma50 > ma150,           // 5. 50-day MA > 150-day MA
    ma50 > ma200,           // 6. 50-day MA > 200-day MA
    currentPrice > ma50,    // 7. Price > 50-day MA
  ];

  const criteriaMet = criteria.filter(Boolean).length;
  const score = Math.round((criteriaMet * 100) / 7 * 10) / 10;

  let stage: number;
  if (criteriaMet >= 6) stage = 2;
  else if (currentPrice < ma200 && ma50 < ma200) stage = 4;
  else if (currentPrice > ma200 && ma50 < ma150) stage = 1;
  else stage = 3;

  return {
    criteria,
    score,
    stage,
    details: {
      price: currentPrice,
      ma50: Math.round(ma50 * 100) / 100,
      ma150: Math.round(ma150 * 100) / 100,
      ma200: Math.round(ma200 * 100) / 100,
      ma200TrendingUp,
      criteriaMet,
    },
  };
}

// ─── VCP Pattern Detection ───────────────────

function getAdaptiveWindows(lookback: number): number[] {
  if (lookback >= 100) return [lookback, Math.floor(lookback / 2), Math.floor(lookback / 4), Math.floor(lookback / 8)];
  if (lookback >= 60) return [lookback, Math.floor(lookback / 2), Math.floor(lookback / 4)];
  return [lookback, Math.floor(lookback / 2)];
}

function findContractions(bars: PriceBar[], lookbackDays = 120): Contraction[] {
  const actualLookback = Math.min(lookbackDays, bars.length);
  const recent = bars.slice(-actualLookback);
  const windows = getAdaptiveWindows(actualLookback);
  const contractions: Contraction[] = [];

  for (const window of windows) {
    if (recent.length < window) continue;
    const segment = recent.slice(-window);
    const segHigh = Math.max(...segment.map(b => b.high));
    const segLow = Math.min(...segment.map(b => b.low));
    if (segLow <= 0) continue;
    const depthPct = ((segHigh - segLow) / segHigh) * 100;
    contractions.push({
      high: Math.round(segHigh * 100) / 100,
      low: Math.round(segLow * 100) / 100,
      depthPct: Math.round(depthPct * 100) / 100,
      durationDays: window,
    });
  }

  contractions.sort((a, b) => b.durationDays - a.durationDays);
  return contractions;
}

function scoreContractionQuality(contractions: Contraction[]): number {
  const n = contractions.length;
  let base = n >= 4 ? 85 : n >= 3 ? 72 : 57;
  let score = base;

  const ratios: number[] = [];
  for (let i = 1; i < n; i++) {
    ratios.push(contractions[i].depthPct / contractions[i - 1].depthPct);
  }
  const avgRatio = ratios.length > 0 ? ratios.reduce((s, v) => s + v, 0) / ratios.length : 1;

  if (avgRatio < 0.60) score += 10;
  else if (avgRatio < 0.70) score += 5;

  if (contractions[n - 1].depthPct < 5) score += 10;
  else if (contractions[n - 1].depthPct < 8) score += 5;

  const t1Depth = contractions[0].depthPct;
  if (t1Depth >= 15 && t1Depth <= 30) score += 5;

  return Math.max(0, Math.min(100, score));
}

export function calculateVCP(
  bars: PriceBar[],
  lookbackDays = 120,
  minContractions = 2,
  t1DepthMin = 10,
  t1DepthMax = 40,
  contractionRatio = 0.75,
): VCPResult {
  const contractions = findContractions(bars, lookbackDays);

  if (contractions.length < minContractions) {
    return { isVcp: false, score: 0, contractions, pivot: null, details: { reason: `Only ${contractions.length} contractions found` } };
  }

  const t1 = contractions[0];
  if (t1.depthPct < t1DepthMin) {
    return { isVcp: false, score: 0, contractions, pivot: null, details: { reason: `T1 depth ${t1.depthPct}% < min ${t1DepthMin}%` } };
  }
  if (t1.depthPct > t1DepthMax) {
    return { isVcp: false, score: 0, contractions, pivot: null, details: { reason: `T1 depth ${t1.depthPct}% > max ${t1DepthMax}%` } };
  }

  for (let i = 1; i < contractions.length; i++) {
    const ratio = contractions[i].depthPct / contractions[i - 1].depthPct;
    if (ratio > contractionRatio) {
      return { isVcp: false, score: 0, contractions, pivot: null, details: { reason: 'Contractions not consistently tightening' } };
    }
  }

  const pivot = contractions[contractions.length - 1].high;
  const score = scoreContractionQuality(contractions);

  return {
    isVcp: true,
    score,
    contractions,
    pivot,
    details: { numContractions: contractions.length, t1Depth: t1.depthPct, finalDepth: contractions[contractions.length - 1].depthPct },
  };
}

// ─── Volume Pattern ──────────────────────────

function scoreDryUp(ratio: number): number {
  if (ratio < 0.40) return 90;
  if (ratio < 0.50) return 80;
  if (ratio < 0.60) return 70;
  if (ratio < 0.70) return 60;
  if (ratio < 0.80) return 45;
  if (ratio < 0.90) return 30;
  return 15;
}

export function calculateVolumePattern(bars: PriceBar[]): VolumePatternResult {
  if (bars.length < 50) {
    return { dryUpRatio: 1, score: 0, details: { avgVolume50d: 0, avgVolume10d: 0 } };
  }

  const vols = bars.map(b => b.volume);
  const avg50 = vols.slice(-50).reduce((s, v) => s + v, 0) / 50;
  const avg10 = vols.slice(-10).reduce((s, v) => s + v, 0) / 10;

  if (avg50 <= 0) {
    return { dryUpRatio: 1, score: 0, details: { avgVolume50d: 0, avgVolume10d: 0 } };
  }

  const dryUpRatio = avg10 / avg50;
  return {
    dryUpRatio: Math.round(dryUpRatio * 1000) / 1000,
    score: scoreDryUp(dryUpRatio),
    details: { avgVolume50d: Math.round(avg50), avgVolume10d: Math.round(avg10) },
  };
}

// ─── Pivot Proximity ─────────────────────────

export function calculatePivotProximity(currentPrice: number, pivot: number): PivotProximityResult {
  if (pivot <= 0 || currentPrice <= 0) return { distancePct: 0, score: 0, position: 'invalid' };

  const distancePct = ((pivot - currentPrice) / pivot) * 100;

  let score: number, position: string;
  if (distancePct < 0) { score = 50; position = 'above_pivot'; }
  else if (distancePct <= 3) { score = 90; position = 'near_pivot'; }
  else if (distancePct <= 5) { score = 75; position = 'approaching_pivot'; }
  else if (distancePct <= 8) { score = 60; position = 'moderate_distance'; }
  else if (distancePct <= 12) { score = 45; position = 'far_from_pivot'; }
  else if (distancePct <= 20) { score = 30; position = 'very_far'; }
  else { score = 15; position = 'too_far'; }

  return { distancePct: Math.round(Math.abs(distancePct) * 100) / 100, score, position };
}

// ─── Relative Strength ───────────────────────

function scoreRS(rs: number): number {
  if (rs > 50) return 95;
  if (rs > 30) return 80;
  if (rs > 15) return 65;
  if (rs > 5) return 50;
  if (rs > 0) return 35;
  return 15;
}

export function calculateRelativeStrength(
  stockBars: PriceBar[],
  benchmarkBars?: PriceBar[],
): RelativeStrengthResult {
  const closes = stockBars.map(b => b.close);
  const current = closes[closes.length - 1];

  const periods = {
    '3m': Math.min(63, closes.length - 1),
    '6m': Math.min(126, closes.length - 1),
    '9m': Math.min(189, closes.length - 1),
    '12m': Math.min(252, closes.length - 1),
  };

  const stockReturns: Record<string, number> = {};
  for (const [label, days] of Object.entries(periods)) {
    if (days > 0) {
      const past = closes[closes.length - days - 1];
      stockReturns[label] = past > 0 ? ((current - past) / past) * 100 : 0;
    } else {
      stockReturns[label] = 0;
    }
  }

  const benchmarkReturns: Record<string, number> = { '3m': 0, '6m': 0, '9m': 0, '12m': 0 };
  if (benchmarkBars && benchmarkBars.length > 0) {
    const bCloses = benchmarkBars.map(b => b.close);
    const bCurrent = bCloses[bCloses.length - 1];
    for (const [label, days] of Object.entries(periods)) {
      const d = Math.min(days, bCloses.length - 1);
      if (d > 0) {
        const past = bCloses[bCloses.length - d - 1];
        benchmarkReturns[label] = past > 0 ? ((bCurrent - past) / past) * 100 : 0;
      }
    }
  }

  const excessReturns: Record<string, number> = {};
  for (const k of Object.keys(stockReturns)) {
    excessReturns[k] = stockReturns[k] - benchmarkReturns[k];
  }

  // Minervini weighted RS
  const rsValue = 0.40 * excessReturns['3m'] + 0.20 * excessReturns['6m'] + 0.20 * excessReturns['9m'] + 0.20 * excessReturns['12m'];

  return {
    rsValue: Math.round(rsValue * 100) / 100,
    score: scoreRS(rsValue),
    stockReturns,
    benchmarkReturns,
    excessReturns,
  };
}

// ─── Composite Score ─────────────────────────

const WEIGHTS = {
  trendTemplate: 0.25,
  contractionQuality: 0.25,
  volumePattern: 0.20,
  pivotProximity: 0.15,
  relativeStrength: 0.15,
};

export function calculateCompositeScore(
  trendScore: number,
  contractionScore: number,
  volumeScore: number,
  pivotScore: number,
  rsScore: number,
): { compositeScore: number; quality: 'Excellent' | 'Good' | 'Fair' | 'Poor' } {
  const composite = Math.round(
    (trendScore * WEIGHTS.trendTemplate +
     contractionScore * WEIGHTS.contractionQuality +
     volumeScore * WEIGHTS.volumePattern +
     pivotScore * WEIGHTS.pivotProximity +
     rsScore * WEIGHTS.relativeStrength) * 10
  ) / 10;

  const quality = composite >= 80 ? 'Excellent' : composite >= 65 ? 'Good' : composite >= 50 ? 'Fair' : 'Poor';

  return { compositeScore: composite, quality };
}

// ─── Full VCP Analysis ───────────────────────

export function analyzeVCP(stockBars: PriceBar[], benchmarkBars?: PriceBar[]): VCPCompositeResult {
  const trendTemplate = calculateTrendTemplate(stockBars);
  const vcp = calculateVCP(stockBars);
  const volumePattern = calculateVolumePattern(stockBars);
  const currentPrice = stockBars[stockBars.length - 1].close;
  const pivotProximity = calculatePivotProximity(currentPrice, vcp.pivot ?? currentPrice);
  const relativeStrength = calculateRelativeStrength(stockBars, benchmarkBars);

  const { compositeScore, quality } = calculateCompositeScore(
    trendTemplate.score,
    vcp.score,
    volumePattern.score,
    pivotProximity.score,
    relativeStrength.score,
  );

  return {
    compositeScore,
    quality,
    trendTemplate,
    vcp,
    volumePattern,
    pivotProximity,
    relativeStrength,
  };
}
