"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { CandleData } from '@/lib/types';

interface VolumeBubblesProps {
  candles: CandleData[];
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

interface Bubble {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
  volume: number;
}

export function VolumeBubbles({
  candles,
  width,
  height,
  padding,
}: VolumeBubblesProps) {
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

    // Calculate volume range for normalization
    const maxVolume = Math.max(...candles.map(c => c.volume));
    const minVolume = Math.min(...candles.map(c => c.volume));

    // Generate bubbles for each candle
    const bubbles: Bubble[] = [];

    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      const isBullish = candle.close >= candle.open;

      // Normalize volume to get bubble size (3-20 radius)
      const volumeNorm = (candle.volume - minVolume) / (maxVolume - minVolume || 1);
      const baseRadius = 4 + volumeNorm * 16;

      // Position at close price
      const x = padding.left + i * candleSpacing + candleSpacing / 2;
      const y = priceToY(candle.close);

      // Color based on direction
      const color = isBullish ? '34, 197, 94' : '239, 68, 68'; // Green or Red

      // Alpha based on volume significance
      const alpha = 0.3 + volumeNorm * 0.4;

      bubbles.push({
        x,
        y,
        radius: baseRadius,
        color,
        alpha,
        volume: candle.volume,
      });

      // Add additional bubbles for high volume candles at different price levels
      if (volumeNorm > 0.5) {
        // Add bubble at high
        bubbles.push({
          x,
          y: priceToY(candle.high),
          radius: baseRadius * 0.5,
          color,
          alpha: alpha * 0.6,
          volume: candle.volume * 0.3,
        });

        // Add bubble at low
        bubbles.push({
          x,
          y: priceToY(candle.low),
          radius: baseRadius * 0.5,
          color,
          alpha: alpha * 0.6,
          volume: candle.volume * 0.3,
        });
      }
    }

    // Draw bubbles with glow effect
    for (const bubble of bubbles) {
      // Outer glow
      const gradient = ctx.createRadialGradient(
        bubble.x, bubble.y, 0,
        bubble.x, bubble.y, bubble.radius * 2
      );
      gradient.addColorStop(0, `rgba(${bubble.color}, ${bubble.alpha})`);
      gradient.addColorStop(0.5, `rgba(${bubble.color}, ${bubble.alpha * 0.3})`);
      gradient.addColorStop(1, `rgba(${bubble.color}, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.radius * 2, 0, Math.PI * 2);
      ctx.fill();

      // Inner bubble
      ctx.fillStyle = `rgba(${bubble.color}, ${bubble.alpha + 0.2})`;
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
      ctx.fill();

      // Highlight
      ctx.fillStyle = `rgba(255, 255, 255, 0.3)`;
      ctx.beginPath();
      ctx.arc(
        bubble.x - bubble.radius * 0.3,
        bubble.y - bubble.radius * 0.3,
        bubble.radius * 0.3,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Draw volume labels for significant bubbles
    if (candleSpacing > 20) {
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (const bubble of bubbles) {
        if (bubble.radius > 12) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          const volumeLabel = formatVolume(bubble.volume);
          ctx.fillText(volumeLabel, bubble.x, bubble.y);
        }
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
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(1)}M`;
  }
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}K`;
  }
  return volume.toFixed(0);
}
