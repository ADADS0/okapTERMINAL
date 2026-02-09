"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { OrderBookUpdate } from '@/lib/binance';
import { BinanceWebSocket, fetchKlines, toBinanceInterval } from '@/lib/binance';
import type { CandleData, TimeFrame } from '@/lib/types';
import { Settings, X } from 'lucide-react';
import { HeatmapSettingsModal, defaultHeatmapSettings, type HeatmapSettings } from './HeatmapSettingsModal';

interface HeatmapWidgetProps {
  symbol?: string;
  onClose?: () => void;
}

interface OrderLevel {
  price: number;
  quantity: number;
}

interface HeatmapRow {
  timestamp: number;
  bids: OrderLevel[];
  asks: OrderLevel[];
}

interface TradeData {
  size: number;
  price: number;
  time: string;
  isBuyer: boolean;
}

type ColorScale = 'linear' | 'log2';
type HeatmapTheme = 'rb' | 'bw';

const SYMBOLS = [
  { value: 'ETH/USDT', label: 'ETH/USDT' },
  { value: 'BTC/USDT', label: 'BTC/USDT' },
  { value: 'ADA/USDT', label: 'ADA/USDT' },
  { value: 'LTC/USDT', label: 'LTC/USDT' },
  { value: 'XRP/USDT', label: 'XRP/USDT' },
  { value: 'LINK/USDT', label: 'LINK/USDT' },
  { value: 'SOL/USDT', label: 'SOL/USDT' },
];

const UPDATE_INTERVALS = [
  { value: 100, label: '100ms' },
  { value: 250, label: '250ms' },
  { value: 500, label: '500ms' },
  { value: 1000, label: '1s' },
];

const HEATMAP_SIZES = [
  { value: 1000, label: '1000 periods' },
  { value: 500, label: '500 periods' },
  { value: 250, label: '250 periods' },
  { value: 100, label: '100 periods' },
  { value: 50, label: '50 periods' },
];

const LEVELS = [
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 30, label: '30' },
  { value: 40, label: '40' },
];

// Colormap definitions for viridis-style colormaps
const COLORMAPS: Record<string, string[]> = {
  viridis: ['#440154', '#414487', '#2a788e', '#22a884', '#7ad151', '#fde725'],
  plasma: ['#0d0887', '#6a00a8', '#b12a90', '#e16462', '#fca636', '#f0f921'],
  magma: ['#000004', '#3b0f70', '#8c2981', '#de4968', '#fe9f6d', '#fcfdbf'],
  inferno: ['#000004', '#420a68', '#932667', '#dd513a', '#fca50a', '#fcffa4'],
  cividis: ['#002051', '#323e6e', '#5f7081', '#7a7b78', '#a59b6c', '#fdea45'],
  turbo: ['#30123b', '#4777ef', '#1bd0d5', '#62fc6b', '#d2e935', '#fa9e3b', '#d23105', '#7a0403'],
  jet: ['#00007f', '#0000ff', '#00ffff', '#ffff00', '#ff0000', '#7f0000'],
  'cool-warm': ['#3b4cc0', '#7b9ff9', '#c9d7f0', '#f7f7f7', '#f5c4c1', '#e47872', '#b40426'],
  ocean: ['#00171f', '#003459', '#007ea7', '#00a8e8', '#9effff'],
  fire: ['#1a0000', '#4a0000', '#8b0000', '#ff4500', '#ffa500', '#ffff00'],
};

export function HeatmapWidget({ symbol: initialSymbol = 'LTC/USDT', onClose }: HeatmapWidgetProps) {
  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol);
  const [updateInterval, setUpdateInterval] = useState(500);
  const [maxHeatmapSize, setMaxHeatmapSize] = useState(100);
  const [levels, setLevels] = useState(20);
  const [colorScale, setColorScale] = useState<ColorScale>('linear');
  const [theme, setTheme] = useState<HeatmapTheme>('rb');

  // Heatmap settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [heatmapSettings, setHeatmapSettings] = useState<HeatmapSettings>(defaultHeatmapSettings);

  const [heatmapData, setHeatmapData] = useState<HeatmapRow[]>([]);
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [orderBook, setOrderBook] = useState<OrderBookUpdate | null>(null);
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const heatmapCanvasRef = useRef<HTMLCanvasElement>(null);
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  const barChartCanvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<BinanceWebSocket | null>(null);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Update dimensions
  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  // Get colormap colors based on settings
  const getColormapColors = useCallback((colormap: string): string[] => {
    return COLORMAPS[colormap] || COLORMAPS.viridis;
  }, []);

  // Interpolate color from colormap
  const interpolateColormap = useCallback((intensity: number, colormap: string): string => {
    const colors = getColormapColors(colormap);
    const clampedIntensity = Math.max(0, Math.min(1, intensity));

    // Apply intensity range from settings
    const adjustedIntensity = (clampedIntensity - heatmapSettings.intensityMin / 100) /
      ((heatmapSettings.intensityMax - heatmapSettings.intensityMin) / 100);
    const finalIntensity = Math.max(0, Math.min(1, adjustedIntensity));

    const index = finalIntensity * (colors.length - 1);
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.ceil(index);
    const fraction = index - lowerIndex;

    if (lowerIndex === upperIndex) {
      return colors[lowerIndex];
    }

    // Parse hex colors and interpolate
    const lowerColor = colors[lowerIndex];
    const upperColor = colors[upperIndex];

    const lr = parseInt(lowerColor.slice(1, 3), 16);
    const lg = parseInt(lowerColor.slice(3, 5), 16);
    const lb = parseInt(lowerColor.slice(5, 7), 16);

    const ur = parseInt(upperColor.slice(1, 3), 16);
    const ug = parseInt(upperColor.slice(3, 5), 16);
    const ub = parseInt(upperColor.slice(5, 7), 16);

    const r = Math.round(lr + (ur - lr) * fraction);
    const g = Math.round(lg + (ug - lg) * fraction);
    const b = Math.round(lb + (ub - lb) * fraction);

    return `rgba(${r}, ${g}, ${b}, ${0.4 + finalIntensity * 0.6})`;
  }, [getColormapColors, heatmapSettings.intensityMin, heatmapSettings.intensityMax]);

  // Color functions based on theme and settings
  const getHeatmapColor = useCallback((intensity: number, isBid: boolean): string => {
    const clampedIntensity = Math.max(0, Math.min(1, intensity));

    // Use colormap from settings if style is 'hd'
    if (heatmapSettings.style === 'hd') {
      return interpolateColormap(clampedIntensity, heatmapSettings.colormap);
    }

    // Classic theme (using local theme state)
    if (theme === 'bw') {
      const value = Math.floor(clampedIntensity * 255);
      return `rgba(${value}, ${value}, ${value}, ${0.3 + clampedIntensity * 0.7})`;
    }

    // Red & Blue theme (matching order-book-heatmap)
    if (isBid) {
      // Blue for bids
      const r = Math.floor(10 + clampedIntensity * 40);
      const g = Math.floor(25 + clampedIntensity * 100);
      const b = Math.floor(80 + clampedIntensity * 175);
      return `rgba(${r}, ${g}, ${b}, ${0.4 + clampedIntensity * 0.6})`;
    }
    // Red for asks
    const r = Math.floor(80 + clampedIntensity * 175);
    const g = Math.floor(10 + clampedIntensity * 40);
    const b = Math.floor(25 + clampedIntensity * 50);
    return `rgba(${r}, ${g}, ${b}, ${0.4 + clampedIntensity * 0.6})`;
  }, [theme, heatmapSettings.style, heatmapSettings.colormap, interpolateColormap]);

  // Scale value based on color scale setting
  const scaleValue = useCallback((value: number, maxValue: number): number => {
    if (maxValue === 0) return 0;
    if (colorScale === 'log2') {
      return Math.log2(value + 1) / Math.log2(maxValue + 1);
    }
    return value / maxValue;
  }, [colorScale]);

  // Initialize WebSocket and fetch initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const klines = await fetchKlines(selectedSymbol, '1m', 100);
        if (klines.length > 0) {
          setCandles(klines);
          setCurrentPrice(klines[klines.length - 1].close);
        }
      } catch (error) {
        console.error('Failed to fetch klines:', error);
      }
    };

    loadData();

    // Disconnect existing WebSocket
    if (wsRef.current) {
      wsRef.current.disconnect();
    }

    wsRef.current = new BinanceWebSocket(selectedSymbol, '1m', {
      onPrice: (price) => setCurrentPrice(price),
      onKline: (kline, isClosed) => {
        setCandles((prev) => {
          if (prev.length === 0) return [kline];
          const newCandles = [...prev];
          if (isClosed) {
            newCandles.push(kline);
            if (newCandles.length > 100) newCandles.shift();
          } else {
            newCandles[newCandles.length - 1] = kline;
          }
          return newCandles;
        });
      },
      onOrderBook: (update) => {
        setOrderBook(update);
        // Convert tuples to objects and add to heatmap data
        const row: HeatmapRow = {
          timestamp: Date.now(),
          bids: update.bids.slice(0, levels).map(([price, quantity]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity),
          })),
          asks: update.asks.slice(0, levels).map(([price, quantity]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity),
          })),
        };
        setHeatmapData((prev) => {
          const newData = [...prev, row];
          if (newData.length > maxHeatmapSize) {
            newData.shift();
          }
          return newData;
        });
      },
      onConnect: () => setIsConnected(true),
      onDisconnect: () => setIsConnected(false),
      onError: (error) => console.error('WebSocket error:', error),
    });

    wsRef.current.connect();

    const ws = wsRef.current;
    const timer = updateTimerRef.current;

    return () => {
      if (ws) {
        ws.disconnect();
      }
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [selectedSymbol, levels, maxHeatmapSize]);

  // Draw Heatmap
  useEffect(() => {
    const canvas = heatmapCanvasRef.current;
    if (!canvas || heatmapData.length === 0 || !orderBook) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement?.clientWidth || 400;
    const height = canvas.parentElement?.clientHeight || 300;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    if (heatmapData.length === 0) return;

    // Calculate price range
    let minPrice = Number.POSITIVE_INFINITY;
    let maxPrice = Number.NEGATIVE_INFINITY;
    let maxQuantity = 0;

    for (const row of heatmapData) {
      for (const bid of row.bids) {
        minPrice = Math.min(minPrice, bid.price);
        maxPrice = Math.max(maxPrice, bid.price);
        maxQuantity = Math.max(maxQuantity, bid.quantity);
      }
      for (const ask of row.asks) {
        minPrice = Math.min(minPrice, ask.price);
        maxPrice = Math.max(maxPrice, ask.price);
        maxQuantity = Math.max(maxQuantity, ask.quantity);
      }
    }

    if (minPrice === Number.POSITIVE_INFINITY) return;

    // Extend heatmap range if setting is enabled
    const priceRange = maxPrice - minPrice;
    const extendedRange = heatmapSettings.extendHeatmap ? priceRange * 1.2 : priceRange;
    const extendedMin = heatmapSettings.extendHeatmap ? minPrice - priceRange * 0.1 : minPrice;
    const extendedMax = heatmapSettings.extendHeatmap ? maxPrice + priceRange * 0.1 : maxPrice;

    const cellWidth = width / heatmapData.length;
    const padding = { top: 10, bottom: 20, left: 50, right: 10 };
    const chartHeight = height - padding.top - padding.bottom;

    // Draw heatmap cells
    const cellHeight = heatmapSettings.style === 'hd' ? 6 : 4;

    for (let i = 0; i < heatmapData.length; i++) {
      const row = heatmapData[i];
      const x = padding.left + i * cellWidth;

      // Draw bids (blue)
      for (const bid of row.bids) {
        const y = padding.top + ((extendedMax - bid.price) / extendedRange) * chartHeight;
        const intensity = scaleValue(bid.quantity, maxQuantity);
        ctx.fillStyle = getHeatmapColor(intensity, true);
        ctx.fillRect(x, y - cellHeight / 2, cellWidth, cellHeight);
      }

      // Draw asks (red)
      for (const ask of row.asks) {
        const y = padding.top + ((extendedMax - ask.price) / extendedRange) * chartHeight;
        const intensity = scaleValue(ask.quantity, maxQuantity);
        ctx.fillStyle = getHeatmapColor(intensity, false);
        ctx.fillRect(x, y - cellHeight / 2, cellWidth, cellHeight);
      }
    }

    // Draw current price line
    if (currentPrice > 0 && currentPrice >= extendedMin && currentPrice <= extendedMax) {
      const priceY = padding.top + ((extendedMax - currentPrice) / extendedRange) * chartHeight;

      // Draw yellow circle marker (like in order-book-heatmap)
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(width - padding.right - 20, priceY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw price axis
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    const priceSteps = 8;
    for (let i = 0; i <= priceSteps; i++) {
      const price = extendedMax - (extendedRange / priceSteps) * i;
      const y = padding.top + (chartHeight / priceSteps) * i;
      ctx.fillText(price.toFixed(2), padding.left - 5, y + 3);
    }

    // Draw time axis
    ctx.textAlign = 'center';
    const timeSteps = Math.min(10, heatmapData.length);
    for (let i = 0; i < timeSteps; i++) {
      const idx = Math.floor((i / timeSteps) * heatmapData.length);
      if (heatmapData[idx]) {
        const x = padding.left + idx * cellWidth;
        const date = new Date(heatmapData[idx].timestamp);
        const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
        ctx.fillText(timeStr, x, height - 5);
      }
    }

  }, [heatmapData, orderBook, currentPrice, getHeatmapColor, scaleValue, heatmapSettings.extendHeatmap, heatmapSettings.style]);

  // Draw Candlestick Chart
  useEffect(() => {
    const canvas = chartCanvasRef.current;
    if (!canvas || candles.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement?.clientWidth || 300;
    const height = canvas.parentElement?.clientHeight || 200;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    const padding = { top: 10, bottom: 20, left: 10, right: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const minPrice = Math.min(...candles.map(c => c.low)) * 0.999;
    const maxPrice = Math.max(...candles.map(c => c.high)) * 1.001;
    const priceRange = maxPrice - minPrice;

    const candleWidth = chartWidth / candles.length;

    // Draw candles
    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      const x = padding.left + i * candleWidth + candleWidth / 2;

      const openY = padding.top + ((maxPrice - candle.open) / priceRange) * chartHeight;
      const closeY = padding.top + ((maxPrice - candle.close) / priceRange) * chartHeight;
      const highY = padding.top + ((maxPrice - candle.high) / priceRange) * chartHeight;
      const lowY = padding.top + ((maxPrice - candle.low) / priceRange) * chartHeight;

      const isBullish = candle.close >= candle.open;
      const color = isBullish ? '#26a69a' : '#ef5350';

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body
      ctx.fillStyle = color;
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.abs(closeY - openY) || 1;
      ctx.fillRect(x - candleWidth * 0.35, bodyTop, candleWidth * 0.7, bodyHeight);
    }

    // Price axis
    ctx.fillStyle = '#888';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const price = maxPrice - (priceRange / 5) * i;
      const y = padding.top + (chartHeight / 5) * i;
      ctx.fillText(price.toFixed(2), width - 5, y + 3);
    }

  }, [candles]);

  // Draw Bar Chart (Order Book Depth)
  useEffect(() => {
    const canvas = barChartCanvasRef.current;
    if (!canvas || !orderBook) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement?.clientWidth || 200;
    const height = canvas.parentElement?.clientHeight || 300;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    const padding = { top: 10, bottom: 20, left: 5, right: 5 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Convert tuples to objects
    const bidsData = orderBook.bids.map(([p, q]) => ({ price: parseFloat(p), quantity: parseFloat(q) }));
    const asksData = orderBook.asks.map(([p, q]) => ({ price: parseFloat(p), quantity: parseFloat(q) }));

    // Get all prices and quantities
    const allLevels = [...bidsData, ...asksData].slice(0, levels * 2);
    if (allLevels.length === 0) return;

    const minPrice = Math.min(...allLevels.map(l => l.price));
    const maxPrice = Math.max(...allLevels.map(l => l.price));
    const maxQty = Math.max(...allLevels.map(l => l.quantity));
    const priceRange = maxPrice - minPrice;

    const barWidth = chartWidth / (levels * 2);

    // Draw bids (blue bars from bottom)
    const sortedBids = [...bidsData].sort((a, b) => b.price - a.price).slice(0, levels);
    const sortedAsks = [...asksData].sort((a, b) => a.price - b.price).slice(0, levels);

    for (let i = 0; i < sortedBids.length; i++) {
      const bid = sortedBids[i];
      const barHeight = (bid.quantity / maxQty) * chartHeight * 0.9;
      const x = padding.left + (levels - 1 - i) * barWidth;

      // Blue bar for bid
      ctx.fillStyle = theme === 'rb' ? '#0066cc' : '#666';
      ctx.fillRect(x, chartHeight + padding.top - barHeight, barWidth - 1, barHeight);
    }

    for (let i = 0; i < sortedAsks.length; i++) {
      const ask = sortedAsks[i];
      const barHeight = (ask.quantity / maxQty) * chartHeight * 0.9;
      const x = padding.left + (levels + i) * barWidth;

      // Red bar for ask
      ctx.fillStyle = theme === 'rb' ? '#cc0033' : '#888';
      ctx.fillRect(x, chartHeight + padding.top - barHeight, barWidth - 1, barHeight);
    }

    // Draw price labels
    ctx.fillStyle = '#888';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';

    if (sortedBids[sortedBids.length - 1]) {
      ctx.fillText(sortedBids[sortedBids.length - 1].price.toFixed(2), padding.left + 20, height - 5);
    }
    if (sortedAsks[sortedAsks.length - 1]) {
      ctx.fillText(sortedAsks[sortedAsks.length - 1].price.toFixed(2), width - padding.right - 20, height - 5);
    }

  }, [orderBook, levels, theme]);

  return (
    <div className="w-full h-full flex flex-col bg-[#040404] text-[#d4d4d4] font-mono text-sm overflow-hidden">
      {/* Controls Header - matching order-book-heatmap style */}
      <div className="flex flex-wrap items-end gap-4 px-4 py-3 bg-[#0a0a0a] border-b border-[#1c1c1c]">
        {/* Symbol */}
        <div className="flex flex-col gap-1">
          <label className="text-[#7c7c7c] text-[11px]">symbol</label>
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="bg-[#242424] text-[#d4d4d4] border border-[#3c3c3c] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#575757] cursor-pointer"
          >
            {SYMBOLS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Update Interval */}
        <div className="flex flex-col gap-1">
          <label className="text-[#7c7c7c] text-[11px]">update every</label>
          <select
            value={updateInterval}
            onChange={(e) => setUpdateInterval(Number(e.target.value))}
            className="bg-[#242424] text-[#d4d4d4] border border-[#3c3c3c] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#575757] cursor-pointer"
          >
            {UPDATE_INTERVALS.map((i) => (
              <option key={i.value} value={i.value}>{i.label}</option>
            ))}
          </select>
        </div>

        {/* Max Heatmap Size */}
        <div className="flex flex-col gap-1">
          <label className="text-[#7c7c7c] text-[11px]">max heatmap size</label>
          <select
            value={maxHeatmapSize}
            onChange={(e) => setMaxHeatmapSize(Number(e.target.value))}
            className="bg-[#242424] text-[#d4d4d4] border border-[#3c3c3c] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#575757] cursor-pointer"
          >
            {HEATMAP_SIZES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Bid/Ask Levels */}
        <div className="flex flex-col gap-1">
          <label className="text-[#7c7c7c] text-[11px]">bid/ask levels</label>
          <select
            value={levels}
            onChange={(e) => setLevels(Number(e.target.value))}
            className="bg-[#242424] text-[#d4d4d4] border border-[#3c3c3c] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#575757] cursor-pointer"
          >
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>

        {/* Color Scale */}
        <div className="flex flex-col gap-1">
          <label className="text-[#7c7c7c] text-[11px]">color scale</label>
          <select
            value={colorScale}
            onChange={(e) => setColorScale(e.target.value as ColorScale)}
            className="bg-[#242424] text-[#d4d4d4] border border-[#3c3c3c] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#575757] cursor-pointer"
          >
            <option value="linear">linear</option>
            <option value="log2">log2</option>
          </select>
        </div>

        {/* Heatmap Theme */}
        <div className="flex flex-col gap-1">
          <label className="text-[#7c7c7c] text-[11px]">heatmap theme</label>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as HeatmapTheme)}
            className="bg-[#242424] text-[#d4d4d4] border border-[#3c3c3c] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#575757] cursor-pointer"
          >
            <option value="rb">red & blue</option>
            <option value="bw">black & white</option>
          </select>
        </div>

        {/* Advanced Settings Button */}
        <button
          type="button"
          onClick={() => setShowSettingsModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 rounded text-xs transition-colors border border-cyan-600/40"
        >
          <Settings className="w-3.5 h-3.5" />
          Advanced
        </button>

        {/* Connection Status */}
        <div className="ml-auto flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-[11px] text-[#7c7c7c]">{isConnected ? 'Live' : 'Disconnected'}</span>
          {currentPrice > 0 && (
            <span className="text-[#ffd700] font-bold">${currentPrice.toFixed(2)}</span>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Colormap Preview Bar when HD mode is active */}
      {heatmapSettings.style === 'hd' && (
        <div className="px-4 py-1.5 bg-[#0a0a0a] border-b border-[#1c1c1c] flex items-center gap-2">
          <span className="text-[10px] text-[#7c7c7c]">Colormap:</span>
          <div
            className="h-3 w-32 rounded"
            style={{
              background: `linear-gradient(to right, ${getColormapColors(heatmapSettings.colormap).join(', ')})`,
            }}
          />
          <span className="text-[10px] text-cyan-400">{heatmapSettings.colormap}</span>
        </div>
      )}

      {/* Main Content */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden">
        {/* Left: Heatmap + Candle Chart */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Heatmap */}
          <div className="flex-1 min-h-0 relative">
            <canvas
              ref={heatmapCanvasRef}
              className="absolute inset-0 w-full h-full"
            />
          </div>

          {/* Candle Chart (mini) */}
          <div className="h-32 border-t border-[#1c1c1c] relative">
            <canvas
              ref={chartCanvasRef}
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </div>

        {/* Right Side: Time & Sales + Bar Chart */}
        <div className="w-48 flex flex-col border-l border-[#1c1c1c]">
          {/* Time & Sales Log */}
          <div className="flex-1 overflow-hidden">
            <div className="sticky top-0 bg-[#0a0a0a] border-b border-[#1c1c1c] px-2 py-1">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-[#7c7c7c]">
                    <th className="text-left font-normal">Size</th>
                    <th className="text-left font-normal">Price</th>
                    <th className="text-left font-normal">Time</th>
                  </tr>
                </thead>
              </table>
            </div>
            <div className="overflow-auto h-40">
              <table className="w-full text-[10px]">
                <tbody>
                  {orderBook && orderBook.bids.slice(0, 15).map(([price, quantity], i) => (
                    <tr key={`bid-${price}-${i}`} className="text-cyan-400">
                      <td className="px-2 py-0.5">{parseFloat(quantity).toFixed(4)}</td>
                      <td className="px-2 py-0.5">{parseFloat(price).toFixed(2)}</td>
                      <td className="px-2 py-0.5">{new Date().toLocaleTimeString()}</td>
                    </tr>
                  ))}
                  {orderBook && orderBook.asks.slice(0, 15).map(([price, quantity], i) => (
                    <tr key={`ask-${price}-${i}`} className="text-red-400">
                      <td className="px-2 py-0.5">{parseFloat(quantity).toFixed(4)}</td>
                      <td className="px-2 py-0.5">{parseFloat(price).toFixed(2)}</td>
                      <td className="px-2 py-0.5">{new Date().toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bar Chart (Order Book Depth) */}
          <div className="h-48 border-t border-[#1c1c1c] relative">
            <canvas
              ref={barChartCanvasRef}
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </div>
      </div>

      {/* Heatmap Settings Modal */}
      <HeatmapSettingsModal
        open={showSettingsModal}
        onOpenChange={setShowSettingsModal}
        settings={heatmapSettings}
        onSettingsChange={setHeatmapSettings}
      />
    </div>
  );
}
