import type { CandleData, Symbol, HeatmapCell } from './types';

export function generateCandleData(count: number, basePrice = 77800): CandleData[] {
  const candles: CandleData[] = [];
  let currentPrice = basePrice;
  const now = Date.now();
  const interval = 5 * 60 * 1000; // 5 minutes

  for (let i = count - 1; i >= 0; i--) {
    const volatility = 0.002 + Math.random() * 0.003;
    const trend = (Math.random() - 0.48) * volatility;

    const open = currentPrice;
    const close = open * (1 + trend);
    const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
    const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);
    const volume = 10000 + Math.random() * 50000;

    candles.push({
      time: now - i * interval,
      open,
      high,
      low,
      close,
      volume,
    });

    currentPrice = close;
  }

  return candles;
}

export function generateHeatmapData(candles: CandleData[], priceLevels: number): HeatmapCell[][] {
  const heatmap: HeatmapCell[][] = [];

  if (candles.length === 0) return heatmap;

  const minPrice = Math.min(...candles.map(c => c.low)) * 0.998;
  const maxPrice = Math.max(...candles.map(c => c.high)) * 1.002;
  const priceStep = (maxPrice - minPrice) / priceLevels;

  for (let i = 0; i < candles.length; i++) {
    const column: HeatmapCell[] = [];
    const candle = candles[i];

    for (let j = 0; j < priceLevels; j++) {
      const price = minPrice + j * priceStep;
      const distanceFromPrice = Math.abs(price - (candle.open + candle.close) / 2);
      const normalized = 1 - distanceFromPrice / (maxPrice - minPrice);

      // Generate realistic order book depth
      let value = 0;
      const isBid = price < (candle.open + candle.close) / 2;

      if (isBid) {
        value = Math.pow(normalized, 2) * (5 + Math.random() * 25);
      } else {
        value = Math.pow(normalized, 2) * (5 + Math.random() * 30);
      }

      // Add some randomness for realistic look
      if (Math.random() > 0.7) {
        value *= 1.5 + Math.random();
      }

      column.push({
        x: i,
        y: j,
        value: Math.floor(value),
        time: candle.time,
        price,
      });
    }
    heatmap.push(column);
  }

  return heatmap;
}

export function generateVPVRData(candles: CandleData[], levels: number): { price: number; buyVolume: number; sellVolume: number }[] {
  if (candles.length === 0) return [];

  const minPrice = Math.min(...candles.map(c => c.low)) * 0.998;
  const maxPrice = Math.max(...candles.map(c => c.high)) * 1.002;
  const priceStep = (maxPrice - minPrice) / levels;

  const vpvr: { price: number; buyVolume: number; sellVolume: number }[] = [];

  for (let i = 0; i < levels; i++) {
    const price = minPrice + i * priceStep;

    // Calculate volume at this price level
    let buyVolume = 0;
    let sellVolume = 0;

    for (const candle of candles) {
      if (price >= candle.low && price <= candle.high) {
        const isBullish = candle.close > candle.open;
        const volumeAtLevel = candle.volume / ((candle.high - candle.low) / priceStep);

        if (isBullish) {
          buyVolume += volumeAtLevel * 0.6;
          sellVolume += volumeAtLevel * 0.4;
        } else {
          buyVolume += volumeAtLevel * 0.4;
          sellVolume += volumeAtLevel * 0.6;
        }
      }
    }

    vpvr.push({ price, buyVolume, sellVolume });
  }

  return vpvr;
}

export const EXCHANGES = [
  { id: 'binance', name: 'BINANCE', icon: 'https://ext.same-assets.com/644821230/763722988.png' },
  { id: 'binancef', name: 'BINANCEF', icon: 'https://ext.same-assets.com/644821230/763722988.png' },
  { id: 'coinbase', name: 'COINBASE', icon: '🔵' },
  { id: 'kraken', name: 'KRAKEN', icon: '🐙' },
  { id: 'okx', name: 'OKX', icon: '⚫' },
  { id: 'bybit', name: 'BYBIT', icon: '🟡' },
  { id: 'hyperliquid', name: 'HYPERLIQUID', icon: '💧' },
  { id: 'lighterf', name: 'LIGHTERF', icon: '⚡' },
];

export const SYMBOLS: Symbol[] = [
  { symbol: 'BTC/USD', base: 'BTC', quote: 'USD', exchange: 'binance', type: 'spot' },
  { symbol: 'ETH/USD', base: 'ETH', quote: 'USD', exchange: 'binance', type: 'spot' },
  { symbol: 'BTC/USDT', base: 'BTC', quote: 'USDT', exchange: 'binancef', type: 'futures_usd' },
  { symbol: 'ETH/USDT', base: 'ETH', quote: 'USDT', exchange: 'binancef', type: 'futures_usd' },
  { symbol: 'OG', base: 'OG', quote: 'USD', exchange: 'hyperliquid', type: 'futures_usd' },
  { symbol: '1000BONK', base: '1000BONK', quote: 'USDT', exchange: 'binancef', type: 'futures_usd' },
  { symbol: '1000PEPE', base: '1000PEPE', quote: 'USDT', exchange: 'binancef', type: 'futures_usd' },
  { symbol: '1INCH', base: '1INCH', quote: 'USD', exchange: 'coinbase', type: 'spot' },
  { symbol: '2Z', base: '2Z', quote: 'USD', exchange: 'lighterf', type: 'futures_usd' },
  { symbol: '2Z', base: '2Z', quote: 'USDT', exchange: 'bybit', type: 'futures_usd' },
  { symbol: '2Z', base: '2Z', quote: 'USDT', exchange: 'okx', type: 'futures_usd' },
  { symbol: '2Z', base: '2Z', quote: 'USDT', exchange: 'okx', type: 'spot' },
  { symbol: '2Z', base: '2Z', quote: 'USDT', exchange: 'binance', type: 'spot' },
  { symbol: '2Z', base: '2Z', quote: 'USD', exchange: 'kraken', type: 'spot' },
  { symbol: 'SOL/USD', base: 'SOL', quote: 'USD', exchange: 'binance', type: 'spot' },
  { symbol: 'DOGE/USDT', base: 'DOGE', quote: 'USDT', exchange: 'binancef', type: 'futures_usd' },
  { symbol: 'XRP/USD', base: 'XRP', quote: 'USD', exchange: 'coinbase', type: 'spot' },
  { symbol: 'ADA/USDT', base: 'ADA', quote: 'USDT', exchange: 'binancef', type: 'futures_usd' },
  { symbol: 'AVAX/USD', base: 'AVAX', quote: 'USD', exchange: 'kraken', type: 'spot' },
  { symbol: 'LINK/USDT', base: 'LINK', quote: 'USDT', exchange: 'binancef', type: 'futures_usd' },
];

export const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'] as const;
