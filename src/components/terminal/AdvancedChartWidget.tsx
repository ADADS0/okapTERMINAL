"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { BinanceWebSocket, fetchKlines, toBinanceInterval, type OrderBookUpdate } from '@/lib/binance';
import type { CandleData, TimeFrame } from '@/lib/types';
import { calculateSMA, calculateEMA, calculateVWAP, calculateBollingerBands } from '@/lib/indicators';
import { generateHeatmapData } from '@/lib/data';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  LineChart,
  CandlestickChart,
  AreaChart,
  Activity,
  Maximize2,
  Settings2,
  RefreshCw,
  Download,
  Layers,
  Eye,
  EyeOff,
  Grid3X3,
  Crosshair
} from 'lucide-react';

interface AdvancedChartWidgetProps {
  symbol?: string;
  onClose?: () => void;
  defaultTimeframe?: TimeFrame;
}

type ChartType = 'candle' | 'line' | 'area' | 'bar' | 'heikinAshi';

interface ChartIndicator {
  id: string;
  name: string;
  enabled: boolean;
  color: string;
  type: 'overlay' | 'oscillator';
}

const SYMBOLS = [
  { value: 'BTC/USDT', label: 'BTC/USDT', icon: '₿' },
  { value: 'ETH/USDT', label: 'ETH/USDT', icon: 'Ξ' },
  { value: 'SOL/USDT', label: 'SOL/USDT', icon: '◎' },
  { value: 'BNB/USDT', label: 'BNB/USDT', icon: '◇' },
  { value: 'XRP/USDT', label: 'XRP/USDT', icon: '✕' },
  { value: 'ADA/USDT', label: 'ADA/USDT', icon: '₳' },
  { value: 'DOGE/USDT', label: 'DOGE/USDT', icon: 'Ð' },
  { value: 'LINK/USDT', label: 'LINK/USDT', icon: '⬡' },
];

const TIMEFRAMES: { value: TimeFrame; label: string }[] = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '30m', label: '30m' },
  { value: '1h', label: '1H' },
  { value: '4h', label: '4H' },
  { value: '1d', label: '1D' },
];

const CHART_TYPES: { value: ChartType; label: string; icon: React.ReactNode }[] = [
  { value: 'candle', label: 'Candles', icon: <CandlestickChart className="w-4 h-4" /> },
  { value: 'line', label: 'Line', icon: <LineChart className="w-4 h-4" /> },
  { value: 'area', label: 'Area', icon: <AreaChart className="w-4 h-4" /> },
  { value: 'bar', label: 'OHLC', icon: <BarChart3 className="w-4 h-4" /> },
  { value: 'heikinAshi', label: 'Heikin Ashi', icon: <Activity className="w-4 h-4" /> },
];

const DEFAULT_INDICATORS: ChartIndicator[] = [
  { id: 'sma20', name: 'SMA 20', enabled: true, color: '#f59e0b', type: 'overlay' },
  { id: 'sma50', name: 'SMA 50', enabled: false, color: '#8b5cf6', type: 'overlay' },
  { id: 'ema12', name: 'EMA 12', enabled: false, color: '#10b981', type: 'overlay' },
  { id: 'ema26', name: 'EMA 26', enabled: false, color: '#ef4444', type: 'overlay' },
  { id: 'vwap', name: 'VWAP', enabled: true, color: '#06b6d4', type: 'overlay' },
  { id: 'bollinger', name: 'Bollinger', enabled: false, color: '#6366f1', type: 'overlay' },
];

// Convert candles to Heikin Ashi
function toHeikinAshi(candles: CandleData[]): CandleData[] {
  if (candles.length === 0) return [];

  const ha: CandleData[] = [];

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const prevHa = ha[i - 1];

    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen = prevHa ? (prevHa.open + prevHa.close) / 2 : (c.open + c.close) / 2;
    const haHigh = Math.max(c.high, haOpen, haClose);
    const haLow = Math.min(c.low, haOpen, haClose);

    ha.push({
      time: c.time,
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose,
      volume: c.volume,
    });
  }

  return ha;
}

export function AdvancedChartWidget({
  symbol: initialSymbol = 'BTC/USDT',
  onClose,
  defaultTimeframe = '5m'
}: AdvancedChartWidgetProps) {
  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol);
  const [timeframe, setTimeframe] = useState<TimeFrame>(defaultTimeframe);
  const [chartType, setChartType] = useState<ChartType>('candle');
  const [indicators, setIndicators] = useState<ChartIndicator[]>(DEFAULT_INDICATORS);
  const [showGrid, setShowGrid] = useState(true);
  const [showCrosshair, setShowCrosshair] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showVolume, setShowVolume] = useState(true);

  const [candles, setCandles] = useState<CandleData[]>([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);
  const [priceChangePercent, setPriceChangePercent] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number; price: number; time: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const volumeCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<BinanceWebSocket | null>(null);
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

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const klines = await fetchKlines(selectedSymbol, timeframe, 200);
        if (klines.length > 0) {
          setCandles(klines);
          setCurrentPrice(klines[klines.length - 1].close);

          const firstPrice = klines[0].open;
          const lastPrice = klines[klines.length - 1].close;
          setPriceChange(lastPrice - firstPrice);
          setPriceChangePercent(((lastPrice - firstPrice) / firstPrice) * 100);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // WebSocket connection
    if (wsRef.current) {
      wsRef.current.disconnect();
    }

    wsRef.current = new BinanceWebSocket(selectedSymbol, toBinanceInterval(timeframe), {
      onPrice: (price) => setCurrentPrice(price),
      onKline: (kline, isClosed) => {
        setCandles((prev) => {
          if (prev.length === 0) return [kline];
          const newCandles = [...prev];
          if (isClosed) {
            newCandles.push(kline);
            if (newCandles.length > 200) newCandles.shift();
          } else {
            newCandles[newCandles.length - 1] = kline;
          }
          return newCandles;
        });
      },
      onConnect: () => setIsConnected(true),
      onDisconnect: () => setIsConnected(false),
      onError: (error) => console.error('WebSocket error:', error),
    });

    wsRef.current.connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect();
      }
    };
  }, [selectedSymbol, timeframe]);

  // Toggle indicator
  const toggleIndicator = (id: string) => {
    setIndicators((prev) =>
      prev.map((ind) => ind.id === id ? { ...ind, enabled: !ind.enabled } : ind)
    );
  };

  // Handle wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoomLevel((prev) => Math.max(0.5, Math.min(5, prev * delta)));
  }, []);

  // Handle mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart(e.clientX - panOffset);
    }
  }, [panOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDragging) {
      setPanOffset(e.clientX - dragStart);
      return;
    }

    if (showCrosshair && candles.length > 0) {
      const padding = { top: 20, right: 60, bottom: 30, left: 10 };
      const chartWidth = (dimensions.width - padding.left - padding.right) * zoomLevel;
      const chartHeight = dimensions.height - padding.top - padding.bottom;

      const minPrice = Math.min(...candles.map(c => c.low)) * 0.998;
      const maxPrice = Math.max(...candles.map(c => c.high)) * 1.002;
      const priceRange = maxPrice - minPrice;
      const candleSpacing = chartWidth / candles.length;

      const adjustedX = (mouseX - padding.left - panOffset) / zoomLevel;
      const candleIndex = Math.floor(adjustedX / (candleSpacing / zoomLevel));
      const price = maxPrice - ((mouseY - padding.top) / chartHeight) * priceRange;

      if (candleIndex >= 0 && candleIndex < candles.length && price >= minPrice && price <= maxPrice) {
        setCrosshairPos({
          x: mouseX,
          y: mouseY,
          price,
          time: candles[candleIndex].time,
        });
      }
    }
  }, [isDragging, dragStart, showCrosshair, candles, dimensions, zoomLevel, panOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    setCrosshairPos(null);
  }, []);

  const handleDoubleClick = useCallback(() => {
    setZoomLevel(1);
    setPanOffset(0);
  }, []);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0 || dimensions.width === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = (dimensions.height - 60) * dpr; // Reserve space for volume
    ctx.scale(dpr, dpr);

    const padding = { top: 20, right: 60, bottom: 30, left: 10 };
    const chartWidth = (dimensions.width - padding.left - padding.right) * zoomLevel;
    const chartHeight = dimensions.height - 60 - padding.top - padding.bottom;

    // Use appropriate candle data
    const displayCandles = chartType === 'heikinAshi' ? toHeikinAshi(candles) : candles;

    const minPrice = Math.min(...displayCandles.map(c => c.low)) * 0.998;
    const maxPrice = Math.max(...displayCandles.map(c => c.high)) * 1.002;
    const priceRange = maxPrice - minPrice;

    const priceToY = (price: number) =>
      padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight;

    const candleSpacing = chartWidth / displayCandles.length;

    // Background
    ctx.fillStyle = '#0c0c0e';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height - 60);

    ctx.save();
    ctx.translate(panOffset, 0);

    // Grid
    if (showGrid) {
      ctx.strokeStyle = '#1a1a1f';
      ctx.lineWidth = 1;
      const gridLines = 8;
      for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + (chartHeight / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left - panOffset, y);
        ctx.lineTo(dimensions.width - padding.right, y);
        ctx.stroke();
      }
    }

    // Generate heatmap if enabled
    if (showHeatmap) {
      const heatmap = generateHeatmapData(displayCandles, 20);
      let maxValue = 0;
      for (const col of heatmap) {
        for (const cell of col) {
          if (cell.value > maxValue) maxValue = cell.value;
        }
      }

      const levels = heatmap[0]?.length || 20;
      const cellHeight = chartHeight / levels;

      for (let i = 0; i < heatmap.length; i++) {
        for (let j = 0; j < (heatmap[i]?.length || 0); j++) {
          const cell = heatmap[i][j];
          const x = padding.left + i * candleSpacing;
          const y = padding.top + chartHeight - (j + 1) * cellHeight;

          if (cell.value === 0) continue;

          const midPrice = (displayCandles[i].open + displayCandles[i].close) / 2;
          const isBid = cell.price < midPrice;
          const logValue = Math.log(cell.value + 1);
          const logMax = Math.log(maxValue + 1);
          const intensity = logMax > 0 ? logValue / logMax : 0;

          if (isBid) {
            ctx.fillStyle = `rgba(30, 100, 180, ${intensity * 0.5})`;
          } else {
            ctx.fillStyle = `rgba(180, 50, 80, ${intensity * 0.5})`;
          }
          ctx.fillRect(x, y, candleSpacing - 0.5, cellHeight - 0.5);
        }
      }
    }

    // Draw indicators (overlays)
    for (const indicator of indicators.filter(ind => ind.enabled && ind.type === 'overlay')) {
      ctx.strokeStyle = indicator.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      let data: { time: number; value: number }[] = [];

      if (indicator.id === 'sma20') {
        data = calculateSMA(displayCandles, 20);
      } else if (indicator.id === 'sma50') {
        data = calculateSMA(displayCandles, 50);
      } else if (indicator.id === 'ema12') {
        data = calculateEMA(displayCandles, 12);
      } else if (indicator.id === 'ema26') {
        data = calculateEMA(displayCandles, 26);
      } else if (indicator.id === 'vwap') {
        const vwapData = calculateVWAP(displayCandles);
        data = vwapData.map(v => ({ time: v.time, value: v.vwap }));
      } else if (indicator.id === 'bollinger') {
        const bbData = calculateBollingerBands(displayCandles, 20, 2);

        // Draw bands
        ctx.strokeStyle = `${indicator.color}80`;
        ctx.beginPath();
        for (let i = 0; i < bbData.length; i++) {
          const candleIdx = displayCandles.findIndex(c => c.time === bbData[i].time);
          if (candleIdx === -1) continue;
          const x = padding.left + candleIdx * candleSpacing + candleSpacing / 2;
          const y = priceToY(bbData[i].upper);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.beginPath();
        for (let i = 0; i < bbData.length; i++) {
          const candleIdx = displayCandles.findIndex(c => c.time === bbData[i].time);
          if (candleIdx === -1) continue;
          const x = padding.left + candleIdx * candleSpacing + candleSpacing / 2;
          const y = priceToY(bbData[i].lower);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Middle line
        data = bbData.map(b => ({ time: b.time, value: b.middle }));
        ctx.strokeStyle = indicator.color;
      }

      if (data.length > 0) {
        for (let i = 0; i < data.length; i++) {
          const candleIdx = displayCandles.findIndex(c => c.time === data[i].time);
          if (candleIdx === -1) continue;
          const x = padding.left + candleIdx * candleSpacing + candleSpacing / 2;
          const y = priceToY(data[i].value);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    const candleWidth = Math.max(2, (chartWidth / displayCandles.length) * 0.75);

    // Draw chart based on type
    for (let i = 0; i < displayCandles.length; i++) {
      const candle = displayCandles[i];
      const x = padding.left + i * candleSpacing + candleSpacing / 2;
      const openY = priceToY(candle.open);
      const closeY = priceToY(candle.close);
      const highY = priceToY(candle.high);
      const lowY = priceToY(candle.low);
      const isBullish = candle.close >= candle.open;
      const color = isBullish ? '#22c55e' : '#ef4444';

      if (chartType === 'candle' || chartType === 'heikinAshi') {
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
        ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);

      } else if (chartType === 'line') {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        if (i === 0) {
          ctx.beginPath();
          ctx.moveTo(x, closeY);
        } else {
          ctx.lineTo(x, closeY);
        }
        if (i === displayCandles.length - 1) {
          ctx.stroke();
        }

      } else if (chartType === 'area') {
        if (i === 0) {
          ctx.beginPath();
          ctx.moveTo(x, closeY);
        } else {
          ctx.lineTo(x, closeY);
        }
        if (i === displayCandles.length - 1) {
          ctx.lineTo(x, padding.top + chartHeight);
          ctx.lineTo(padding.left + candleSpacing / 2, padding.top + chartHeight);
          ctx.closePath();
          const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)');
          ctx.fillStyle = gradient;
          ctx.fill();

          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let j = 0; j < displayCandles.length; j++) {
            const xj = padding.left + j * candleSpacing + candleSpacing / 2;
            const yj = priceToY(displayCandles[j].close);
            if (j === 0) ctx.moveTo(xj, yj);
            else ctx.lineTo(xj, yj);
          }
          ctx.stroke();
        }

      } else if (chartType === 'bar') {
        // OHLC bars
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;

        // High-Low
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        // Open tick (left)
        ctx.beginPath();
        ctx.moveTo(x - candleWidth / 2, openY);
        ctx.lineTo(x, openY);
        ctx.stroke();

        // Close tick (right)
        ctx.beginPath();
        ctx.moveTo(x, closeY);
        ctx.lineTo(x + candleWidth / 2, closeY);
        ctx.stroke();
      }
    }

    ctx.restore();

    // Crosshair
    if (showCrosshair && crosshairPos) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      ctx.moveTo(crosshairPos.x, padding.top);
      ctx.lineTo(crosshairPos.x, dimensions.height - 60 - padding.bottom);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(padding.left, crosshairPos.y);
      ctx.lineTo(dimensions.width - padding.right, crosshairPos.y);
      ctx.stroke();

      ctx.setLineDash([]);

      // Price label
      ctx.fillStyle = 'rgba(60, 60, 70, 0.95)';
      ctx.fillRect(dimensions.width - padding.right, crosshairPos.y - 10, padding.right - 5, 20);
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(crosshairPos.price.toFixed(2), dimensions.width - padding.right + 5, crosshairPos.y);

      // Time label
      const timeDate = new Date(crosshairPos.time);
      const timeStr = `${timeDate.getHours().toString().padStart(2, '0')}:${timeDate.getMinutes().toString().padStart(2, '0')}`;
      ctx.fillStyle = 'rgba(60, 60, 70, 0.95)';
      ctx.fillRect(crosshairPos.x - 25, dimensions.height - 60 - padding.bottom + 5, 50, 18);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(timeStr, crosshairPos.x, dimensions.height - 60 - padding.bottom + 14);
    }

    // Current price line
    const priceY = priceToY(currentPrice);
    ctx.strokeStyle = priceChange >= 0 ? '#22c55e' : '#ef4444';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding.left, priceY);
    ctx.lineTo(dimensions.width - padding.right, priceY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price label
    ctx.fillStyle = priceChange >= 0 ? '#22c55e' : '#ef4444';
    ctx.fillRect(dimensions.width - padding.right, priceY - 10, padding.right - 5, 20);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentPrice.toFixed(2), dimensions.width - padding.right + 5, priceY);

    // Y-axis labels
    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    const gridLines = 8;
    for (let i = 0; i <= gridLines; i++) {
      const price = maxPrice - (priceRange / gridLines) * i;
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.fillText(price.toFixed(2), dimensions.width - 5, y + 3);
    }

  }, [candles, dimensions, chartType, indicators, showGrid, showHeatmap, showCrosshair, crosshairPos, currentPrice, priceChange, zoomLevel, panOffset]);

  // Draw volume
  useEffect(() => {
    const canvas = volumeCanvasRef.current;
    if (!canvas || candles.length === 0 || dimensions.width === 0 || !showVolume) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = 50 * dpr;
    ctx.scale(dpr, dpr);

    const padding = { left: 10, right: 60 };
    const chartWidth = (dimensions.width - padding.left - padding.right) * zoomLevel;
    const candleSpacing = chartWidth / candles.length;

    ctx.fillStyle = '#0c0c0e';
    ctx.fillRect(0, 0, dimensions.width, 50);

    ctx.save();
    ctx.translate(panOffset, 0);

    const maxVolume = Math.max(...candles.map(c => c.volume));

    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      const x = padding.left + i * candleSpacing;
      const barHeight = (candle.volume / maxVolume) * 40;
      const isBullish = candle.close >= candle.open;

      ctx.fillStyle = isBullish ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)';
      ctx.fillRect(x, 50 - barHeight, candleSpacing * 0.75, barHeight);
    }

    ctx.restore();

  }, [candles, dimensions, showVolume, zoomLevel, panOffset]);

  const symbolIcon = SYMBOLS.find(s => s.value === selectedSymbol)?.icon || '●';

  return (
    <div className="w-full h-full flex flex-col bg-[#0c0c0e] text-white font-sans overflow-hidden rounded-lg border border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-[#0f0f12] to-[#141418] border-b border-zinc-800">
        {/* Symbol selector */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">{symbolIcon}</span>
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="bg-transparent text-white font-semibold text-lg border-none outline-none cursor-pointer appearance-none pr-4"
            >
              {SYMBOLS.map((s) => (
                <option key={s.value} value={s.value} className="bg-zinc-900">{s.label}</option>
              ))}
            </select>
          </div>

          {/* Price info */}
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold">
              ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded ${priceChange >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              {priceChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span className="text-sm font-medium">
                {priceChange >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Connection status */}
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            <span>{isConnected ? 'Live' : 'Offline'}</span>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="p-2 hover:bg-zinc-800 rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0f0f12] border-b border-zinc-800">
        {/* Timeframes */}
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                timeframe === tf.value
                  ? 'bg-cyan-600 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Chart type */}
        <div className="flex items-center gap-1 px-2 border-l border-r border-zinc-800">
          {CHART_TYPES.map((ct) => (
            <button
              key={ct.value}
              onClick={() => setChartType(ct.value)}
              className={`p-1.5 rounded transition-colors ${
                chartType === ct.value
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
              }`}
              title={ct.label}
            >
              {ct.icon}
            </button>
          ))}
        </div>

        {/* View toggles */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded transition-colors ${showGrid ? 'text-cyan-400' : 'text-zinc-500 hover:text-white'}`}
            title="Toggle Grid"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCrosshair(!showCrosshair)}
            className={`p-1.5 rounded transition-colors ${showCrosshair ? 'text-cyan-400' : 'text-zinc-500 hover:text-white'}`}
            title="Toggle Crosshair"
          >
            <Crosshair className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`p-1.5 rounded transition-colors ${showHeatmap ? 'text-cyan-400' : 'text-zinc-500 hover:text-white'}`}
            title="Toggle Heatmap"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowVolume(!showVolume)}
            className={`p-1.5 rounded transition-colors ${showVolume ? 'text-cyan-400' : 'text-zinc-500 hover:text-white'}`}
            title="Toggle Volume"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        </div>

        {/* Indicators dropdown */}
        <div className="relative group">
          <button className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors">
            <Activity className="w-3.5 h-3.5" />
            <span>Indicators</span>
          </button>
          <div className="absolute right-0 top-full mt-1 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 hidden group-hover:block">
            <div className="p-2 max-h-60 overflow-y-auto">
              {indicators.map((ind) => (
                <button
                  key={ind.id}
                  onClick={() => toggleIndicator(ind.id)}
                  className="flex items-center justify-between w-full px-2 py-1.5 text-xs rounded hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: ind.color }}
                    />
                    <span className="text-zinc-300">{ind.name}</span>
                  </div>
                  {ind.enabled ? (
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-zinc-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chart area */}
      <div
        ref={containerRef}
        className="flex-1 relative cursor-crosshair"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
        style={{ cursor: isDragging ? 'grabbing' : 'crosshair' }}
      >
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0c0c0e]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-zinc-700 border-t-cyan-500 rounded-full animate-spin" />
              <span className="text-zinc-500 text-sm">Loading chart...</span>
            </div>
          </div>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              style={{ width: dimensions.width, height: dimensions.height - 60 }}
              className="block"
            />
            {showVolume && (
              <canvas
                ref={volumeCanvasRef}
                style={{ width: dimensions.width, height: 50 }}
                className="block border-t border-zinc-800"
              />
            )}
          </>
        )}

        {/* Zoom indicator */}
        {zoomLevel !== 1 && (
          <div className="absolute top-3 left-3 bg-zinc-900/90 px-2 py-1 rounded text-xs text-zinc-300 border border-zinc-700">
            {(zoomLevel * 100).toFixed(0)}%
          </div>
        )}

        {/* Legend */}
        <div className="absolute top-3 right-16 flex flex-col gap-1">
          {indicators.filter(ind => ind.enabled).map((ind) => (
            <div key={ind.id} className="flex items-center gap-1.5 bg-zinc-900/80 px-2 py-0.5 rounded text-[10px]">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: ind.color }}
              />
              <span className="text-zinc-400">{ind.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
