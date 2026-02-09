"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { CandleData } from '@/lib/types';
import { calculateMACD, type MACDData } from '@/lib/indicators';

interface MACDPanelProps {
  candles: CandleData[];
  height?: number;
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
}

export function MACDPanel({
  candles,
  height = 120,
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
}: MACDPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [crosshair, setCrosshair] = useState<{ x: number; macd: number; signal: number; histogram: number; time: number } | null>(null);

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

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    const padding = { top: 15, right: 80, bottom: 20, left: 10 };
    const chartWidth = dimensions.width - padding.left - padding.right;

    const macdData = calculateMACD(candles, fastPeriod, slowPeriod, signalPeriod);
    if (macdData.length === 0) return;

    const candleSpacing = chartWidth / candles.length;
    const candleIndex = Math.floor((mouseX - padding.left) / candleSpacing);

    // Find the closest MACD data point
    const dataStartIdx = candles.length - macdData.length;
    const macdIdx = candleIndex - dataStartIdx;

    if (macdIdx >= 0 && macdIdx < macdData.length) {
      const data = macdData[macdIdx];
      setCrosshair({
        x: mouseX,
        macd: data.macd,
        signal: data.signal,
        histogram: data.histogram,
        time: data.time,
      });
    }
  }, [candles, dimensions, fastPeriod, slowPeriod, signalPeriod]);

  const handleMouseLeave = useCallback(() => {
    setCrosshair(null);
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

    const padding = { top: 15, right: 80, bottom: 20, left: 10 };
    const chartWidth = dimensions.width - padding.left - padding.right;
    const chartHeight = dimensions.height - padding.top - padding.bottom;

    // Background
    ctx.fillStyle = '#0c0c0e';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Calculate MACD
    const macdData = calculateMACD(candles, fastPeriod, slowPeriod, signalPeriod);
    if (macdData.length === 0) return;

    // Find min/max for scaling
    let minVal = Number.POSITIVE_INFINITY;
    let maxVal = Number.NEGATIVE_INFINITY;
    for (const d of macdData) {
      minVal = Math.min(minVal, d.macd, d.signal, d.histogram);
      maxVal = Math.max(maxVal, d.macd, d.signal, d.histogram);
    }

    // Add some padding to range
    const range = maxVal - minVal;
    minVal -= range * 0.1;
    maxVal += range * 0.1;
    const valueRange = maxVal - minVal;

    const valueToY = (value: number) =>
      padding.top + chartHeight - ((value - minVal) / valueRange) * chartHeight;

    const candleSpacing = chartWidth / candles.length;

    // Draw zero line
    const zeroY = valueToY(0);
    ctx.strokeStyle = '#2a2a2f';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, zeroY);
    ctx.lineTo(dimensions.width - padding.right, zeroY);
    ctx.stroke();

    // Draw histogram bars
    const barWidth = Math.max(1, candleSpacing * 0.6);
    const dataStartIdx = candles.length - macdData.length;

    for (let i = 0; i < macdData.length; i++) {
      const data = macdData[i];
      const candleIdx = dataStartIdx + i;
      const x = padding.left + candleIdx * candleSpacing + candleSpacing / 2;
      const barTop = valueToY(data.histogram);

      // Color based on histogram direction and value
      const prevHist = i > 0 ? macdData[i - 1].histogram : 0;
      const isIncreasing = data.histogram > prevHist;

      if (data.histogram >= 0) {
        ctx.fillStyle = isIncreasing ? '#22c55e' : '#166534'; // Green shades
      } else {
        ctx.fillStyle = isIncreasing ? '#b91c1c' : '#ef4444'; // Red shades
      }

      ctx.fillRect(
        x - barWidth / 2,
        Math.min(zeroY, barTop),
        barWidth,
        Math.abs(barTop - zeroY)
      );
    }

    // Draw MACD line
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < macdData.length; i++) {
      const candleIdx = dataStartIdx + i;
      const x = padding.left + candleIdx * candleSpacing + candleSpacing / 2;
      const y = valueToY(macdData[i].macd);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw Signal line
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < macdData.length; i++) {
      const candleIdx = dataStartIdx + i;
      const x = padding.left + candleIdx * candleSpacing + candleSpacing / 2;
      const y = valueToY(macdData[i].signal);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw current values
    if (macdData.length > 0) {
      const lastData = macdData[macdData.length - 1];
      const lastCandleIdx = dataStartIdx + macdData.length - 1;
      const x = padding.left + lastCandleIdx * candleSpacing + candleSpacing / 2;

      // MACD dot
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(x, valueToY(lastData.macd), 3, 0, Math.PI * 2);
      ctx.fill();

      // Signal dot
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(x, valueToY(lastData.signal), 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw crosshair
    if (crosshair) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      ctx.moveTo(crosshair.x, padding.top);
      ctx.lineTo(crosshair.x, dimensions.height - padding.bottom);
      ctx.stroke();

      ctx.setLineDash([]);
    }

    // Y-axis labels
    ctx.fillStyle = '#666';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const value = maxVal - (valueRange / gridLines) * i;
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.fillText(value.toFixed(2), dimensions.width - 5, y + 3);

      // Grid line
      ctx.strokeStyle = '#1a1a1f';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(dimensions.width - padding.right, y);
      ctx.stroke();
    }

    // Panel label and legend
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#3b82f6';
    ctx.fillText(`MACD`, padding.left + 5, 12);

    ctx.fillStyle = '#666';
    ctx.font = '9px monospace';
    ctx.fillText(`(${fastPeriod},${slowPeriod},${signalPeriod})`, padding.left + 45, 12);

    // Legend
    const legendX = padding.left + 110;
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(legendX, 6, 8, 8);
    ctx.fillStyle = '#888';
    ctx.fillText('MACD', legendX + 12, 12);

    ctx.fillStyle = '#f97316';
    ctx.fillRect(legendX + 50, 6, 8, 8);
    ctx.fillStyle = '#888';
    ctx.fillText('Signal', legendX + 62, 12);

  }, [candles, dimensions, fastPeriod, slowPeriod, signalPeriod, crosshair]);

  return (
    <div
      ref={containerRef}
      className="w-full border-t border-zinc-800 bg-[#0c0c0e]"
      style={{ height }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <canvas
        ref={canvasRef}
        style={{ width: dimensions.width, height: dimensions.height }}
        className="block cursor-crosshair"
      />

      {/* Crosshair tooltip */}
      {crosshair && (
        <div className="absolute bottom-6 left-4 bg-zinc-900/95 border border-zinc-700 rounded px-2 py-1 text-[10px] flex gap-3 pointer-events-none">
          <span className="text-blue-400">MACD: {crosshair.macd.toFixed(4)}</span>
          <span className="text-orange-400">Signal: {crosshair.signal.toFixed(4)}</span>
          <span className={crosshair.histogram >= 0 ? 'text-green-400' : 'text-red-400'}>
            Hist: {crosshair.histogram.toFixed(4)}
          </span>
        </div>
      )}
    </div>
  );
}
