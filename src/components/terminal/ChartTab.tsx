"use client";

import React from 'react';
import { X } from 'lucide-react';

interface ChartTabProps {
  symbol: string;
  exchange: string;
  timeframe: string;
  active: boolean;
  onClose?: () => void;
  onClick: () => void;
}

export function ChartTab({
  symbol,
  exchange,
  timeframe,
  active,
  onClose,
  onClick,
}: ChartTabProps) {
  return (
    <button
      type="button"
      className={`h-7 px-3 flex items-center gap-2 text-sm rounded-t-sm border-b-2 transition-colors ${
        active
          ? 'bg-zinc-800 border-cyan-500 text-white'
          : 'bg-zinc-900 border-transparent text-zinc-400 hover:text-white hover:bg-zinc-800'
      }`}
      onClick={onClick}
    >
      <span className="font-medium">
        {symbol.toLowerCase()} {exchange.toLowerCase()} {timeframe}
      </span>
      {onClose && (
        <span
          className="hover:bg-zinc-700 rounded p-0.5"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              onClose();
            }
          }}
        >
          <X className="w-3 h-3" />
        </span>
      )}
    </button>
  );
}
