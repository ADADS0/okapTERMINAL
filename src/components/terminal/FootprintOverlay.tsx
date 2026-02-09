"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { CandleData, FootprintCandle } from '@/lib/types';
import { calculateFootprint } from '@/lib/indicators';

interface FootprintOverlayProps {
  candles: CandleData[];
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export function FootprintOverlay({
  candles,
  width,
  height,
  padding,
}: FootprintOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0 || width === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas (transparent)
    ctx.clearRect(0, 0, width, height);

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Calculate price range
    const minPrice = Math.min(...candles.map(c => c.low)) * 0.998;
    const maxPrice = Math.max(...candles.map(c => c.high)) * 1.002;
    const priceRange = maxPrice - minPrice;

    const priceToY = (price: number) =>
      padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight;

    const candleSpacing = chartWidth / candles.length;

    // Calculate footprint data
    const footprintData = calculateFootprint(candles, 8);

    // Find max volume for normalization
    const maxVolume = Math.max(
      ...footprintData.flatMap(fp =>
        fp.levels.map(l => Math.max(l.bidVolume, l.askVolume))
      )
    );

    // Draw footprint for each candle
    for (let i = 0; i < footprintData.length; i++) {
      const fp = footprintData[i];
      const candle = candles[i];
      const x = padding.left + i * candleSpacing;
      const candleWidth = candleSpacing * 0.9;

      // Draw each level
      for (const level of fp.levels) {
        const y = priceToY(level.price);
        const levelHeight = (candle.high - candle.low) / fp.levels.length;
        const levelHeightPx = (levelHeight / priceRange) * chartHeight;

        // Normalize volumes for display
        const bidWidth = (level.bidVolume / maxVolume) * (candleWidth / 2) * 0.8;
        const askWidth = (level.askVolume / maxVolume) * (candleWidth / 2) * 0.8;

        // Draw bid side (left, green)
        if (bidWidth > 1) {
          const bidAlpha = Math.min(0.3 + (level.bidVolume / maxVolume) * 0.5, 0.8);
          ctx.fillStyle = level.imbalance === 'bid'
            ? `rgba(34, 197, 94, ${bidAlpha + 0.2})`  // Bright green for imbalance
            : `rgba(34, 197, 94, ${bidAlpha})`;

          ctx.fillRect(
            x + candleWidth / 2 - bidWidth,
            y - levelHeightPx / 2,
            bidWidth,
            Math.max(levelHeightPx - 1, 2)
          );

          // Draw imbalance indicator
          if (level.imbalance === 'bid') {
            ctx.fillStyle = '#22c55e';
            ctx.beginPath();
            ctx.arc(x + candleWidth / 2 - bidWidth - 3, y, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Draw ask side (right, red)
        if (askWidth > 1) {
          const askAlpha = Math.min(0.3 + (level.askVolume / maxVolume) * 0.5, 0.8);
          ctx.fillStyle = level.imbalance === 'ask'
            ? `rgba(239, 68, 68, ${askAlpha + 0.2})`  // Bright red for imbalance
            : `rgba(239, 68, 68, ${askAlpha})`;

          ctx.fillRect(
            x + candleWidth / 2,
            y - levelHeightPx / 2,
            askWidth,
            Math.max(levelHeightPx - 1, 2)
          );

          // Draw imbalance indicator
          if (level.imbalance === 'ask') {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(x + candleWidth / 2 + askWidth + 3, y, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Draw volume text for significant levels
        if (candleSpacing > 40 && (level.bidVolume > maxVolume * 0.3 || level.askVolume > maxVolume * 0.3)) {
          ctx.font = '8px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          if (level.bidVolume > maxVolume * 0.3) {
            ctx.fillStyle = '#22c55e';
            ctx.fillText(
              formatVolume(level.bidVolume),
              x + candleWidth / 4,
              y
            );
          }

          if (level.askVolume > maxVolume * 0.3) {
            ctx.fillStyle = '#ef4444';
            ctx.fillText(
              formatVolume(level.askVolume),
              x + (candleWidth * 3) / 4,
              y
            );
          }
        }
      }

      // Draw POC line (Point of Control)
      const pocY = priceToY(fp.pocPrice);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(x, pocY);
      ctx.lineTo(x + candleWidth, pocY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw delta at bottom of candle
      if (candleSpacing > 25) {
        const deltaY = priceToY(candle.low) + 12;
        const deltaValue = fp.totalDelta;
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = deltaValue >= 0 ? '#22c55e' : '#ef4444';
        ctx.fillText(
          formatVolume(deltaValue),
          x + candleWidth / 2,
          Math.min(deltaY, height - padding.bottom - 5)
        );
      }
    }
  }, [candles, width, height, padding]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width,
        height,
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
      }}
      className="block"
    />
  );
}

function formatVolume(volume: number): string {
  const absVolume = Math.abs(volume);
  if (absVolume >= 1000) {
    return `${(volume / 1000).toFixed(1)}K`;
  }
  return volume.toFixed(0);
}
