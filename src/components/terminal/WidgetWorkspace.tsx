"use client";

import React, { useState, useCallback, useRef } from 'react';
import { DraggableWidget, type WidgetPosition } from './DraggableWidget';
import { ChartWidget } from './ChartWidget';
import { HeatmapWidget } from './HeatmapWidget';
import { TradesWidget } from './TradesWidget';
import { StatsWidget } from './StatsWidget';
import { LiquidationsWidget } from './LiquidationsWidget';
import { OrderBook } from './OrderBook';
import type { WidgetType } from './WidgetMenu';
import type { Symbol as SymbolType, TimeFrame } from '@/lib/types';
import type { OrderBookUpdate } from '@/lib/binance';
import {
  LineChart,
  LayoutGrid,
  Activity,
  TrendingUp,
  Zap,
  BookOpen,
  List,
  Terminal as TerminalIcon,
} from 'lucide-react';

export interface WidgetInstance {
  id: string;
  type: WidgetType;
  position: WidgetPosition;
  title: string;
}

interface WidgetWorkspaceProps {
  widgets: WidgetInstance[];
  onWidgetsChange: (widgets: WidgetInstance[]) => void;
  symbol: SymbolType;
  timeframe: TimeFrame;
  orderBook: OrderBookUpdate | null;
  currentPrice: number;
  onSymbolClick: () => void;
}

const WIDGET_ICONS: Record<WidgetType, React.ReactNode> = {
  chart: <LineChart className="w-3 h-3" />,
  dom: <BookOpen className="w-3 h-3" />,
  orderbook: <LayoutGrid className="w-3 h-3" />,
  trades: <Activity className="w-3 h-3" />,
  stats: <TrendingUp className="w-3 h-3" />,
  liquidations: <Zap className="w-3 h-3" />,
  watchlist: <List className="w-3 h-3" />,
  terminal: <TerminalIcon className="w-3 h-3" />,
};

const DEFAULT_SIZES: Record<WidgetType, { width: number; height: number }> = {
  chart: { width: 550, height: 450 },
  dom: { width: 350, height: 500 },
  orderbook: { width: 280, height: 400 },
  trades: { width: 320, height: 400 },
  stats: { width: 400, height: 350 },
  liquidations: { width: 350, height: 400 },
  watchlist: { width: 300, height: 400 },
  terminal: { width: 500, height: 350 },
};

export function WidgetWorkspace({
  widgets,
  onWidgetsChange,
  symbol,
  timeframe,
  orderBook,
  currentPrice,
  onSymbolClick,
}: WidgetWorkspaceProps) {
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [maxZIndex, setMaxZIndex] = useState(10);

  // Update widget position
  const handlePositionChange = useCallback((id: string, newPosition: Partial<WidgetPosition>) => {
    onWidgetsChange(
      widgets.map((w) =>
        w.id === id ? { ...w, position: { ...w.position, ...newPosition } } : w
      )
    );
  }, [widgets, onWidgetsChange]);

  // Close widget
  const handleClose = useCallback((id: string) => {
    onWidgetsChange(widgets.filter((w) => w.id !== id));
  }, [widgets, onWidgetsChange]);

  // Focus widget (bring to front)
  const handleFocus = useCallback((id: string) => {
    const newZIndex = maxZIndex + 1;
    setMaxZIndex(newZIndex);
    onWidgetsChange(
      widgets.map((w) =>
        w.id === id ? { ...w, position: { ...w.position, zIndex: newZIndex } } : w
      )
    );
  }, [widgets, onWidgetsChange, maxZIndex]);

  // Render widget content based on type
  const renderWidgetContent = (widget: WidgetInstance) => {
    const symbolString = `${symbol.base}/${symbol.quote}`;

    switch (widget.type) {
      case 'chart':
        return (
          <ChartWidget
            symbol={symbol}
            defaultTimeframe={timeframe}
            onSymbolClick={onSymbolClick}
          />
        );
      case 'dom':
      case 'orderbook':
        return orderBook ? (
          <OrderBook data={orderBook} currentPrice={currentPrice} />
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
            Loading order book...
          </div>
        );
      case 'trades':
        return <TradesWidget symbol={symbolString} />;
      case 'stats':
        return <StatsWidget symbol={symbolString} />;
      case 'liquidations':
        return <LiquidationsWidget symbol={symbolString} />;
      case 'watchlist':
        return (
          <div className="flex flex-col h-full p-3 text-zinc-400 text-sm">
            <div className="mb-2 text-xs text-zinc-500 uppercase">Your Watchlist</div>
            <div className="flex-1 flex items-center justify-center text-zinc-600">
              Add symbols to your watchlist
            </div>
          </div>
        );
      case 'terminal':
        return (
          <div className="flex flex-col h-full bg-black font-mono text-xs p-2">
            <div className="text-green-400">OKAP Terminal v1.0.0</div>
            <div className="text-zinc-500">Type 'help' for available commands</div>
            <div className="flex-1 mt-2">
              <div className="flex items-center text-zinc-400">
                <span className="text-cyan-400">$</span>
                <span className="ml-1 animate-pulse">_</span>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center h-full text-zinc-500">
            Widget: {widget.type}
          </div>
        );
    }
  };

  return (
    <div
      ref={workspaceRef}
      className="relative w-full h-full overflow-hidden"
    >
      {/* Empty state */}
      {widgets.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-zinc-600">
            <div className="mb-2 text-4xl opacity-30">+</div>
            <div className="text-sm">Click "+ Widget" to add widgets to your workspace</div>
          </div>
        </div>
      )}

      {/* Widgets */}
      {widgets.map((widget) => (
        <DraggableWidget
          key={widget.id}
          id={widget.id}
          title={widget.title}
          position={widget.position}
          onPositionChange={handlePositionChange}
          onClose={handleClose}
          onFocus={handleFocus}
          icon={WIDGET_ICONS[widget.type]}
          minWidth={200}
          minHeight={150}
        >
          {renderWidgetContent(widget)}
        </DraggableWidget>
      ))}
    </div>
  );
}

// Helper function to create a new widget instance
export function createWidget(
  type: WidgetType,
  existingWidgets: WidgetInstance[],
  containerWidth: number = 1200,
  containerHeight: number = 700
): WidgetInstance {
  const size = DEFAULT_SIZES[type] || { width: 400, height: 350 };

  // Calculate position to avoid overlapping with existing widgets
  const offset = existingWidgets.length * 30;
  const x = Math.min(50 + offset, containerWidth - size.width - 50);
  const y = Math.min(50 + offset, containerHeight - size.height - 50);

  const titles: Record<WidgetType, string> = {
    chart: 'Chart',
    dom: 'Depth of Market',
    orderbook: 'Order Book',
    trades: 'Time & Sales',
    stats: 'Market Stats',
    liquidations: 'Liquidations',
    watchlist: 'Watchlist',
    terminal: 'Terminal',
  };

  return {
    id: `${type}-${Date.now()}`,
    type,
    title: titles[type] || type,
    position: {
      x,
      y,
      width: size.width,
      height: size.height,
      zIndex: 10 + existingWidgets.length,
    },
  };
}
