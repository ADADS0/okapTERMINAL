"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';

interface VPVRData {
  price: number;
  buyVolume: number;
  sellVolume: number;
}

interface VPVRProps {
  data: VPVRData[];
  currentPrice: number;
  minPrice: number;
  maxPrice: number;
}

export function VPVR({ data, currentPrice, minPrice, maxPrice }: VPVRProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0 || dimensions.width === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    const padding = { top: 20, bottom: 30 };
    const chartHeight = dimensions.height - padding.top - padding.bottom;
    const priceRange = maxPrice - minPrice;

    // Clear canvas
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Find max volume for normalization
    const maxVolume = Math.max(...data.map(d => d.buyVolume + d.sellVolume));
    const barHeight = chartHeight / data.length;

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const y = padding.top + chartHeight - (i + 1) * barHeight;

      const buyWidth = (item.buyVolume / maxVolume) * (dimensions.width * 0.45);
      const sellWidth = (item.sellVolume / maxVolume) * (dimensions.width * 0.45);

      // Draw buy volume (green) - from right to left
      ctx.fillStyle = '#26a69a';
      ctx.fillRect(dimensions.width - buyWidth, y, buyWidth, barHeight - 1);

      // Draw sell volume (red) - from right after buy
      ctx.fillStyle = '#ef5350';
      ctx.fillRect(dimensions.width - buyWidth - sellWidth, y, sellWidth, barHeight - 1);
    }

    // Draw current price line
    const priceY = padding.top + chartHeight - ((currentPrice - minPrice) / priceRange) * chartHeight;
    ctx.strokeStyle = '#f5c842';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, priceY);
    ctx.lineTo(dimensions.width, priceY);
    ctx.stroke();
    ctx.setLineDash([]);

  }, [data, currentPrice, minPrice, maxPrice, dimensions]);

  return (
    <div ref={containerRef} className="w-full h-full bg-[#0a0a0c]">
      <canvas
        ref={canvasRef}
        style={{ width: dimensions.width, height: dimensions.height }}
        className="block"
      />
    </div>
  );
}
