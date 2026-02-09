"use client";

import React, { useState } from 'react';
import {
  Plus,
  BarChart2,
  LineChart,
  BookOpen,
  Activity,
  TrendingUp,
  Zap,
  List,
  Terminal,
} from 'lucide-react';

export type WidgetType =
  | 'dom'
  | 'chart'
  | 'orderbook'
  | 'trades'
  | 'stats'
  | 'liquidations'
  | 'watchlist'
  | 'terminal';

interface WidgetOption {
  id: WidgetType;
  name: string;
  icon: React.ReactNode;
  description: string;
}

interface WidgetMenuProps {
  onSelectWidget: (widget: WidgetType) => void;
}

const WIDGET_OPTIONS: WidgetOption[] = [
  {
    id: 'dom',
    name: 'Dom',
    icon: <BookOpen className="w-4 h-4" />,
    description: 'Depth of Market',
  },
  {
    id: 'chart',
    name: 'Chart',
    icon: <LineChart className="w-4 h-4" />,
    description: 'Candlestick Chart',
  },
  {
    id: 'orderbook',
    name: 'Orderbook',
    icon: <BarChart2 className="w-4 h-4" />,
    description: 'Order Book View',
  },
  {
    id: 'trades',
    name: 'Trades',
    icon: <Activity className="w-4 h-4" />,
    description: 'Time & Sales',
  },
  {
    id: 'stats',
    name: 'Stats',
    icon: <TrendingUp className="w-4 h-4" />,
    description: 'Market Statistics',
  },
  {
    id: 'liquidations',
    name: 'Liquidations',
    icon: <Zap className="w-4 h-4" />,
    description: 'Liquidation Events',
  },
  {
    id: 'watchlist',
    name: 'WatchList',
    icon: <List className="w-4 h-4" />,
    description: 'Your Watchlist',
  },
  {
    id: 'terminal',
    name: 'Terminal',
    icon: <Terminal className="w-4 h-4" />,
    description: 'Command Terminal',
  },
];

export function WidgetMenu({ onSelectWidget }: WidgetMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (widget: WidgetType) => {
    onSelectWidget(widget);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-7 px-3 text-xs font-medium flex items-center gap-1.5 rounded transition-colors ${
          isOpen
            ? 'bg-cyan-600 text-white'
            : 'text-cyan-400 hover:bg-zinc-800 hover:text-cyan-300'
        }`}
      >
        <Plus className="w-3.5 h-3.5" />
        Widget
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-50 min-w-[180px] py-1 overflow-hidden">
            {WIDGET_OPTIONS.map((widget) => (
              <button
                key={widget.id}
                type="button"
                onClick={() => handleSelect(widget.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-zinc-800 transition-colors group"
              >
                <span className="text-zinc-400 group-hover:text-cyan-400 transition-colors">
                  {widget.icon}
                </span>
                <span className="text-white text-sm">{widget.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
