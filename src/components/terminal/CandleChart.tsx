"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { CandleData, HeatmapCell, ActiveIndicators, ChartDrawing } from '@/lib/types';
import { calculateSMA, calculateEMA, calculateBollingerBands, calculateVWAP, calculateCVD, type IndicatorData, type BollingerBandData, type VWAPData, type CVDData } from '@/lib/indicators';
import { FootprintOverlay } from './FootprintOverlay';
import { VolumeBubbles } from './VolumeBubbles';

interface CandleChartProps {
  candles: CandleData[];
  heatmap: HeatmapCell[][];
  showHeatmap: boolean;
  currentPrice: number;
  indicators?: ActiveIndicators;
  drawings?: ChartDrawing[];
  showVWAP?: boolean;
  showCVD?: boolean;
  showFootprint?: boolean;
  showVolumeBubbles?: boolean;
  showBollinger?: boolean;
}

interface TooltipData {
  x: number;
  y: number;
  price: number;
  value: number;
  time: number;
  type: 'bid' | 'ask';
  intensity: number;
}

interface CrosshairData {
  x: number;
  y: number;
  price: number;
  time: number;
}

// SciChart-style color gradient
const HEATMAP_COLORS = {
  bid: {
    low: { r: 10, g: 25, b: 50 },
    mid: { r: 30, g: 100, b: 180 },
    high: { r: 100, g: 200, b: 255 },
  },
  ask: {
    low: { r: 40, g: 15, b: 25 },
    mid: { r: 180, g: 50, b: 80 },
    high: { r: 255, g: 100, b: 120 },
  },
};

function getHeatmapColor(intensity: number, isBid: boolean): string {
  const colors = isBid ? HEATMAP_COLORS.bid : HEATMAP_COLORS.ask;
  let r: number, g: number, b: number;

  if (intensity < 0.3) {
    const t = intensity / 0.3;
    r = Math.floor(colors.low.r + (colors.mid.r - colors.low.r) * t);
    g = Math.floor(colors.low.g + (colors.mid.g - colors.low.g) * t);
    b = Math.floor(colors.low.b + (colors.mid.b - colors.low.b) * t);
  } else {
    const t = (intensity - 0.3) / 0.7;
    r = Math.floor(colors.mid.r + (colors.high.r - colors.mid.r) * t);
    g = Math.floor(colors.mid.g + (colors.high.g - colors.mid.g) * t);
    b = Math.floor(colors.mid.b + (colors.high.b - colors.mid.b) * t);
  }

  const alpha = 0.3 + intensity * 0.6;
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
}

export function CandleChart({
  candles,
  heatmap,
  showHeatmap,
  currentPrice,
  indicators,
  drawings = [],
  showVWAP = false,
  showCVD = false,
  showFootprint = false,
  showVolumeBubbles = false,
  showBollinger = false,
}: CandleChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [crosshair, setCrosshair] = useState<CrosshairData | null>(null);

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

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoomLevel((prev) => Math.max(0.5, Math.min(5, prev * delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  }, [panOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
      return;
    }

    const padding = { top: 20, right: 80, bottom: 30, left: 10 };
    const chartWidth = (dimensions.width - padding.left - padding.right) * zoomLevel;
    const chartHeight = dimensions.height - padding.top - padding.bottom;

    if (candles.length === 0) return;

    const minPrice = Math.min(...candles.map(c => c.low)) * 0.998;
    const maxPrice = Math.max(...candles.map(c => c.high)) * 1.002;
    const priceRange = maxPrice - minPrice;
    const candleSpacing = chartWidth / candles.length;

    // Update crosshair
    if (mouseX > padding.left && mouseX < dimensions.width - padding.right) {
      const adjustedX = (mouseX - padding.left - panOffset.x) / zoomLevel;
      const candleIndex = Math.floor(adjustedX / (candleSpacing / zoomLevel));
      const price = maxPrice - ((mouseY - padding.top) / chartHeight) * priceRange;

      if (candleIndex >= 0 && candleIndex < candles.length) {
        setCrosshair({
          x: mouseX,
          y: mouseY,
          price,
          time: candles[candleIndex].time,
        });
      }
    }

    // Calculate tooltip for heatmap
    if (showHeatmap && heatmap.length > 0 && candles.length > 0) {
      const adjustedX = (mouseX - padding.left - panOffset.x) / zoomLevel;
      const candleIndex = Math.floor(adjustedX / (candleSpacing / zoomLevel));

      const levels = heatmap[0]?.length || 20;
      const cellHeight = chartHeight / levels;
      const levelIndex = Math.floor((chartHeight - (mouseY - padding.top)) / cellHeight);

      if (
        candleIndex >= 0 &&
        candleIndex < heatmap.length &&
        levelIndex >= 0 &&
        levelIndex < (heatmap[candleIndex]?.length || 0)
      ) {
        const cell = heatmap[candleIndex][levelIndex];
        const candle = candles[candleIndex];
        const midPrice = (candle.open + candle.close) / 2;
        const isBid = cell.price < midPrice;

        let maxValue = 0;
        for (const col of heatmap) {
          for (const c of col) {
            if (c.value > maxValue) maxValue = c.value;
          }
        }

        setTooltip({
          x: mouseX,
          y: mouseY,
          price: cell.price,
          value: cell.value,
          time: cell.time,
          type: isBid ? 'bid' : 'ask',
          intensity: maxValue > 0 ? cell.value / maxValue : 0,
        });
        return;
      }
    }

    setTooltip(null);
  }, [isDragging, dragStart, showHeatmap, heatmap, candles, dimensions, zoomLevel, panOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    setTooltip(null);
    setCrosshair(null);
  }, []);

  const handleDoubleClick = useCallback(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0 || dimensions.width === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    const padding = { top: 20, right: 80, bottom: 30, left: 10 };
    const chartWidth = (dimensions.width - padding.left - padding.right) * zoomLevel;
    const chartHeight = dimensions.height - padding.top - padding.bottom;

    const minPrice = Math.min(...candles.map(c => c.low)) * 0.998;
    const maxPrice = Math.max(...candles.map(c => c.high)) * 1.002;
    const priceRange = maxPrice - minPrice;

    const priceToY = (price: number) =>
      padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight;

    const candleSpacing = chartWidth / candles.length;
    const timeToX = (time: number) => {
      const idx = candles.findIndex(c => c.time >= time);
      if (idx === -1) return padding.left + chartWidth + panOffset.x;
      return padding.left + idx * candleSpacing + candleSpacing / 2 + panOffset.x;
    };

    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    ctx.save();
    ctx.translate(panOffset.x, 0);

    ctx.strokeStyle = '#1a1a1f';
    ctx.lineWidth = 1;
    const gridLines = 8;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left - panOffset.x, y);
      ctx.lineTo(dimensions.width - padding.right, y);
      ctx.stroke();
    }

    const candleWidth = Math.max(2, (chartWidth / candles.length) * 0.8);

    // Draw heatmap with SciChart-style colors
    if (showHeatmap && heatmap.length > 0) {
      const levels = heatmap[0]?.length || 20;
      const cellHeight = chartHeight / levels;

      let maxValue = 0;
      for (let i = 0; i < heatmap.length; i++) {
        for (let j = 0; j < (heatmap[i]?.length || 0); j++) {
          if (heatmap[i][j].value > maxValue) maxValue = heatmap[i][j].value;
        }
      }

      for (let i = 0; i < heatmap.length; i++) {
        for (let j = 0; j < (heatmap[i]?.length || 0); j++) {
          const cell = heatmap[i][j];
          const x = padding.left + i * candleSpacing;
          const y = padding.top + chartHeight - (j + 1) * cellHeight;

          if (cell.value === 0) continue;

          const midPrice = (candles[i].open + candles[i].close) / 2;
          const isBid = cell.price < midPrice;

          // Use log scale for better visual distribution
          const logValue = Math.log(cell.value + 1);
          const logMax = Math.log(maxValue + 1);
          const normalizedValue = logMax > 0 ? logValue / logMax : 0;

          ctx.fillStyle = getHeatmapColor(normalizedValue, isBid);
          ctx.fillRect(x, y, candleSpacing - 0.5, cellHeight - 0.5);

          if (cell.value > 10 && candleSpacing * zoomLevel > 40) {
            const textAlpha = Math.min(1, normalizedValue + 0.3);
            ctx.fillStyle = `rgba(255, 255, 255, ${textAlpha})`;
            ctx.font = `bold ${Math.max(8, Math.min(11, candleSpacing * 0.3))}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(cell.value.toString(), x + candleSpacing / 2, y + cellHeight / 2);
          }
        }
      }
    }

    // Draw Bollinger Bands if enabled
    if (showBollinger || indicators?.bollinger?.enabled) {
      const period = indicators?.bollinger?.period || 20;
      const stdDev = indicators?.bollinger?.stdDev || 2;
      const bbData = calculateBollingerBands(candles, period, stdDev);
      if (bbData.length > 0) {
        ctx.strokeStyle = 'rgba(156, 163, 175, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < bbData.length; i++) {
          const candleIdx = candles.length - bbData.length + i;
          const x = padding.left + candleIdx * candleSpacing + candleSpacing / 2;
          const y = priceToY(bbData[i].upper);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.beginPath();
        for (let i = 0; i < bbData.length; i++) {
          const candleIdx = candles.length - bbData.length + i;
          const x = padding.left + candleIdx * candleSpacing + candleSpacing / 2;
          const y = priceToY(bbData[i].lower);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.fillStyle = 'rgba(156, 163, 175, 0.1)';
        ctx.beginPath();
        for (let i = 0; i < bbData.length; i++) {
          const candleIdx = candles.length - bbData.length + i;
          const x = padding.left + candleIdx * candleSpacing + candleSpacing / 2;
          const y = priceToY(bbData[i].upper);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        for (let i = bbData.length - 1; i >= 0; i--) {
          const candleIdx = candles.length - bbData.length + i;
          const x = padding.left + candleIdx * candleSpacing + candleSpacing / 2;
          const y = priceToY(bbData[i].lower);
          ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
      }
    }

    if (indicators?.sma?.enabled) {
      const smaData = calculateSMA(candles, indicators.sma.period);
      drawIndicatorLine(ctx, smaData, candles, padding, candleSpacing, priceToY, indicators.sma.color);
    }

    if (indicators?.ema?.enabled) {
      const emaData = calculateEMA(candles, indicators.ema.period);
      drawIndicatorLine(ctx, emaData, candles, padding, candleSpacing, priceToY, indicators.ema.color);
    }

    if (showVWAP) {
      const vwapData = calculateVWAP(candles);
      if (vwapData.length > 0) {
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);

        ctx.beginPath();
        for (let i = 0; i < vwapData.length; i++) {
          const x = padding.left + i * candleSpacing + candleSpacing / 2;
          const y = priceToY(vwapData[i].upperBand2);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.beginPath();
        for (let i = 0; i < vwapData.length; i++) {
          const x = padding.left + i * candleSpacing + candleSpacing / 2;
          const y = priceToY(vwapData[i].lowerBand2);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
        ctx.beginPath();
        for (let i = 0; i < vwapData.length; i++) {
          const x = padding.left + i * candleSpacing + candleSpacing / 2;
          const y = priceToY(vwapData[i].upperBand1);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.beginPath();
        for (let i = 0; i < vwapData.length; i++) {
          const x = padding.left + i * candleSpacing + candleSpacing / 2;
          const y = priceToY(vwapData[i].lowerBand1);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.setLineDash([]);

        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < vwapData.length; i++) {
          const x = padding.left + i * candleSpacing + candleSpacing / 2;
          const y = priceToY(vwapData[i].vwap);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        if (vwapData.length > 0) {
          const lastVwap = vwapData[vwapData.length - 1];
          const labelX = padding.left + (vwapData.length - 1) * candleSpacing + candleSpacing / 2 + 5;
          const labelY = priceToY(lastVwap.vwap);

          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(`VWAP ${lastVwap.vwap.toFixed(2)}`, labelX, labelY);
        }
      }
    }

    // Draw candles
    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      const x = padding.left + i * candleSpacing + candleSpacing / 2;

      const openY = priceToY(candle.open);
      const closeY = priceToY(candle.close);
      const highY = priceToY(candle.high);
      const lowY = priceToY(candle.low);

      const isBullish = candle.close >= candle.open;
      const color = isBullish ? '#26a69a' : '#ef5350';

      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      ctx.fillStyle = color;
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.abs(closeY - openY) || 1;
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    }

    // Draw drawings
    for (const drawing of drawings) {
      ctx.strokeStyle = drawing.color;
      ctx.lineWidth = drawing.lineWidth;
      ctx.setLineDash([]);

      if (drawing.type === 'horizontal' && drawing.points[0]) {
        const y = priceToY(drawing.points[0].price);
        ctx.beginPath();
        ctx.moveTo(padding.left - panOffset.x, y);
        ctx.lineTo(dimensions.width - padding.right, y);
        ctx.stroke();
      } else if (drawing.type === 'trendline' && drawing.points.length >= 2) {
        const x1 = timeToX(drawing.points[0].time);
        const y1 = priceToY(drawing.points[0].price);
        const x2 = timeToX(drawing.points[1].time);
        const y2 = priceToY(drawing.points[1].price);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      } else if (drawing.type === 'rectangle' && drawing.points.length >= 2) {
        const x1 = timeToX(drawing.points[0].time);
        const y1 = priceToY(drawing.points[0].price);
        const x2 = timeToX(drawing.points[1].time);
        const y2 = priceToY(drawing.points[1].price);
        ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      }
    }

    ctx.restore();

    // Draw crosshair
    if (crosshair) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      ctx.moveTo(crosshair.x, padding.top);
      ctx.lineTo(crosshair.x, dimensions.height - padding.bottom);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(padding.left, crosshair.y);
      ctx.lineTo(dimensions.width - padding.right, crosshair.y);
      ctx.stroke();

      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(60, 60, 70, 0.9)';
      ctx.fillRect(dimensions.width - padding.right, crosshair.y - 10, padding.right - 5, 20);
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(crosshair.price.toFixed(2), dimensions.width - padding.right + 5, crosshair.y);
    }

    // Draw current price line
    const priceY = priceToY(currentPrice);
    ctx.strokeStyle = '#f5c842';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding.left, priceY);
    ctx.lineTo(dimensions.width - padding.right, priceY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#f5c842';
    ctx.fillRect(dimensions.width - padding.right, priceY - 10, padding.right - 5, 20);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentPrice.toFixed(2), dimensions.width - padding.right + 5, priceY);

    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i <= gridLines; i++) {
      const price = maxPrice - (priceRange / gridLines) * i;
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.fillText(price.toFixed(2), dimensions.width - 5, y + 3);
    }

    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    const timeLabels = 10;
    for (let i = 0; i <= timeLabels; i++) {
      const idx = Math.floor((i / timeLabels) * (candles.length - 1));
      if (candles[idx]) {
        const x = padding.left + idx * candleSpacing + panOffset.x;
        const date = new Date(candles[idx].time);
        const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        ctx.fillText(timeStr, x, dimensions.height - 10);
      }
    }

    if (zoomLevel !== 1) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, 10, 60, 24);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${(zoomLevel * 100).toFixed(0)}%`, 20, 22);
    }
  }, [candles, heatmap, showHeatmap, currentPrice, dimensions, indicators, drawings, showVWAP, showCVD, showBollinger, zoomLevel, panOffset, crosshair]);

  const padding = { top: 20, right: 80, bottom: 30, left: 10 };

  let maxHeatmapValue = 0;
  for (const col of heatmap) {
    for (const cell of col) {
      if (cell.value > maxHeatmapValue) maxHeatmapValue = cell.value;
    }
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-[#0a0a0c] relative select-none"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={handleDoubleClick}
      style={{ cursor: isDragging ? 'grabbing' : 'crosshair' }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: dimensions.width, height: dimensions.height }}
        className="block"
      />

      {/* Heatmap Color Legend */}
      {showHeatmap && maxHeatmapValue > 0 && (
        <div className="absolute top-4 left-4 bg-zinc-900/90 border border-zinc-700 rounded-lg p-2 pointer-events-none">
          <div className="text-[10px] text-zinc-400 mb-1.5 font-medium">Order Book Depth</div>
          <div className="flex gap-3">
            <div className="flex flex-col items-center gap-1">
              <div className="text-[9px] text-cyan-400 font-medium">BID</div>
              <div
                className="w-3 h-16 rounded"
                style={{
                  background: `linear-gradient(to bottom, rgb(100, 200, 255), rgb(30, 100, 180), rgb(10, 25, 50))`
                }}
              />
              <div className="flex flex-col items-center text-[8px] text-zinc-500">
                <span>{maxHeatmapValue}</span>
                <span className="mt-8">0</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="text-[9px] text-pink-400 font-medium">ASK</div>
              <div
                className="w-3 h-16 rounded"
                style={{
                  background: `linear-gradient(to bottom, rgb(255, 100, 120), rgb(180, 50, 80), rgb(40, 15, 25))`
                }}
              />
              <div className="flex flex-col items-center text-[8px] text-zinc-500">
                <span>{maxHeatmapValue}</span>
                <span className="mt-8">0</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-50 bg-zinc-900/95 border border-zinc-700 rounded-lg px-3 py-2.5 text-xs shadow-xl backdrop-blur-sm"
          style={{
            left: Math.min(tooltip.x + 15, dimensions.width - 200),
            top: Math.min(tooltip.y + 15, dimensions.height - 120),
          }}
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span
                className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                  tooltip.type === 'bid'
                    ? 'text-cyan-400 bg-cyan-400/10'
                    : 'text-pink-400 bg-pink-400/10'
                }`}
              >
                {tooltip.type === 'bid' ? 'BID' : 'ASK'}
              </span>
              <span className="text-white font-mono">${tooltip.price.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Orders:</span>
              <span className={`font-bold ${
                tooltip.intensity > 0.7 ? 'text-amber-400' :
                tooltip.intensity > 0.4 ? 'text-emerald-400' : 'text-zinc-300'
              }`}>
                {tooltip.value}
              </span>
              <div className="w-12 h-1.5 rounded-full bg-zinc-700 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    tooltip.type === 'bid' ? 'bg-cyan-400' : 'bg-pink-400'
                  }`}
                  style={{ width: `${tooltip.intensity * 100}%` }}
                />
              </div>
            </div>
            <div className="text-zinc-500 text-[10px]">
              {new Date(tooltip.time).toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}

      {zoomLevel === 1 && panOffset.x === 0 && panOffset.y === 0 && (
        <div className="absolute bottom-14 left-4 text-zinc-600 text-[10px] pointer-events-none">
          Scroll to zoom | Drag to pan | Double-click to reset
        </div>
      )}

      {showFootprint && dimensions.width > 0 && (
        <FootprintOverlay
          candles={candles}
          width={dimensions.width}
          height={dimensions.height}
          padding={padding}
        />
      )}
      {showVolumeBubbles && dimensions.width > 0 && (
        <VolumeBubbles
          candles={candles}
          width={dimensions.width}
          height={dimensions.height}
          padding={padding}
        />
      )}
    </div>
  );
}

function drawIndicatorLine(
  ctx: CanvasRenderingContext2D,
  data: IndicatorData[],
  candles: CandleData[],
  padding: { top: number; right: number; bottom: number; left: number },
  candleSpacing: number,
  priceToY: (price: number) => number,
  color: string
) {
  if (data.length === 0) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();

  for (let i = 0; i < data.length; i++) {
    const candleIdx = candles.findIndex(c => c.time === data[i].time);
    if (candleIdx === -1) continue;

    const x = padding.left + candleIdx * candleSpacing + candleSpacing / 2;
    const y = priceToY(data[i].value);

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();
}
