"use client";

import React, { useState } from 'react';
import { ChevronDown, Activity, TrendingUp, BarChart2, Waves, Target, Eye, EyeOff } from 'lucide-react';

interface ChartHeaderProps {
  symbol: string;
  exchange: string;
  timeframe: string;
  priceInfo: {
    open: number;
    high: number;
    low: number;
    close: number;
    change: number;
  };
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  showVWAP?: boolean;
  onToggleVWAP?: () => void;
  showCVD?: boolean;
  onToggleCVD?: () => void;
  showFootprint?: boolean;
  onToggleFootprint?: () => void;
  showRSI?: boolean;
  onToggleRSI?: () => void;
  showMACD?: boolean;
  onToggleMACD?: () => void;
  showBollinger?: boolean;
  onToggleBollinger?: () => void;
}

interface IndicatorOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  onToggle: () => void;
  color: string;
  category: 'overlay' | 'oscillator';
}

export function ChartHeader({
  symbol,
  exchange,
  timeframe,
  priceInfo,
  showHeatmap,
  onToggleHeatmap,
  showVWAP = false,
  onToggleVWAP,
  showCVD = false,
  onToggleCVD,
  showFootprint = false,
  onToggleFootprint,
  showRSI = false,
  onToggleRSI,
  showMACD = false,
  onToggleMACD,
  showBollinger = false,
  onToggleBollinger,
}: ChartHeaderProps) {
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
  const isPositive = priceInfo.change >= 0;

  const indicators: IndicatorOption[] = [
    {
      id: 'heatmap',
      name: 'Order Book Heatmap',
      description: 'Visualize order book depth',
      icon: <Target className="w-3.5 h-3.5" />,
      enabled: showHeatmap,
      onToggle: onToggleHeatmap,
      color: 'cyan',
      category: 'overlay',
    },
    {
      id: 'vwap',
      name: 'VWAP',
      description: 'Volume Weighted Average Price',
      icon: <Waves className="w-3.5 h-3.5" />,
      enabled: showVWAP,
      onToggle: onToggleVWAP || (() => {}),
      color: 'amber',
      category: 'overlay',
    },
    {
      id: 'bollinger',
      name: 'Bollinger Bands',
      description: 'Volatility indicator with bands',
      icon: <TrendingUp className="w-3.5 h-3.5" />,
      enabled: showBollinger,
      onToggle: onToggleBollinger || (() => {}),
      color: 'gray',
      category: 'overlay',
    },
    {
      id: 'footprint',
      name: 'Footprint Chart',
      description: 'Volume at price levels',
      icon: <BarChart2 className="w-3.5 h-3.5" />,
      enabled: showFootprint,
      onToggle: onToggleFootprint || (() => {}),
      color: 'cyan',
      category: 'overlay',
    },
    {
      id: 'cvd',
      name: 'CVD Panel',
      description: 'Cumulative Volume Delta',
      icon: <Activity className="w-3.5 h-3.5" />,
      enabled: showCVD,
      onToggle: onToggleCVD || (() => {}),
      color: 'purple',
      category: 'oscillator',
    },
    {
      id: 'rsi',
      name: 'RSI',
      description: 'Relative Strength Index (14)',
      icon: <Activity className="w-3.5 h-3.5" />,
      enabled: showRSI,
      onToggle: onToggleRSI || (() => {}),
      color: 'violet',
      category: 'oscillator',
    },
    {
      id: 'macd',
      name: 'MACD',
      description: 'Moving Average Convergence Divergence',
      icon: <BarChart2 className="w-3.5 h-3.5" />,
      enabled: showMACD,
      onToggle: onToggleMACD || (() => {}),
      color: 'blue',
      category: 'oscillator',
    },
  ];

  const overlayIndicators = indicators.filter(i => i.category === 'overlay');
  const oscillatorIndicators = indicators.filter(i => i.category === 'oscillator');

  const activeCount = indicators.filter(i => i.enabled).length;

  return (
    <div className="flex flex-col gap-0.5 px-3 py-1.5 bg-zinc-900/50 border-b border-zinc-800/50">
      {/* Symbol Row */}
      <div className="flex items-center gap-3 text-xs">
        <span className="text-yellow-500">◆</span>
        <span className="text-cyan-400 font-medium">
          {symbol} {exchange} {timeframe}
        </span>
        <span className="text-zinc-500">O</span>
        <span className={isPositive ? 'text-green-400' : 'text-red-400'}>
          {priceInfo.open.toFixed(2)}
        </span>
        <span className="text-zinc-500">H</span>
        <span className={isPositive ? 'text-green-400' : 'text-red-400'}>
          {priceInfo.high.toFixed(2)}
        </span>
        <span className="text-zinc-500">L</span>
        <span className={isPositive ? 'text-green-400' : 'text-red-400'}>
          {priceInfo.low.toFixed(2)}
        </span>
        <span className="text-zinc-500">C</span>
        <span className={isPositive ? 'text-green-400' : 'text-red-400'}>
          {priceInfo.close.toFixed(2)}
        </span>
        <span className="text-zinc-500">D</span>
        <span className={isPositive ? 'text-green-400' : 'text-red-400'}>
          {isPositive ? '+' : ''}{priceInfo.change.toFixed(0)}
        </span>
      </div>

      {/* Indicators Row */}
      <div className="flex items-center gap-2 text-xs">
        {/* Indicator Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowIndicatorMenu(!showIndicatorMenu)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
              showIndicatorMenu || activeCount > 0
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="font-medium">Indicators</span>
            {activeCount > 0 && (
              <span className="bg-cyan-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {activeCount}
              </span>
            )}
            <ChevronDown className={`w-3 h-3 transition-transform ${showIndicatorMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {showIndicatorMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowIndicatorMenu(false)}
              />
              <div className="absolute left-0 top-full mt-1 w-72 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-50 overflow-hidden">
                {/* Overlay Indicators */}
                <div className="px-3 py-2 bg-zinc-800/50 border-b border-zinc-700">
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">Overlays</span>
                </div>
                <div className="py-1">
                  {overlayIndicators.map((indicator) => (
                    <button
                      key={indicator.id}
                      type="button"
                      onClick={() => {
                        indicator.onToggle();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-800 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-${indicator.color}-400`}>{indicator.icon}</span>
                        <div className="text-left">
                          <div className="text-sm text-white">{indicator.name}</div>
                          <div className="text-[10px] text-zinc-500">{indicator.description}</div>
                        </div>
                      </div>
                      {indicator.enabled ? (
                        <Eye className={`w-4 h-4 text-${indicator.color}-400`} />
                      ) : (
                        <EyeOff className="w-4 h-4 text-zinc-600" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Oscillator Indicators */}
                <div className="px-3 py-2 bg-zinc-800/50 border-y border-zinc-700">
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">Oscillators</span>
                </div>
                <div className="py-1">
                  {oscillatorIndicators.map((indicator) => (
                    <button
                      key={indicator.id}
                      type="button"
                      onClick={() => {
                        indicator.onToggle();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-800 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-${indicator.color}-400`}>{indicator.icon}</span>
                        <div className="text-left">
                          <div className="text-sm text-white">{indicator.name}</div>
                          <div className="text-[10px] text-zinc-500">{indicator.description}</div>
                        </div>
                      </div>
                      {indicator.enabled ? (
                        <Eye className={`w-4 h-4 text-${indicator.color}-400`} />
                      ) : (
                        <EyeOff className="w-4 h-4 text-zinc-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Quick toggle buttons for active indicators */}
        {showHeatmap && (
          <button
            type="button"
            onClick={onToggleHeatmap}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors"
          >
            <Target className="w-3 h-3" />
            <span className="font-medium">Heatmap</span>
          </button>
        )}

        {showVWAP && onToggleVWAP && (
          <button
            type="button"
            onClick={onToggleVWAP}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-amber-400 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
          >
            <Waves className="w-3 h-3" />
            <span className="font-medium">VWAP</span>
          </button>
        )}

        {showBollinger && onToggleBollinger && (
          <button
            type="button"
            onClick={onToggleBollinger}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-gray-400 bg-gray-500/10 border border-gray-500/30 hover:bg-gray-500/20 transition-colors"
          >
            <TrendingUp className="w-3 h-3" />
            <span className="font-medium">BB</span>
          </button>
        )}

        {showCVD && onToggleCVD && (
          <button
            type="button"
            onClick={onToggleCVD}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-purple-400 bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 transition-colors"
          >
            <Activity className="w-3 h-3" />
            <span className="font-medium">CVD</span>
          </button>
        )}

        {showRSI && onToggleRSI && (
          <button
            type="button"
            onClick={onToggleRSI}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-violet-400 bg-violet-500/10 border border-violet-500/30 hover:bg-violet-500/20 transition-colors"
          >
            <Activity className="w-3 h-3" />
            <span className="font-medium">RSI</span>
          </button>
        )}

        {showMACD && onToggleMACD && (
          <button
            type="button"
            onClick={onToggleMACD}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-blue-400 bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-colors"
          >
            <BarChart2 className="w-3 h-3" />
            <span className="font-medium">MACD</span>
          </button>
        )}

        {showFootprint && onToggleFootprint && (
          <button
            type="button"
            onClick={onToggleFootprint}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors"
          >
            <BarChart2 className="w-3 h-3" />
            <span className="font-medium">Footprint</span>
          </button>
        )}

        <span className="text-zinc-500 ml-2">VPVR</span>
      </div>
    </div>
  );
}
