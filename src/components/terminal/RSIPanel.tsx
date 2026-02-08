"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { CandleData } from '@/lib/types';
import { calculateRSI, type IndicatorData } from '@/lib/indicators';

interface RSIPanelProps {
  candles: CandleData[];
  height?: number;
  period?: number;
  overbought?: number;
  oversold?: number;
}

export function RSIPanel({
  candles,
  height = 120,
  period = 14,
  overbought = 70,
  oversold = 30,
}: RSIPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [crosshair, setCrosshair] = useState<{ x: number; y: number; value: number; time: number } | null>(null);

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
    const mouseY = e.clientY - rect.top;

    const padding = { top: 15, right: 80, bottom: 20, left: 10 };
    const chartWidth = dimensions.width - padding.left - padding.right;
    const chartHeight = dimensions.height - padding.top - padding.bottom;

    const rsiData = calculateRSI(candles, period);
    if (rsiData.length === 0) return;

    const candleSpacing = chartWidth / candles.length;
    const candleIndex = Math.floor((mouseX - padding.left) / candleSpacing);

    if (candleIndex >= 0 && candleIndex < rsiData.length) {
      const rsiIdx = Math.min(candleIndex, rsiData.length - 1);
      const value = rsiData[rsiIdx]?.value || 0;
      const y = padding.top + chartHeight - (value / 100) * chartHeight;

      setCrosshair({
        x: mouseX,
        y: mouseY,
        value,
        time: rsiData[rsiIdx]?.time || 0,
      });
    }
  }, [candles, dimensions, period]);

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

    // Grid lines
    ctx.strokeStyle = '#1a1a1f';
    ctx.lineWidth = 1;

    // Draw horizontal lines at key levels
    const levels = [0, oversold, 50, overbought, 100];
    for (const level of levels) {
      const y = padding.top + chartHeight - (level / 100) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(dimensions.width - padding.right, y);
      ctx.stroke();
    }

    // Draw overbought/oversold zones
    const overboughtY = padding.top + chartHeight - (overbought / 100) * chartHeight;
    const oversoldY = padding.top + chartHeight - (oversold / 100) * chartHeight;
    const midY = padding.top + chartHeight - 0.5 * chartHeight;

    // Overbought zone (red tint)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
    ctx.fillRect(padding.left, padding.top, chartWidth, overboughtY - padding.top);

    // Oversold zone (green tint)
    ctx.fillStyle = 'rgba(34, 197, 94, 0.08)';
    ctx.fillRect(padding.left, oversoldY, chartWidth, padding.top + chartHeight - oversoldY);

    // Calculate RSI
    const rsiData = calculateRSI(candles, period);
    if (rsiData.length === 0) return;

    const candleSpacing = chartWidth / candles.length;

    // Draw RSI line with gradient based on value
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Create gradient stroke
    for (let i = 1; i < rsiData.length; i++) {
      const prevData = rsiData[i - 1];
      const currData = rsiData[i];

      const prevCandleIdx = candles.findIndex(c => c.time === prevData.time);
      const currCandleIdx = candles.findIndex(c => c.time === currData.time);

      if (prevCandleIdx === -1 || currCandleIdx === -1) continue;

      const x1 = padding.left + prevCandleIdx * candleSpacing + candleSpacing / 2;
      const y1 = padding.top + chartHeight - (prevData.value / 100) * chartHeight;
      const x2 = padding.left + currCandleIdx * candleSpacing + candleSpacing / 2;
      const y2 = padding.top + chartHeight - (currData.value / 100) * chartHeight;

      // Color based on RSI value
      let color: string;
      if (currData.value >= overbought) {
        color = '#ef4444'; // Red - overbought
      } else if (currData.value <= oversold) {
        color = '#22c55e'; // Green - oversold
      } else {
        color = '#8b5cf6'; // Purple - neutral
      }

      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Draw current value dot
    if (rsiData.length > 0) {
      const lastRsi = rsiData[rsiData.length - 1];
      const lastCandleIdx = candles.findIndex(c => c.time === lastRsi.time);
      if (lastCandleIdx !== -1) {
        const x = padding.left + lastCandleIdx * candleSpacing + candleSpacing / 2;
        const y = padding.top + chartHeight - (lastRsi.value / 100) * chartHeight;

        let dotColor: string;
        if (lastRsi.value >= overbought) {
          dotColor = '#ef4444';
        } else if (lastRsi.value <= oversold) {
          dotColor = '#22c55e';
        } else {
          dotColor = '#8b5cf6';
        }

        ctx.fillStyle = dotColor;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Current value label
        ctx.fillStyle = dotColor;
        ctx.fillRect(dimensions.width - padding.right, y - 10, padding.right - 5, 20);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(lastRsi.value.toFixed(1), dimensions.width - padding.right + 5, y);
      }
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

      // Crosshair value label
      ctx.fillStyle = 'rgba(60, 60, 70, 0.95)';
      ctx.fillRect(crosshair.x - 25, dimensions.height - padding.bottom + 2, 50, 16);
      ctx.fillStyle = '#fff';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(crosshair.value.toFixed(1), crosshair.x, dimensions.height - padding.bottom + 12);
    }

    // Y-axis labels
    ctx.fillStyle = '#666';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    for (const level of levels) {
      const y = padding.top + chartHeight - (level / 100) * chartHeight;
      ctx.fillText(level.toString(), dimensions.width - 5, y + 3);
    }

    // Panel label
    ctx.fillStyle = '#8b5cf6';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`RSI (${period})`, padding.left + 5, 12);

  }, [candles, dimensions, period, overbought, oversold, crosshair]);

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
    </div>
  );
}
