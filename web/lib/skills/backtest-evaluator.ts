/**
 * Backtest Evaluation Scoring Tool for Indian Markets (NSE/BSE)
 * Ported from indian-trading-skills: backtest-expert/evaluate_backtest.py
 *
 * 5 dimensions (20 points each = 100 total):
 *   1. Sample Size - Statistical significance
 *   2. Expectancy - Edge per trade after India-specific costs
 *   3. Risk Management - Drawdown control & profit factor
 *   4. Robustness - Years tested & parameter parsimony
 *   5. Execution Realism - Slippage/friction modeling
 *
 * Verdicts: DEPLOY (80+), REFINE (60-79), REFINE WITH CAUTION (40-59), ABANDON (<40)
 */

export interface DimensionScore {
  name: string;
  score: number;
  maxScore: number;
  details: string;
  subScores: Record<string, any>;
}

export interface RedFlag {
  severity: 'critical' | 'warning' | 'info';
  message: string;
  recommendation: string;
}

export interface IndiaTransactionCosts {
  brokerage: number;
  brokeragePct: number;
  stt: number;
  sttPct: number;
  exchangeCharges: number;
  exchangeChargesPct: number;
  gst: number;
  gstPct: number;
  stampDuty: number;
  stampDutyPct: number;
  sebiCharges: number;
  sebiChargesPct: number;
  totalRoundTrip: number;
  totalRoundTripPct: number;
  tradeType: string;
}

export interface EvaluationResult {
  totalScore: number;
  maxPossible: number;
  percentage: number;
  verdict: string;
  verdictDetail: string;
  dimensions: DimensionScore[];
  redFlags: RedFlag[];
  rawExpectancy: number;
  adjustedExpectancy: number;
  indiaCostImpact?: IndiaTransactionCosts;
}

export interface BacktestParams {
  totalTrades: number;
  winRate: number;          // Percentage (e.g., 62)
  avgWinPct: number;        // Average win % (e.g., 1.8)
  avgLossPct: number;       // Average loss % (e.g., 1.2)
  maxDrawdownPct: number;
  yearsTested: number;
  numParameters: number;
  slippageTested: boolean;
  includeIndiaCosts?: boolean;
  brokeragePerTrade?: number;
  avgTradeValue?: number;
  tradeType?: 'delivery' | 'intraday' | 'fno_options' | 'fno_futures';
}

// ─── India Transaction Costs ─────────────────

export function calculateIndiaCosts(
  avgTradeValue: number,
  brokeragePerTrade = 20,
  tradeType = 'delivery',
): IndiaTransactionCosts {
  const brokerageTotal = brokeragePerTrade * 2;

  // STT
  let stt: number;
  if (tradeType === 'delivery') stt = avgTradeValue * 0.001 * 2;
  else if (tradeType === 'intraday') stt = avgTradeValue * 0.00025;
  else if (tradeType === 'fno_options') stt = avgTradeValue * 0.000125;
  else if (tradeType === 'fno_futures') stt = avgTradeValue * 0.000125;
  else stt = avgTradeValue * 0.001 * 2;

  // Exchange charges
  const exchangeRate = tradeType === 'fno_options' ? 0.0005 : 0.0000345;
  const exchangeCharges = avgTradeValue * exchangeRate * 2;

  // GST (18% on brokerage + exchange)
  const gst = (brokerageTotal + exchangeCharges) * 0.18;

  // Stamp duty
  const stampDuty = tradeType === 'delivery' ? avgTradeValue * 0.00015 : avgTradeValue * 0.00003;

  // SEBI charges
  const sebiCharges = avgTradeValue * 0.000001 * 2;

  const total = brokerageTotal + stt + exchangeCharges + gst + stampDuty + sebiCharges;

  return {
    brokerage: brokerageTotal,
    brokeragePct: (brokerageTotal / avgTradeValue) * 100,
    stt,
    sttPct: (stt / avgTradeValue) * 100,
    exchangeCharges,
    exchangeChargesPct: (exchangeCharges / avgTradeValue) * 100,
    gst,
    gstPct: (gst / avgTradeValue) * 100,
    stampDuty,
    stampDutyPct: (stampDuty / avgTradeValue) * 100,
    sebiCharges,
    sebiChargesPct: (sebiCharges / avgTradeValue) * 100,
    totalRoundTrip: total,
    totalRoundTripPct: (total / avgTradeValue) * 100,
    tradeType,
  };
}

// ─── Dimension Scoring ───────────────────────

function scoreSampleSize(totalTrades: number): DimensionScore {
  let score: number, quality: string;

  if (totalTrades < 30) {
    score = Math.max(0, totalTrades / 6);
    quality = 'Statistically meaningless';
  } else if (totalTrades < 50) {
    score = 5 + ((totalTrades - 30) * 3) / 20;
    quality = 'Bare minimum';
  } else if (totalTrades < 100) {
    score = 8 + ((totalTrades - 50) * 4) / 50;
    quality = 'Weak but usable';
  } else if (totalTrades < 150) {
    score = 12 + ((totalTrades - 100) * 3) / 50;
    quality = 'Moderate confidence';
  } else if (totalTrades < 200) {
    score = 15 + ((totalTrades - 150) * 3) / 50;
    quality = 'Good confidence';
  } else {
    score = 18 + Math.min(2, (totalTrades - 200) / 100);
    quality = 'Strong confidence';
  }

  score = Math.round(Math.min(20, score) * 10) / 10;

  return {
    name: 'Sample Size',
    score,
    maxScore: 20,
    details: `${totalTrades} trades — ${quality}`,
    subScores: { totalTrades, qualityLabel: quality },
  };
}

function scoreExpectancy(winRate: number, avgWinPct: number, avgLossPct: number, costPct = 0): DimensionScore {
  const winRateDec = winRate / 100;
  const lossRateDec = 1 - winRateDec;
  const rawExpectancy = winRateDec * avgWinPct - lossRateDec * avgLossPct;
  const adjustedExpectancy = rawExpectancy - costPct;
  const e = adjustedExpectancy;

  let score: number, quality: string;
  if (e <= 0) { score = 0; quality = 'No edge'; }
  else if (e <= 0.1) { score = (e / 0.1) * 5; quality = 'Marginal edge'; }
  else if (e <= 0.3) { score = 5 + ((e - 0.1) / 0.2) * 5; quality = 'Small but real edge'; }
  else if (e <= 0.6) { score = 10 + ((e - 0.3) / 0.3) * 5; quality = 'Solid edge'; }
  else if (e <= 1.0) { score = 15 + ((e - 0.6) / 0.4) * 3; quality = 'Strong edge'; }
  else { score = 18 + Math.min(2, (e - 1.0) / 0.5); quality = 'Exceptional edge'; }

  score = Math.round(Math.min(20, score) * 10) / 10;
  const grossProfit = winRateDec * avgWinPct;
  const grossLoss = lossRateDec * avgLossPct;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : Infinity;

  return {
    name: 'Expectancy',
    score,
    maxScore: 20,
    details: `Raw E = ${rawExpectancy.toFixed(4)}%, Adjusted = ${adjustedExpectancy.toFixed(4)}%, PF = ${profitFactor.toFixed(2)} — ${quality}`,
    subScores: {
      rawExpectancyPct: Math.round(rawExpectancy * 10000) / 10000,
      adjustedExpectancyPct: Math.round(adjustedExpectancy * 10000) / 10000,
      costPctPerTrade: Math.round(costPct * 10000) / 10000,
      profitFactor: Math.round(profitFactor * 100) / 100,
      qualityLabel: quality,
    },
  };
}

function scoreRiskManagement(maxDrawdownPct: number, winRate: number, avgWinPct: number, avgLossPct: number): DimensionScore {
  let ddScore: number;
  if (maxDrawdownPct < 10) ddScore = 10 + ((10 - maxDrawdownPct) / 10) * 2;
  else if (maxDrawdownPct < 15) ddScore = 8 + ((15 - maxDrawdownPct) / 5) * 2;
  else if (maxDrawdownPct < 25) ddScore = 5 + ((25 - maxDrawdownPct) / 10) * 3;
  else if (maxDrawdownPct < 35) ddScore = 2 + ((35 - maxDrawdownPct) / 10) * 3;
  else ddScore = Math.max(0, 2 - ((maxDrawdownPct - 35) / 15) * 2);
  ddScore = Math.round(Math.min(12, Math.max(0, ddScore)) * 10) / 10;

  const winDec = winRate / 100;
  const grossProfit = winDec * avgWinPct;
  const grossLoss = (1 - winDec) * avgLossPct;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : Infinity;

  let pfScore: number;
  if (profitFactor >= 2.0) pfScore = 7 + Math.min(1, (profitFactor - 2) / 1);
  else if (profitFactor >= 1.5) pfScore = 5 + ((profitFactor - 1.5) / 0.5) * 2;
  else if (profitFactor >= 1.2) pfScore = 3 + ((profitFactor - 1.2) / 0.3) * 2;
  else if (profitFactor >= 1.0) pfScore = 1 + ((profitFactor - 1.0) / 0.2) * 2;
  else pfScore = 0;
  pfScore = Math.round(Math.min(8, Math.max(0, pfScore)) * 10) / 10;

  return {
    name: 'Risk Management',
    score: Math.round((ddScore + pfScore) * 10) / 10,
    maxScore: 20,
    details: `Max DD: ${maxDrawdownPct}% (${ddScore}/12), PF: ${profitFactor.toFixed(2)} (${pfScore}/8)`,
    subScores: { maxDrawdownPct, drawdownScore: ddScore, profitFactor: Math.round(profitFactor * 100) / 100, profitFactorScore: pfScore },
  };
}

function scoreRobustness(yearsTested: number, numParameters: number): DimensionScore {
  let yearsScore: number;
  if (yearsTested < 3) yearsScore = (yearsTested / 3) * 4;
  else if (yearsTested < 5) yearsScore = 4 + ((yearsTested - 3) / 2) * 3;
  else if (yearsTested < 8) yearsScore = 7 + ((yearsTested - 5) / 3) * 3;
  else if (yearsTested < 10) yearsScore = 10 + ((yearsTested - 8) / 2) * 1;
  else yearsScore = 11 + Math.min(1, (yearsTested - 10) / 5);
  yearsScore = Math.round(Math.min(12, Math.max(0, yearsScore)) * 10) / 10;

  let paramScore: number;
  if (numParameters <= 2) paramScore = 7 + (2 - numParameters) * 0.5;
  else if (numParameters <= 4) paramScore = 5 + ((4 - numParameters) / 2) * 2;
  else if (numParameters <= 6) paramScore = 2 + ((6 - numParameters) / 2) * 3;
  else paramScore = Math.max(0, 2 - (numParameters - 6) * 0.5);
  paramScore = Math.round(Math.min(8, Math.max(0, paramScore)) * 10) / 10;

  return {
    name: 'Robustness',
    score: Math.round((yearsScore + paramScore) * 10) / 10,
    maxScore: 20,
    details: `${yearsTested}y tested (${yearsScore}/12), ${numParameters} params (${paramScore}/8)`,
    subScores: { yearsTested, yearsScore, numParameters, parameterScore: paramScore },
  };
}

function scoreExecutionRealism(slippageTested: boolean): DimensionScore {
  return {
    name: 'Execution Realism',
    score: slippageTested ? 20 : 5,
    maxScore: 20,
    details: slippageTested ? 'Slippage/friction modeled — full marks' : 'Slippage NOT modeled — results likely optimistic',
    subScores: { slippageTested },
  };
}

// ─── Red Flag Detection ──────────────────────

function detectRedFlags(params: BacktestParams, adjustedExpectancy: number): RedFlag[] {
  const flags: RedFlag[] = [];

  if (adjustedExpectancy <= 0) {
    flags.push({ severity: 'critical', message: 'Negative or zero expectancy — no edge.', recommendation: 'Re-examine hypothesis. Transaction costs may destroy the edge.' });
  }
  if (params.totalTrades < 30) {
    flags.push({ severity: 'critical', message: `Only ${params.totalTrades} trades — statistically meaningless.`, recommendation: 'Expand universe/timeframe. Need 100+ trades.' });
  }
  if (params.numParameters > 5) {
    flags.push({ severity: 'critical', message: `${params.numParameters} parameters — high overfitting risk.`, recommendation: 'Reduce to 3-4 free parameters.' });
  }
  if (!params.slippageTested) {
    flags.push({ severity: 'critical', message: 'Slippage not modeled.', recommendation: 'Re-run with 0.05-0.3% slippage + brokerage + STT.' });
  }
  if (params.winRate > 80) {
    flags.push({ severity: 'warning', message: `${params.winRate}% win rate — suspiciously high.`, recommendation: 'Check for look-ahead bias.' });
  }
  if (params.yearsTested < 5) {
    flags.push({ severity: 'warning', message: `Only ${params.yearsTested}y tested.`, recommendation: 'Extend to 8-10 years to cover multiple regimes.' });
  }
  if (params.maxDrawdownPct > 30) {
    flags.push({ severity: 'warning', message: `${params.maxDrawdownPct}% max drawdown.`, recommendation: 'Reduce position size or add circuit breaker.' });
  }
  if (adjustedExpectancy > 0 && adjustedExpectancy < 0.1) {
    flags.push({ severity: 'warning', message: `Marginal expectancy (${adjustedExpectancy.toFixed(4)}%).`, recommendation: 'Edge may disappear with market changes.' });
  }
  if (params.avgLossPct > params.avgWinPct * 2) {
    flags.push({ severity: 'warning', message: `Avg loss (${params.avgLossPct}%) > 2x avg win (${params.avgWinPct}%).`, recommendation: 'Fragile pattern — tighten stops or widen targets.' });
  }
  if (params.totalTrades >= 30 && params.totalTrades < 100) {
    flags.push({ severity: 'info', message: `${params.totalTrades} trades below 100+ threshold.`, recommendation: 'Increase sample size for confidence.' });
  }

  return flags;
}

// ─── Main Evaluation ─────────────────────────

export function evaluateBacktest(params: BacktestParams): EvaluationResult {
  // Calculate India-specific costs
  let costPct = 0;
  let indiaCostImpact: IndiaTransactionCosts | undefined;

  if (params.includeIndiaCosts && params.avgTradeValue) {
    indiaCostImpact = calculateIndiaCosts(
      params.avgTradeValue,
      params.brokeragePerTrade ?? 20,
      params.tradeType ?? 'delivery',
    );
    costPct = indiaCostImpact.totalRoundTripPct;
  }

  // Score all dimensions
  const dimensions = [
    scoreSampleSize(params.totalTrades),
    scoreExpectancy(params.winRate, params.avgWinPct, params.avgLossPct, costPct),
    scoreRiskManagement(params.maxDrawdownPct, params.winRate, params.avgWinPct, params.avgLossPct),
    scoreRobustness(params.yearsTested, params.numParameters),
    scoreExecutionRealism(params.slippageTested),
  ];

  const totalScore = Math.round(dimensions.reduce((s, d) => s + d.score, 0) * 10) / 10;
  const percentage = Math.round((totalScore / 100) * 1000) / 10;

  // Calculate expectancy for red flags
  const winDec = params.winRate / 100;
  const rawExpectancy = winDec * params.avgWinPct - (1 - winDec) * params.avgLossPct;
  const adjustedExpectancy = rawExpectancy - costPct;

  const redFlags = detectRedFlags(params, adjustedExpectancy);

  // Verdict
  let verdict: string, verdictDetail: string;
  if (totalScore >= 80) {
    verdict = 'DEPLOY';
    verdictDetail = 'Strategy shows promise. Deploy with proper position sizing and monitoring.';
  } else if (totalScore >= 60) {
    verdict = 'REFINE';
    verdictDetail = 'Strategy has potential but needs improvement in weak dimensions.';
  } else if (totalScore >= 40) {
    verdict = 'REFINE WITH CAUTION';
    verdictDetail = 'Significant weaknesses. Address red flags before considering deployment.';
  } else {
    verdict = 'ABANDON';
    verdictDetail = 'Strategy does not demonstrate a reliable edge. Consider alternative approaches.';
  }

  return {
    totalScore,
    maxPossible: 100,
    percentage,
    verdict,
    verdictDetail,
    dimensions,
    redFlags,
    rawExpectancy: Math.round(rawExpectancy * 10000) / 10000,
    adjustedExpectancy: Math.round(adjustedExpectancy * 10000) / 10000,
    indiaCostImpact,
  };
}
