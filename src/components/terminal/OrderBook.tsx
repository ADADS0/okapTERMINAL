"use client";

import React, { useMemo } from 'react';
import type { OrderBookUpdate } from '@/lib/binance';

interface OrderBookProps {
  data: OrderBookUpdate;
  currentPrice: number;
}

export function OrderBook({ data, currentPrice }: OrderBookProps) {
  const { bids, asks } = useMemo(() => {
    // Parse and sort bids (highest first)
    const parsedBids = data.bids
      .slice(0, 15)
      .map(([price, qty]) => ({
        price: parseFloat(price),
        quantity: parseFloat(qty),
      }))
      .sort((a, b) => b.price - a.price);

    // Parse and sort asks (lowest first)
    const parsedAsks = data.asks
      .slice(0, 15)
      .map(([price, qty]) => ({
        price: parseFloat(price),
        quantity: parseFloat(qty),
      }))
      .sort((a, b) => a.price - b.price);

    return { bids: parsedBids, asks: parsedAsks };
  }, [data]);

  // Calculate max quantity for bar sizing
  const maxQty = useMemo(() => {
    const allQty = [...bids, ...asks].map((o) => o.quantity);
    return Math.max(...allQty, 1);
  }, [bids, asks]);

  return (
    <div className="h-full bg-[#0a0a0c] flex flex-col text-xs font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-zinc-800 text-zinc-500">
        <span>Price</span>
        <span>Qty</span>
      </div>

      {/* Asks (sells) - displayed top to bottom, highest to lowest */}
      <div className="flex-1 flex flex-col justify-end overflow-hidden">
        {asks
          .slice()
          .reverse()
          .map((ask, i) => (
            <div key={`ask-${i}`} className="relative flex items-center justify-between px-2 py-0.5">
              {/* Background bar */}
              <div
                className="absolute right-0 top-0 h-full bg-red-500/20"
                style={{ width: `${(ask.quantity / maxQty) * 100}%` }}
              />
              <span className="relative text-red-400">{ask.price.toFixed(2)}</span>
              <span className="relative text-zinc-400">{ask.quantity.toFixed(4)}</span>
            </div>
          ))}
      </div>

      {/* Current Price Divider */}
      <div className="flex items-center justify-center py-2 border-y border-zinc-700 bg-zinc-900/50">
        <span className="text-amber-500 font-bold text-sm">
          {currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* Bids (buys) - displayed top to bottom, highest to lowest */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {bids.map((bid, i) => (
          <div key={`bid-${i}`} className="relative flex items-center justify-between px-2 py-0.5">
            {/* Background bar */}
            <div
              className="absolute right-0 top-0 h-full bg-emerald-500/20"
              style={{ width: `${(bid.quantity / maxQty) * 100}%` }}
            />
            <span className="relative text-emerald-400">{bid.price.toFixed(2)}</span>
            <span className="relative text-zinc-400">{bid.quantity.toFixed(4)}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-2 py-1 border-t border-zinc-800 text-zinc-600">
        <span>Order Book</span>
        <span className="text-[10px]">L2</span>
      </div>
    </div>
  );
}
