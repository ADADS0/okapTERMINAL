"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { BinanceWebSocket, fetchKlines, toBinanceInterval } from '@/lib/binance';
import type { CandleData, TimeFrame, Symbol as SymbolType } from '@/lib/types';
import { calculateSMA, calculateEMA, calculateVWAP, calculateBollingerBands } from '@/lib/indicators';
import {
  X,
  Settings2,
  Maximize2,
  Minimize2,
  ChevronDown,
  CandlestickChart,
  LineChart,
  AreaChart,
  BarChart3,
  Activity,
  Layers,
  Grid3X3,
  Crosshair,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';

interface ChartWidgetProps {
  symbol?: SymbolType;
  defaultTimeframe?: TimeFrame;
  onClose?: () => void;
  onSymbolClick?: () => void;
  title?: string;
}

type ChartType = 'candle' | 'line' | 'area' | 'bar' | 'heikinAshi';

interface ChartIndicator {
  id: string;
  name: string;
  enabled: boolean;
  color: string;
}

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
  { value: 'candle', label: 'Candles', icon: <CandlestickChart className="w-3.5 h-3.5" /> },
  { value: 'line', label: 'Line', icon: <LineChart className="w-3.5 h-3.5" /> },
  { value: 'area', label: 'Area', icon: <AreaChart className="w-3.5 h-3.5" /> },
  { value: 'bar', label: 'OHLC', icon: <BarChart3 className="w-3.5 h-3.5" /> },
  { value: 'heikinAshi', label: 'Heikin Ashi', icon: <Activity className="w-3.5 h-3.5" /> },
];

const DEFAULT_INDICATORS: ChartIndicator[] = [
  { id: 'sma20', name: 'SMA 20', enabled: false, color: '#f59e0b' },
  { id: 'ema12', name: 'EMA 12', enabled: false, color: '#10b981' },
  { id: 'vwap', name: 'VWAP', enabled: false, color: '#06b6d4' },
  { id: 'bollinger', name: 'Bollinger', enabled: false, color: '#8b5cf6' },
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

export function ChartWidget({
  symbol,
  defaultTimeframe = '5m',
  onClose,
  onSymbolClick,
  title,
}: ChartWidgetProps) {
  const [timeframe, setTimeframe] = useState<TimeFrame>(defaultTimeframe);
  const [chartType, setChartType] = useState<ChartType>('candle');
  const [indicators, setIndicators] = useState<ChartIndicator[]>(DEFAULT_INDICATORS);
  const [showGrid, setShowGrid] = useState(true);
  const [showCrosshair, setShowCrosshair] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTimeframeDropdown, setShowTimeframeDropdown] = useState(false);
  const [showChartTypeDropdown, setShowChartTypeDropdown] = useState(false);
  const [showIndicatorsDropdown, setShowIndicatorsDropdown] = useState(false);

  const [candles, setCandles] = useState<CandleData[]>([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number; price: number; time: number; candle: CandleData | null } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const volumeCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<BinanceWebSocket | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const symbolString = symbol ? `${symbol.base}/${symbol.quote}` : 'BTC/USDT';
  const exchangeName = symbol?.exchange || 'binance';

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
    const interval = setInterval(updateDimensions, 500);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearInterval(interval);
    };
  }, [updateDimensions]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const klines = await fetchKlines(symbolString, timeframe, 150);
        if (klines.length > 0) {
          setCandles(klines);
          setCurrentPrice(klines[klines.length - 1].close);
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

    wsRef.current = new BinanceWebSocket(symbolString, toBinanceInterval(timeframe), {
      onPrice: (price) => setCurrentPrice(price),
      onKline: (kline, isClosed) => {
        setCandles((prev) => {
          if (prev.length === 0) return [kline];
          const newCandles = [...prev];
          if (isClosed) {
            newCandles.push(kline);
            if (newCandles.length > 150) newCandles.shift();
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
  }, [symbolString, timeframe]);

  // Toggle indicator
  const toggleIndicator = (id: string) => {
    setIndicators((prev) =>
      prev.map((ind) => (ind.id === id ? { ...ind, enabled: !ind.enabled } : ind))
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
      const padding = { top: 10, right: 55, bottom: 25, left: 5 };
      const chartWidth = (dimensions.width - padding.left - padding.right) * zoomLevel;
      const chartHeight = dimensions.height - (showVolume ? 60 : 0) - padding.top - padding.bottom;

      const minPrice = Math.min(...candles.map(c => c.low)) * 0.999;
      const maxPrice = Math.max(...candles.map(c => c.high)) * 1.001;
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
          candle: candles[candleIndex],
        });
      }
    }
  }, [isDragging, dragStart, showCrosshair, candles, dimensions, zoomLevel, panOffset, showVolume]);

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

  // Price info from latest candle
  const priceInfo = useMemo(() => {
    if (candles.length === 0) {
      return { open: 0, high: 0, low: 0, close: 0, change: 0 };
    }
    const latest = candles[candles.length - 1];
    const first = candles[0];
    return {
      open: latest.open,
      high: latest.high,
      low: latest.low,
      close: latest.close,
      change: latest.close - first.open,
    };
  }, [candles]);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0 || dimensions.width === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const volumeHeight = showVolume ? 50 : 0;
    const chartHeight = dimensions.height - volumeHeight;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = chartHeight * dpr;
    ctx.scale(dpr, dpr);

    const padding = { top: 10, right: 55, bottom: 25, left: 5 };
    const chartWidth = (dimensions.width - padding.left - padding.right) * zoomLevel;
    const drawHeight = chartHeight - padding.top - padding.bottom;

    // Use appropriate candle data
    const displayCandles = chartType === 'heikinAshi' ? toHeikinAshi(candles) : candles;

    const minPrice = Math.min(...displayCandles.map(c => c.low)) * 0.999;
    const maxPrice = Math.max(...displayCandles.map(c => c.high)) * 1.001;
    const priceRange = maxPrice - minPrice;

    const priceToY = (price: number) =>
      padding.top + drawHeight - ((price - minPrice) / priceRange) * drawHeight;

    const candleSpacing = chartWidth / displayCandles.length;

    // Background
    ctx.fillStyle = '#0c0c0e';
    ctx.fillRect(0, 0, dimensions.width, chartHeight);

    ctx.save();
    ctx.translate(panOffset, 0);

    // Grid
    if (showGrid) {
      ctx.strokeStyle = '#1a1a1e';
      ctx.lineWidth = 1;
      const gridLines = 6;
      for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + (drawHeight / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left - panOffset, y);
        ctx.lineTo(dimensions.width - padding.right, y);
        ctx.stroke();
      }
    }

    // Draw indicators
    for (const indicator of indicators.filter(ind => ind.enabled)) {
      ctx.strokeStyle = indicator.color;
      ctx.lineWidth = 1.5;

      let data: { time: number; value: number }[] = [];

      if (indicator.id === 'sma20') {
        data = calculateSMA(displayCandles, 20);
      } else if (indicator.id === 'ema12') {
        data = calculateEMA(displayCandles, 12);
      } else if (indicator.id === 'vwap') {
        const vwapData = calculateVWAP(displayCandles);
        data = vwapData.map(v => ({ time: v.time, value: v.vwap }));
      } else if (indicator.id === 'bollinger') {
        const bbData = calculateBollingerBands(displayCandles, 20, 2);

        // Draw bands
        ctx.strokeStyle = `${indicator.color}60`;
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
        ctx.beginPath();
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

    const candleWidth = Math.max(1, (chartWidth / displayCandles.length) * 0.7);

    // Draw chart based on type
    for (let i = 0; i < displayCandles.length; i++) {
      const candle = displayCandles[i];
      const x = padding.left + i * candleSpacing + candleSpacing / 2;
      const openY = priceToY(candle.open);
      const closeY = priceToY(candle.close);
      const highY = priceToY(candle.high);
      const lowY = priceToY(candle.low);
      const isBullish = candle.close >= candle.open;
      const bullColor = '#26a69a';
      const bearColor = '#ef5350';
      const color = isBullish ? bullColor : bearColor;

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
        ctx.lineWidth = 1.5;
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
          ctx.lineTo(x, padding.top + drawHeight);
          ctx.lineTo(padding.left + candleSpacing / 2, padding.top + drawHeight);
          ctx.closePath();
          const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + drawHeight);
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0.02)');
          ctx.fillStyle = gradient;
          ctx.fill();

          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1.5;
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
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;

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
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      ctx.beginPath();
      ctx.moveTo(crosshairPos.x, padding.top);
      ctx.lineTo(crosshairPos.x, chartHeight - padding.bottom);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(padding.left, crosshairPos.y);
      ctx.lineTo(dimensions.width - padding.right, crosshairPos.y);
      ctx.stroke();

      ctx.setLineDash([]);

      // Price label on right
      ctx.fillStyle = 'rgba(50, 50, 55, 0.95)';
      ctx.fillRect(dimensions.width - padding.right + 2, crosshairPos.y - 9, padding.right - 4, 18);
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(crosshairPos.price.toFixed(5), dimensions.width - padding.right + 5, crosshairPos.y);

      // Time label on bottom
      const timeDate = new Date(crosshairPos.time);
      const dateStr = `${(timeDate.getMonth() + 1).toString().padStart(2, '0')}/${timeDate.getDate().toString().padStart(2, '0')}`;
      ctx.fillStyle = 'rgba(50, 50, 55, 0.95)';
      ctx.fillRect(crosshairPos.x - 22, chartHeight - padding.bottom + 2, 44, 16);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(dateStr, crosshairPos.x, chartHeight - padding.bottom + 10);
    }

    // Current price line
    const priceY = priceToY(currentPrice);
    const isBullish = priceInfo.change >= 0;
    const priceLineColor = isBullish ? '#26a69a' : '#ef5350';

    ctx.strokeStyle = priceLineColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(padding.left, priceY);
    ctx.lineTo(dimensions.width - padding.right, priceY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price label
    ctx.fillStyle = priceLineColor;
    ctx.fillRect(dimensions.width - padding.right + 2, priceY - 9, padding.right - 4, 18);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentPrice.toFixed(5), dimensions.width - padding.right + 5, priceY);

    // Time label on current bar
    if (displayCandles.length > 0) {
      const lastCandle = displayCandles[displayCandles.length - 1];
      const now = new Date();
      const candleTime = new Date(lastCandle.time);
      const timeframeMs = timeframe === '1m' ? 60000 : timeframe === '5m' ? 300000 : timeframe === '15m' ? 900000 : timeframe === '30m' ? 1800000 : timeframe === '1h' ? 3600000 : timeframe === '4h' ? 14400000 : 86400000;
      const remaining = Math.max(0, timeframeMs - (now.getTime() - candleTime.getTime()));
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

      const lastX = padding.left + (displayCandles.length - 1) * candleSpacing + candleSpacing / 2 + panOffset;
      ctx.fillStyle = priceLineColor;
      ctx.fillRect(lastX - 18, priceY + 12, 36, 14);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(timeStr, lastX, priceY + 19);
    }

    // Y-axis labels
    ctx.fillStyle = '#555';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    const gridLines = 6;
    for (let i = 0; i <= gridLines; i++) {
      const price = maxPrice - (priceRange / gridLines) * i;
      const y = padding.top + (drawHeight / gridLines) * i;
      ctx.fillText(price.toFixed(5), dimensions.width - 3, y + 3);
    }

    // X-axis time labels
    ctx.fillStyle = '#555';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    const timeLabels = Math.min(8, displayCandles.length);
    for (let i = 0; i < timeLabels; i++) {
      const idx = Math.floor((i / (timeLabels - 1)) * (displayCandles.length - 1));
      if (displayCandles[idx]) {
        const x = padding.left + idx * candleSpacing + panOffset;
        const date = new Date(displayCandles[idx].time);
        const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        ctx.fillText(timeStr, x, chartHeight - 5);
      }
    }

  }, [candles, dimensions, chartType, indicators, showGrid, showCrosshair, crosshairPos, currentPrice, priceInfo.change, zoomLevel, panOffset, showVolume, timeframe]);

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

    const padding = { left: 5, right: 55 };
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

      ctx.fillStyle = isBullish ? 'rgba(38, 166, 154, 0.4)' : 'rgba(239, 83, 80, 0.4)';
      ctx.fillRect(x + 1, 45 - barHeight, candleSpacing * 0.7, barHeight);
    }

    ctx.restore();

  }, [candles, dimensions, showVolume, zoomLevel, panOffset]);

  const displaySymbol = `${symbol?.base || 'BTC'}/${symbol?.quote || 'USDT'}`;

  return (
    <div className={`flex flex-col bg-[#0c0c0e] text-white font-sans overflow-hidden border border-zinc-800 rounded ${isFullscreen ? 'fixed inset-0 z-50' : 'w-full h-full'}`}>
      {/* Header */}
      <div className="h-9 bg-[#101014] border-b border-zinc-800 flex items-center justify-between px-2 shrink-0">
        <div className="flex items-center gap-2">
          {/* Exchange icon */}
          <div className="w-4 h-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <span className="text-[8px] text-yellow-400">B</span>
          </div>

          {/* Symbol */}
          <button
            type="button"
            onClick={onSymbolClick}
            className="text-xs font-medium text-white hover:text-cyan-400 transition-colors"
          >
            {displaySymbol.toLowerCase()}@{exchangeName}
          </button>

          {/* Timeframe */}
          <span className="text-xs text-zinc-400">{timeframe}</span>

          {/* OHLC Info */}
          {crosshairPos?.candle ? (
            <div className="flex items-center gap-2 text-[10px] ml-2">
              <span className="text-zinc-500">O</span>
              <span className="text-white">{crosshairPos.candle.open.toFixed(5)}</span>
              <span className="text-zinc-500">H</span>
              <span className="text-emerald-400">{crosshairPos.candle.high.toFixed(5)}</span>
              <span className="text-zinc-500">L</span>
              <span className="text-red-400">{crosshairPos.candle.low.toFixed(5)}</span>
              <span className="text-zinc-500">C</span>
              <span className="text-white">{crosshairPos.candle.close.toFixed(5)}</span>
              <span className="text-zinc-500">D</span>
              <span className={priceInfo.change >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {(crosshairPos.candle.close - crosshairPos.candle.open).toFixed(0)}
              </span>
            </div>
          ) : candles.length > 0 && (
            <div className="flex items-center gap-2 text-[10px] ml-2">
              <span className="text-zinc-500">O</span>
              <span className="text-white">{priceInfo.open.toFixed(5)}</span>
              <span className="text-zinc-500">H</span>
              <span className="text-emerald-400">{priceInfo.high.toFixed(5)}</span>
              <span className="text-zinc-500">L</span>
              <span className="text-red-400">{priceInfo.low.toFixed(5)}</span>
              <span className="text-zinc-500">C</span>
              <span className="text-white">{priceInfo.close.toFixed(5)}</span>
              <span className="text-zinc-500">D</span>
              <span className={priceInfo.change >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {priceInfo.change.toFixed(0)}
              </span>
            </div>
          )}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1">
          {/* Connection status */}
          <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="h-7 bg-[#0f0f12] border-b border-zinc-800 flex items-center justify-between px-2 shrink-0">
        {/* Left - Timeframes */}
        <div className="flex items-center gap-0.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              type="button"
              onClick={() => setTimeframe(tf.value)}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                timeframe === tf.value
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Right - Chart controls */}
        <div className="flex items-center gap-1">
          {/* Chart type buttons */}
          {CHART_TYPES.map((ct) => (
            <button
              key={ct.value}
              type="button"
              onClick={() => setChartType(ct.value)}
              className={`p-1 rounded transition-colors ${
                chartType === ct.value
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
              }`}
              title={ct.label}
            >
              {ct.icon}
            </button>
          ))}

          <div className="w-px h-4 bg-zinc-700 mx-1" />

          <button
            type="button"
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1 rounded transition-colors ${showGrid ? 'text-cyan-400' : 'text-zinc-500 hover:text-white'}`}
            title="Toggle Grid"
          >
            <Grid3X3 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setShowCrosshair(!showCrosshair)}
            className={`p-1 rounded transition-colors ${showCrosshair ? 'text-cyan-400' : 'text-zinc-500 hover:text-white'}`}
            title="Toggle Crosshair"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setShowVolume(!showVolume)}
            className={`p-1 rounded transition-colors ${showVolume ? 'text-cyan-400' : 'text-zinc-500 hover:text-white'}`}
            title="Toggle Volume"
          >
            <BarChart3 className="w-3.5 h-3.5" />
          </button>

          {/* Indicators dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowIndicatorsDropdown(!showIndicatorsDropdown)}
              className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
            >
              <Layers className="w-3 h-3" />
              <span>Ind</span>
            </button>
            {showIndicatorsDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowIndicatorsDropdown(false)} />
                <div className="absolute right-0 top-full mt-1 w-36 bg-zinc-900 border border-zinc-700 rounded shadow-xl z-50 py-1">
                  {indicators.map((ind) => (
                    <button
                      key={ind.id}
                      type="button"
                      onClick={() => toggleIndicator(ind.id)}
                      className="flex items-center justify-between w-full px-2 py-1.5 text-[10px] hover:bg-zinc-800 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ind.color }} />
                        <span className="text-zinc-300">{ind.name}</span>
                      </div>
                      {ind.enabled ? (
                        <Eye className="w-3 h-3 text-cyan-400" />
                      ) : (
                        <EyeOff className="w-3 h-3 text-zinc-600" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Chart area */}
      <div
        ref={containerRef}
        className="flex-1 relative cursor-crosshair min-h-0"
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
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-zinc-700 border-t-cyan-500 rounded-full animate-spin" />
              <span className="text-zinc-500 text-xs">Loading...</span>
            </div>
          </div>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              style={{ width: dimensions.width, height: dimensions.height - (showVolume ? 50 : 0) }}
              className="block"
            />
            {showVolume && (
              <canvas
                ref={volumeCanvasRef}
                style={{ width: dimensions.width, height: 50 }}
                className="block border-t border-zinc-800/50"
              />
            )}
          </>
        )}

        {/* Watermark */}
        <div className="absolute bottom-16 left-4 flex items-center gap-1 opacity-60 pointer-events-none">
          <span className="text-cyan-500 font-bold text-sm">OKAP</span>
          <span className="text-white font-medium text-xs">FREE</span>
        </div>

        {/* Zoom indicator */}
        {zoomLevel !== 1 && (
          <div className="absolute top-2 left-2 bg-zinc-900/80 px-1.5 py-0.5 rounded text-[10px] text-zinc-400 border border-zinc-700">
            {(zoomLevel * 100).toFixed(0)}%
          </div>
        )}

        {/* Active indicators legend */}
        {indicators.some(ind => ind.enabled) && (
          <div className="absolute top-2 right-16 flex flex-col gap-0.5">
            {indicators.filter(ind => ind.enabled).map((ind) => (
              <div key={ind.id} className="flex items-center gap-1 bg-zinc-900/70 px-1.5 py-0.5 rounded text-[9px]">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ind.color }} />
                <span className="text-zinc-400">{ind.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
