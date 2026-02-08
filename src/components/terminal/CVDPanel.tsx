"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { CandleData } from '@/lib/types';
import { calculateCVD, type CVDData } from '@/lib/indicators';

interface CVDPanelProps {
  candles: CandleData[];
  height?: number;
}

export function CVDPanel({ candles, height = 120 }: CVDPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height });

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({ width: rect.width, height });
    }
  }, [height]);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0 || dimensions.width === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    const padding = { top: 20, right: 80, bottom: 20, left: 10 };
    const chartWidth = dimensions.width - padding.left - padding.right;
    const chartHeight = dimensions.height - padding.top - padding.bottom;

    // Calculate CVD data
    const cvdData = calculateCVD(candles);
    if (cvdData.length === 0) return;

    // Find CVD range
    const minCVD = Math.min(...cvdData.map((d) => d.cvd));
    const maxCVD = Math.max(...cvdData.map((d) => d.cvd));
    const cvdRange = maxCVD - minCVD || 1;

    // Helper functions
    const cvdToY = (cvd: number) =>
      padding.top + chartHeight - ((cvd - minCVD) / cvdRange) * chartHeight;

    const candleSpacing = chartWidth / candles.length;

    // Clear canvas
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Draw grid lines
    ctx.strokeStyle = '#1a1a1f';
    ctx.lineWidth = 1;
    const gridLines = 3;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(dimensions.width - padding.right, y);
      ctx.stroke();
    }

    // Draw zero line if CVD crosses zero
    if (minCVD < 0 && maxCVD > 0) {
      const zeroY = cvdToY(0);
      ctx.strokeStyle = '#3f3f46';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, zeroY);
      ctx.lineTo(dimensions.width - padding.right, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw delta bars (histogram)
    const barWidth = Math.max(2, (chartWidth / candles.length) * 0.6);
    const zeroY = cvdToY(0);

    for (let i = 0; i < cvdData.length; i++) {
      const delta = cvdData[i].delta;
      const x = padding.left + i * candleSpacing + candleSpacing / 2;
      const deltaY = cvdToY(delta > 0 ? delta : 0);
      const barHeight = Math.abs(cvdToY(0) - cvdToY(Math.abs(delta)));

      // Color based on delta direction
      if (delta >= 0) {
        ctx.fillStyle = 'rgba(34, 197, 94, 0.4)'; // Green for positive
      } else {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.4)'; // Red for negative
      }

      ctx.fillRect(
        x - barWidth / 2,
        delta >= 0 ? deltaY : zeroY,
        barWidth,
        Math.max(1, barHeight * 0.3)
      );
    }

    // Draw CVD line
    ctx.strokeStyle = '#a855f7'; // Purple
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < cvdData.length; i++) {
      const x = padding.left + i * candleSpacing + candleSpacing / 2;
      const y = cvdToY(cvdData[i].cvd);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Draw gradient fill under CVD line
    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
    gradient.addColorStop(0, 'rgba(168, 85, 247, 0.3)');
    gradient.addColorStop(1, 'rgba(168, 85, 247, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(padding.left, cvdToY(cvdData[0].cvd));

    for (let i = 1; i < cvdData.length; i++) {
      const x = padding.left + i * candleSpacing + candleSpacing / 2;
      const y = cvdToY(cvdData[i].cvd);
      ctx.lineTo(x, y);
    }

    // Close the path
    ctx.lineTo(padding.left + (cvdData.length - 1) * candleSpacing + candleSpacing / 2, padding.top + chartHeight);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.closePath();
    ctx.fill();

    // Draw CVD value labels on right axis
    ctx.fillStyle = '#666';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';

    const labels = [maxCVD, (maxCVD + minCVD) / 2, minCVD];
    for (let i = 0; i < labels.length; i++) {
      const y = padding.top + (chartHeight / 2) * i;
      const value = labels[i];
      const formatted = value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` :
                        value >= 1000 ? `${(value / 1000).toFixed(1)}K` :
                        value.toFixed(0);
      ctx.fillText(formatted, dimensions.width - 5, y + 3);
    }

    // Draw current CVD value
    if (cvdData.length > 0) {
      const lastCVD = cvdData[cvdData.length - 1].cvd;
      const lastY = cvdToY(lastCVD);
      const formatted = lastCVD >= 1000000 ? `${(lastCVD / 1000000).toFixed(2)}M` :
                        lastCVD >= 1000 ? `${(lastCVD / 1000).toFixed(2)}K` :
                        lastCVD.toFixed(0);

      // Draw tag
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(dimensions.width - padding.right, lastY - 8, padding.right - 5, 16);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(formatted, dimensions.width - padding.right + 3, lastY + 3);
    }

    // Draw title
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('CVD', padding.left + 5, padding.top - 5);

  }, [candles, dimensions]);

  return (
    <div ref={containerRef} className="w-full bg-[#0a0a0c] border-t border-zinc-800" style={{ height }}>
      <canvas
        ref={canvasRef}
        style={{ width: dimensions.width, height: dimensions.height }}
        className="block"
      />
    </div>
  );
}
