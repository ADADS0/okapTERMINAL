import type { CandleData, FootprintCandle, FootprintLevel } from './types';

export interface IndicatorData {
  time: number;
  value: number;
}

export interface MACDData {
  time: number;
  macd: number;
  signal: number;
  histogram: number;
}

// Simple Moving Average (SMA)
export function calculateSMA(candles: CandleData[], period: number): IndicatorData[] {
  const result: IndicatorData[] = [];

  if (candles.length < period) return result;

  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += candles[i - j].close;
    }
    result.push({
      time: candles[i].time,
      value: sum / period,
    });
  }

  return result;
}

// Exponential Moving Average (EMA)
export function calculateEMA(candles: CandleData[], period: number): IndicatorData[] {
  const result: IndicatorData[] = [];

  if (candles.length < period) return result;

  const multiplier = 2 / (period + 1);

  // Start with SMA for the first value
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  let ema = sum / period;

  result.push({
    time: candles[period - 1].time,
    value: ema,
  });

  // Calculate EMA for remaining values
  for (let i = period; i < candles.length; i++) {
    ema = (candles[i].close - ema) * multiplier + ema;
    result.push({
      time: candles[i].time,
      value: ema,
    });
  }

  return result;
}

// Relative Strength Index (RSI)
export function calculateRSI(candles: CandleData[], period = 14): IndicatorData[] {
  const result: IndicatorData[] = [];

  if (candles.length < period + 1) return result;

  const gains: number[] = [];
  const losses: number[] = [];

  // Calculate price changes
  for (let i = 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  // Calculate initial average gain and loss
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // First RSI value
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let rsi = 100 - (100 / (1 + rs));

  result.push({
    time: candles[period].time,
    value: rsi,
  });

  // Calculate remaining RSI values using smoothed averages
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi = 100 - (100 / (1 + rs));

    result.push({
      time: candles[i + 1].time,
      value: rsi,
    });
  }

  return result;
}

// Moving Average Convergence Divergence (MACD)
export function calculateMACD(
  candles: CandleData[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MACDData[] {
  const result: MACDData[] = [];

  if (candles.length < slowPeriod + signalPeriod) return result;

  const fastEMA = calculateEMA(candles, fastPeriod);
  const slowEMA = calculateEMA(candles, slowPeriod);

  // Calculate MACD line (fast EMA - slow EMA)
  const macdLine: IndicatorData[] = [];
  const slowStartIndex = slowPeriod - fastPeriod;

  for (let i = 0; i < slowEMA.length; i++) {
    const fastIndex = i + slowStartIndex;
    if (fastIndex >= 0 && fastIndex < fastEMA.length) {
      macdLine.push({
        time: slowEMA[i].time,
        value: fastEMA[fastIndex].value - slowEMA[i].value,
      });
    }
  }

  if (macdLine.length < signalPeriod) return result;

  // Calculate Signal line (EMA of MACD line)
  const multiplier = 2 / (signalPeriod + 1);
  let signalSum = 0;
  for (let i = 0; i < signalPeriod; i++) {
    signalSum += macdLine[i].value;
  }
  let signal = signalSum / signalPeriod;

  result.push({
    time: macdLine[signalPeriod - 1].time,
    macd: macdLine[signalPeriod - 1].value,
    signal: signal,
    histogram: macdLine[signalPeriod - 1].value - signal,
  });

  for (let i = signalPeriod; i < macdLine.length; i++) {
    signal = (macdLine[i].value - signal) * multiplier + signal;
    result.push({
      time: macdLine[i].time,
      macd: macdLine[i].value,
      signal: signal,
      histogram: macdLine[i].value - signal,
    });
  }

  return result;
}

// Bollinger Bands
export interface BollingerBandData {
  time: number;
  upper: number;
  middle: number;
  lower: number;
}

// VWAP (Volume Weighted Average Price)
export interface VWAPData {
  time: number;
  vwap: number;
  upperBand1: number; // +1 std dev
  lowerBand1: number; // -1 std dev
  upperBand2: number; // +2 std dev
  lowerBand2: number; // -2 std dev
}

export function calculateVWAP(candles: CandleData[]): VWAPData[] {
  const result: VWAPData[] = [];

  if (candles.length === 0) return result;

  let cumulativeTPV = 0; // Cumulative Typical Price × Volume
  let cumulativeVolume = 0;
  const squaredDeviations: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    const tpv = typicalPrice * candle.volume;

    cumulativeTPV += tpv;
    cumulativeVolume += candle.volume;

    const vwap = cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : typicalPrice;

    // Calculate squared deviation for standard deviation bands
    squaredDeviations.push(Math.pow(typicalPrice - vwap, 2) * candle.volume);

    // Calculate cumulative standard deviation
    const sumSquaredDev = squaredDeviations.reduce((a, b) => a + b, 0);
    const variance = cumulativeVolume > 0 ? sumSquaredDev / cumulativeVolume : 0;
    const stdDev = Math.sqrt(variance);

    result.push({
      time: candle.time,
      vwap,
      upperBand1: vwap + stdDev,
      lowerBand1: vwap - stdDev,
      upperBand2: vwap + 2 * stdDev,
      lowerBand2: vwap - 2 * stdDev,
    });
  }

  return result;
}

// Cumulative Volume Delta (CVD)
export interface CVDData {
  time: number;
  cvd: number;
  delta: number; // Per-candle delta
}

export function calculateCVD(candles: CandleData[]): CVDData[] {
  const result: CVDData[] = [];

  if (candles.length === 0) return result;

  let cumulativeDelta = 0;

  for (const candle of candles) {
    // Estimate buy/sell volume based on candle direction and position
    // This is an approximation - real CVD would need tick data
    const range = candle.high - candle.low;
    const body = Math.abs(candle.close - candle.open);
    const isBullish = candle.close >= candle.open;

    // Calculate buy pressure based on close position within the range
    const closePosition = range > 0 ? (candle.close - candle.low) / range : 0.5;

    // Estimate delta: positive = more buying, negative = more selling
    const buyVolume = candle.volume * closePosition;
    const sellVolume = candle.volume * (1 - closePosition);
    const delta = buyVolume - sellVolume;

    cumulativeDelta += delta;

    result.push({
      time: candle.time,
      cvd: cumulativeDelta,
      delta,
    });
  }

  return result;
}

// Delta per candle (for Delta Bars)
export interface DeltaBarData {
  time: number;
  delta: number;
  buyVolume: number;
  sellVolume: number;
  maxDelta: number;
  minDelta: number;
}

export function calculateDeltaBars(candles: CandleData[]): DeltaBarData[] {
  const result: DeltaBarData[] = [];

  for (const candle of candles) {
    const range = candle.high - candle.low;
    const closePosition = range > 0 ? (candle.close - candle.low) / range : 0.5;

    const buyVolume = candle.volume * closePosition;
    const sellVolume = candle.volume * (1 - closePosition);
    const delta = buyVolume - sellVolume;

    result.push({
      time: candle.time,
      delta,
      buyVolume,
      sellVolume,
      maxDelta: Math.max(delta, 0),
      minDelta: Math.min(delta, 0),
    });
  }

  return result;
}

export function calculateBollingerBands(
  candles: CandleData[],
  period = 20,
  stdDev = 2
): BollingerBandData[] {
  const result: BollingerBandData[] = [];

  if (candles.length < period) return result;

  for (let i = period - 1; i < candles.length; i++) {
    // Calculate SMA
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += candles[i - j].close;
    }
    const sma = sum / period;

    // Calculate Standard Deviation
    let squaredDiffSum = 0;
    for (let j = 0; j < period; j++) {
      squaredDiffSum += Math.pow(candles[i - j].close - sma, 2);
    }
    const std = Math.sqrt(squaredDiffSum / period);

    result.push({
      time: candles[i].time,
      upper: sma + stdDev * std,
      middle: sma,
      lower: sma - stdDev * std,
    });
  }

  return result;
}

// Footprint Chart Calculation
// Simulates footprint data from candle data since we don't have tick-level data
// In production, this would use actual trade tape data
export function calculateFootprint(candles: CandleData[], levelsPerCandle = 10): FootprintCandle[] {
  const result: FootprintCandle[] = [];

  for (const candle of candles) {
    const range = candle.high - candle.low;
    if (range === 0) continue;

    const priceStep = range / levelsPerCandle;
    const levels: FootprintLevel[] = [];

    const isBullish = candle.close >= candle.open;
    const bodyTop = Math.max(candle.open, candle.close);
    const bodyBottom = Math.min(candle.open, candle.close);

    let totalBidVol = 0;
    let totalAskVol = 0;
    let maxVolume = 0;
    let pocPrice = (candle.high + candle.low) / 2;

    for (let i = 0; i < levelsPerCandle; i++) {
      const levelPrice = candle.low + (i + 0.5) * priceStep;

      // Distribute volume based on position in candle
      // More volume near the body, less at wicks
      const isInBody = levelPrice >= bodyBottom && levelPrice <= bodyTop;
      const distanceFromCenter = Math.abs(levelPrice - (candle.high + candle.low) / 2) / (range / 2);

      // Base volume allocation
      let levelVolume = candle.volume / levelsPerCandle;

      // Increase volume in body area
      if (isInBody) {
        levelVolume *= 1.5;
      } else {
        levelVolume *= 0.5;
      }

      // Distribute between bid/ask based on candle direction and position
      let bidRatio: number;
      let askRatio: number;

      if (isBullish) {
        // Bullish candle: more buying pressure, especially at lower levels
        const positionFactor = (levelPrice - candle.low) / range;
        bidRatio = 0.35 + positionFactor * 0.15;
        askRatio = 0.65 - positionFactor * 0.15;
      } else {
        // Bearish candle: more selling pressure, especially at higher levels
        const positionFactor = (levelPrice - candle.low) / range;
        bidRatio = 0.65 - positionFactor * 0.15;
        askRatio = 0.35 + positionFactor * 0.15;
      }

      // Add some randomness for realism
      const noise = 0.9 + Math.random() * 0.2;
      const bidVolume = levelVolume * bidRatio * noise;
      const askVolume = levelVolume * askRatio * noise;
      const delta = askVolume - bidVolume;

      // Determine imbalance (3x threshold is common in footprint trading)
      let imbalance: 'bid' | 'ask' | 'neutral' = 'neutral';
      if (askVolume > bidVolume * 3) {
        imbalance = 'ask';
      } else if (bidVolume > askVolume * 3) {
        imbalance = 'bid';
      }

      const totalLevelVolume = bidVolume + askVolume;
      if (totalLevelVolume > maxVolume) {
        maxVolume = totalLevelVolume;
        pocPrice = levelPrice;
      }

      totalBidVol += bidVolume;
      totalAskVol += askVolume;

      levels.push({
        price: levelPrice,
        bidVolume,
        askVolume,
        delta,
        imbalance,
      });
    }

    result.push({
      time: candle.time,
      levels,
      totalBidVolume: totalBidVol,
      totalAskVolume: totalAskVol,
      totalDelta: totalAskVol - totalBidVol,
      pocPrice,
    });
  }

  return result;
}
