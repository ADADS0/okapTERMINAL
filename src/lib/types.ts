export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBookLevel {
  price: number;
  volume: number;
  side: 'bid' | 'ask';
}

export interface HeatmapCell {
  x: number;
  y: number;
  value: number;
  time: number;
  price: number;
}

export interface Symbol {
  symbol: string;
  base: string;
  quote: string;
  exchange: string;
  type: 'spot' | 'futures_usd' | 'futures_coin';
  logo?: string;
}

export type TimeFrame = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

export interface ChartSettings {
  symbol: string;
  timeframe: TimeFrame;
  showHeatmap: boolean;
  showVPVR: boolean;
  showVolume: boolean;
}

// Drawing types for chart annotations
export type DrawingType =
  | 'trendline'
  | 'horizontal'
  | 'vertical'
  | 'rectangle'
  | 'circle'
  | 'fibonacci'
  | 'text';

export interface DrawingPoint {
  time: number;
  price: number;
}

export interface ChartDrawing {
  id: string;
  type: DrawingType;
  points: DrawingPoint[];
  color: string;
  lineWidth: number;
  text?: string;
  createdAt: number;
}

// Indicator configuration
export type IndicatorType = 'sma' | 'ema' | 'rsi' | 'macd' | 'bollinger';

export interface IndicatorConfig {
  type: IndicatorType;
  enabled: boolean;
  period?: number;
  color?: string;
  params?: Record<string, number>;
}

// Active indicators state
export interface ActiveIndicators {
  sma: { enabled: boolean; period: number; color: string };
  ema: { enabled: boolean; period: number; color: string };
  rsi: { enabled: boolean; period: number };
  macd: { enabled: boolean; fastPeriod: number; slowPeriod: number; signalPeriod: number };
  bollinger: { enabled: boolean; period: number; stdDev: number };
  vwap: { enabled: boolean; showBands: boolean; color: string };
  cvd: { enabled: boolean; color: string };
}

// Footprint Chart Data
export interface FootprintLevel {
  price: number;
  bidVolume: number;
  askVolume: number;
  delta: number; // askVolume - bidVolume
  imbalance: 'bid' | 'ask' | 'neutral'; // Which side has 3x more volume
}

export interface FootprintCandle {
  time: number;
  levels: FootprintLevel[];
  totalBidVolume: number;
  totalAskVolume: number;
  totalDelta: number;
  pocPrice: number; // Point of Control - price with highest volume
}
