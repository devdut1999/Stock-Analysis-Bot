/**
 * Minervini SEPA & VCP Trading Strategy Implementation
 *
 * Based on Mark Minervini's "Trade Like a Stock Market Wizard"
 * - Trend Template: 8 criteria for Stage 2 uptrend validation
 * - VCP: Volatility Contraction Pattern detection
 * - SEPA: Specific Entry Point Analysis
 */

import { PricePoint, calculateSMA, calculateEMA } from './indicators';

// ─── Trend Template ─────────────────────────────────────────────

export interface TrendTemplateResult {
  /** Does the stock pass all 8 criteria? */
  passes: boolean;
  /** How many of the 8 criteria pass (0-8) */
  score: number;
  /** Individual criteria results */
  criteria: TrendTemplateCriterion[];
  /** Stage classification */
  stage: 'stage1-accumulation' | 'stage2-uptrend' | 'stage3-distribution' | 'stage4-decline';
}

export interface TrendTemplateCriterion {
  id: number;
  label: string;
  passes: boolean;
  value: string;
  threshold: string;
}

/**
 * Minervini's Trend Template — 8 criteria that filter ~95% of stocks.
 * A stock must pass ALL 8 to be considered a Stage 2 leader.
 */
export function evaluateTrendTemplate(priceData: PricePoint[]): TrendTemplateResult {
  const closes = priceData.map(p => p.close);
  const currentPrice = closes[closes.length - 1];

  // Calculate required MAs
  const sma50 = calculateSMA(closes, 50);
  const sma150 = calculateSMA(closes, 150);
  const sma200 = calculateSMA(closes, 200);

  // 200-day SMA 1 month ago (to check if trending up)
  const closes1MonthAgo = closes.slice(0, -22);
  const sma200_1mAgo = closes1MonthAgo.length >= 200
    ? calculateSMA(closes1MonthAgo, 200)
    : null;

  // 52-week high/low
  const yearData = closes.slice(-252);
  const high52w = Math.max(...yearData);
  const low52w = Math.min(...yearData);

  // Relative Strength (simplified: % from 52w low vs Nifty - we approximate as price position in range)
  const rsRating = yearData.length > 0
    ? ((currentPrice - low52w) / (high52w - low52w)) * 100
    : 50;

  const criteria: TrendTemplateCriterion[] = [
    {
      id: 1,
      label: 'Price > 150-day & 200-day SMA',
      passes: sma150 !== null && sma200 !== null && currentPrice > sma150 && currentPrice > sma200,
      value: `₹${currentPrice.toFixed(0)} vs 150SMA ₹${sma150?.toFixed(0) ?? 'N/A'}, 200SMA ₹${sma200?.toFixed(0) ?? 'N/A'}`,
      threshold: 'Price must be above both',
    },
    {
      id: 2,
      label: '150-day SMA > 200-day SMA',
      passes: sma150 !== null && sma200 !== null && sma150 > sma200,
      value: `150SMA ₹${sma150?.toFixed(0) ?? 'N/A'} vs 200SMA ₹${sma200?.toFixed(0) ?? 'N/A'}`,
      threshold: '150 SMA must be higher',
    },
    {
      id: 3,
      label: '200-day SMA trending up (1+ month)',
      passes: sma200 !== null && sma200_1mAgo !== null && sma200 > sma200_1mAgo,
      value: `200SMA now ₹${sma200?.toFixed(0) ?? 'N/A'} vs 1m ago ₹${sma200_1mAgo?.toFixed(0) ?? 'N/A'}`,
      threshold: 'Must be rising',
    },
    {
      id: 4,
      label: '50-day SMA > 150-day & 200-day SMA',
      passes: sma50 !== null && sma150 !== null && sma200 !== null && sma50 > sma150 && sma50 > sma200,
      value: `50SMA ₹${sma50?.toFixed(0) ?? 'N/A'}`,
      threshold: 'Must be above both longer MAs',
    },
    {
      id: 5,
      label: 'Price > 50-day SMA',
      passes: sma50 !== null && currentPrice > sma50,
      value: `₹${currentPrice.toFixed(0)} vs 50SMA ₹${sma50?.toFixed(0) ?? 'N/A'}`,
      threshold: 'Price must be above',
    },
    {
      id: 6,
      label: 'Price > 30% above 52-week low',
      passes: low52w > 0 && ((currentPrice - low52w) / low52w) * 100 >= 30,
      value: `${(((currentPrice - low52w) / low52w) * 100).toFixed(1)}% above 52w low ₹${low52w.toFixed(0)}`,
      threshold: '≥ 30% above low',
    },
    {
      id: 7,
      label: 'Price within 25% of 52-week high',
      passes: high52w > 0 && ((high52w - currentPrice) / high52w) * 100 <= 25,
      value: `${(((high52w - currentPrice) / high52w) * 100).toFixed(1)}% below 52w high ₹${high52w.toFixed(0)}`,
      threshold: '≤ 25% below high',
    },
    {
      id: 8,
      label: 'Relative Strength > 70',
      passes: rsRating > 70,
      value: `RS Rating: ${rsRating.toFixed(0)}`,
      threshold: '> 70 (ideally 90+)',
    },
  ];

  const score = criteria.filter(c => c.passes).length;

  // Determine stage
  let stage: TrendTemplateResult['stage'] = 'stage1-accumulation';
  if (score >= 7) stage = 'stage2-uptrend';
  else if (sma50 !== null && sma200 !== null && sma50 < sma200 && currentPrice < sma200) stage = 'stage4-decline';
  else if (sma50 !== null && sma200 !== null && sma50 < sma200) stage = 'stage3-distribution';

  return {
    passes: score === 8,
    score,
    criteria,
    stage,
  };
}


// ─── VCP Pattern Detection ──────────────────────────────────────

export interface VCPResult {
  /** Is a valid VCP pattern detected? */
  detected: boolean;
  /** Confidence score 0-100 */
  confidence: number;
  /** Number of contractions found (ideal: 2-4) */
  contractions: VCPContraction[];
  /** Pivot point price (breakout level) */
  pivotPrice: number | null;
  /** Is volume declining through the pattern? */
  volumeDeclining: boolean;
  /** Pattern description */
  description: string;
}

export interface VCPContraction {
  /** Contraction number (1 = first/widest) */
  number: number;
  /** High of the contraction */
  high: number;
  /** Low of the contraction */
  low: number;
  /** Depth as percentage */
  depthPercent: number;
  /** Average volume during this contraction */
  avgVolume: number;
  /** Duration in trading days */
  days: number;
}

/**
 * Detect Volatility Contraction Pattern in price data.
 *
 * A valid VCP has:
 * 1. Prior uptrend (Stage 2)
 * 2. 2-4 contractions, each shallower than the previous
 * 3. Declining volume through the pattern
 * 4. Tight final consolidation near the pivot
 */
export function detectVCP(priceData: PricePoint[], lookbackDays: number = 120): VCPResult {
  if (priceData.length < lookbackDays) {
    return { detected: false, confidence: 0, contractions: [], pivotPrice: null, volumeDeclining: false, description: 'Insufficient data' };
  }

  const data = priceData.slice(-lookbackDays);
  const closes = data.map(p => p.close);
  const highs = data.map(p => p.high);
  const lows = data.map(p => p.low);
  const volumes = data.map(p => p.volume);

  // Step 1: Find the pattern's starting high (left side of base)
  const patternHigh = Math.max(...highs);
  const patternHighIdx = highs.indexOf(patternHigh);

  // Need the high to be in the first half of the lookback
  if (patternHighIdx > lookbackDays * 0.7) {
    return { detected: false, confidence: 0, contractions: [], pivotPrice: null, volumeDeclining: false, description: 'No base formation — stock still rising' };
  }

  // Step 2: Find contractions (swing high → swing low → swing high sequences)
  const contractions: VCPContraction[] = [];
  const swings = findSwingPoints(data, 5);

  if (swings.length < 4) {
    return { detected: false, confidence: 0, contractions: [], pivotPrice: null, volumeDeclining: false, description: 'Not enough swing points for VCP' };
  }

  // Group swings into contractions
  let contractionNum = 0;
  for (let i = 0; i < swings.length - 1; i += 2) {
    if (swings[i].type === 'high' && i + 1 < swings.length && swings[i + 1].type === 'low') {
      contractionNum++;
      const swingHigh = swings[i];
      const swingLow = swings[i + 1];
      const startIdx = swingHigh.index;
      const endIdx = Math.min(
        i + 2 < swings.length ? swings[i + 2].index : data.length - 1,
        data.length - 1
      );

      const segmentVolumes = volumes.slice(startIdx, endIdx + 1);
      const avgVol = segmentVolumes.length > 0
        ? segmentVolumes.reduce((a, b) => a + b, 0) / segmentVolumes.length
        : 0;

      const depth = swingHigh.price > 0
        ? ((swingHigh.price - swingLow.price) / swingHigh.price) * 100
        : 0;

      contractions.push({
        number: contractionNum,
        high: swingHigh.price,
        low: swingLow.price,
        depthPercent: depth,
        avgVolume: avgVol,
        days: endIdx - startIdx,
      });

      if (contractionNum >= 5) break;
    }
  }

  if (contractions.length < 2) {
    return { detected: false, confidence: 0, contractions, pivotPrice: null, volumeDeclining: false, description: 'Fewer than 2 contractions found' };
  }

  // Step 3: Validate — each contraction should be shallower than the previous
  let contractionsDecreasing = true;
  for (let i = 1; i < contractions.length; i++) {
    if (contractions[i].depthPercent >= contractions[i - 1].depthPercent * 1.1) {
      contractionsDecreasing = false;
      break;
    }
  }

  // Step 4: Check volume declining
  let volumeDeclining = true;
  for (let i = 1; i < contractions.length; i++) {
    if (contractions[i].avgVolume > contractions[i - 1].avgVolume * 1.15) {
      volumeDeclining = false;
      break;
    }
  }

  // Step 5: Calculate pivot price (highest high in the last contraction)
  const lastContraction = contractions[contractions.length - 1];
  const pivotPrice = lastContraction.high;

  // Step 6: Check tightness of last contraction
  const lastContractionTight = lastContraction.depthPercent < 15;

  // Step 7: Calculate confidence
  let confidence = 0;
  if (contractions.length >= 2 && contractions.length <= 4) confidence += 25;
  else if (contractions.length >= 5) confidence += 10;
  if (contractionsDecreasing) confidence += 30;
  if (volumeDeclining) confidence += 20;
  if (lastContractionTight) confidence += 15;
  // Bonus for 3 contractions (sweet spot)
  if (contractions.length === 3) confidence += 10;

  const detected = confidence >= 50;

  const description = detected
    ? `VCP detected: ${contractions.length} contractions (${contractions.map(c => c.depthPercent.toFixed(1) + '%').join(' → ')}), ${volumeDeclining ? 'declining volume' : 'mixed volume'}. Pivot at ₹${pivotPrice.toFixed(2)}.`
    : `Weak/No VCP: ${contractions.length} contractions but ${!contractionsDecreasing ? 'depths not decreasing' : ''}${!volumeDeclining ? ', volume not declining' : ''}.`;

  return {
    detected,
    confidence,
    contractions,
    pivotPrice: detected ? pivotPrice : null,
    volumeDeclining,
    description,
  };
}


// ─── SEPA Entry Analysis ────────────────────────────────────────

export interface SEPAResult {
  /** Is this a valid SEPA entry? */
  valid: boolean;
  /** Trend Template result */
  trendTemplate: TrendTemplateResult;
  /** VCP result */
  vcp: VCPResult;
  /** Recommended entry price */
  entryPrice: number | null;
  /** Stop loss price (below last contraction low) */
  stopLoss: number | null;
  /** Risk percentage from entry to stop */
  riskPercent: number | null;
  /** Target prices (1R, 2R, 3R) */
  targets: { r1: number; r2: number; r3: number } | null;
  /** Overall SEPA score (0-100) */
  score: number;
  /** Human-readable summary */
  summary: string;
}

/**
 * Full SEPA (Specific Entry Point Analysis) evaluation.
 * Combines Trend Template + VCP + entry/risk calculations.
 */
export function evaluateSEPA(priceData: PricePoint[]): SEPAResult {
  const trendTemplate = evaluateTrendTemplate(priceData);
  const vcp = detectVCP(priceData);

  const currentPrice = priceData[priceData.length - 1].close;

  // Calculate SEPA score
  let score = 0;
  // Trend Template weight: 40%
  score += (trendTemplate.score / 8) * 40;
  // VCP weight: 40%
  score += (vcp.confidence / 100) * 40;
  // Bonus for Stage 2: 10%
  if (trendTemplate.stage === 'stage2-uptrend') score += 10;
  // Bonus for tight last contraction: 10%
  if (vcp.contractions.length > 0) {
    const lastDepth = vcp.contractions[vcp.contractions.length - 1].depthPercent;
    if (lastDepth < 10) score += 10;
    else if (lastDepth < 15) score += 5;
  }

  const valid = trendTemplate.passes && vcp.detected;

  // Entry/risk calculations
  let entryPrice: number | null = null;
  let stopLoss: number | null = null;
  let riskPercent: number | null = null;
  let targets: SEPAResult['targets'] = null;

  if (vcp.pivotPrice && vcp.contractions.length > 0) {
    entryPrice = vcp.pivotPrice;
    const lastContraction = vcp.contractions[vcp.contractions.length - 1];
    stopLoss = lastContraction.low * 0.99; // 1% below last contraction low
    riskPercent = ((entryPrice - stopLoss) / entryPrice) * 100;

    const riskAmount = entryPrice - stopLoss;
    targets = {
      r1: entryPrice + riskAmount * 1,    // 1:1 R/R
      r2: entryPrice + riskAmount * 2,    // 2:1 R/R
      r3: entryPrice + riskAmount * 3,    // 3:1 R/R
    };
  }

  // Summary
  let summary: string;
  if (valid) {
    summary = `SEPA ENTRY VALID (Score: ${score.toFixed(0)}/100). Stock is in Stage 2 uptrend with ${vcp.contractions.length}-contraction VCP. Entry at ₹${entryPrice?.toFixed(2)} with stop at ₹${stopLoss?.toFixed(2)} (${riskPercent?.toFixed(1)}% risk). Targets: ₹${targets?.r1.toFixed(0)}, ₹${targets?.r2.toFixed(0)}, ₹${targets?.r3.toFixed(0)}.`;
  } else if (trendTemplate.passes && !vcp.detected) {
    summary = `Stock passes Trend Template (${trendTemplate.score}/8) but no valid VCP pattern detected. Wait for a proper base/contraction to form.`;
  } else if (!trendTemplate.passes && vcp.detected) {
    summary = `VCP pattern detected but stock fails Trend Template (${trendTemplate.score}/8). Not in a confirmed Stage 2 uptrend — higher risk entry.`;
  } else {
    summary = `No SEPA setup. Trend Template: ${trendTemplate.score}/8, VCP confidence: ${vcp.confidence}%. Stock is in ${trendTemplate.stage}.`;
  }

  return {
    valid,
    trendTemplate,
    vcp,
    entryPrice,
    stopLoss,
    riskPercent,
    targets,
    score,
    summary,
  };
}


// ─── Helpers ────────────────────────────────────────────────────

interface SwingPoint {
  index: number;
  price: number;
  type: 'high' | 'low';
}

/**
 * Find swing highs and lows in price data using a rolling window.
 */
function findSwingPoints(data: PricePoint[], windowSize: number = 5): SwingPoint[] {
  const swings: SwingPoint[] = [];

  for (let i = windowSize; i < data.length - windowSize; i++) {
    let isSwingHigh = true;
    let isSwingLow = true;

    for (let j = i - windowSize; j <= i + windowSize; j++) {
      if (j === i) continue;
      if (data[j].high >= data[i].high) isSwingHigh = false;
      if (data[j].low <= data[i].low) isSwingLow = false;
    }

    if (isSwingHigh) {
      swings.push({ index: i, price: data[i].high, type: 'high' });
    }
    if (isSwingLow) {
      swings.push({ index: i, price: data[i].low, type: 'low' });
    }
  }

  return swings.sort((a, b) => a.index - b.index);
}
