"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Settings, Zap, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface Liquidation {
  id: string;
  symbol: string;
  side: 'SELL' | 'BUY'; // SELL = long liquidated, BUY = short liquidated
  orderType: string;
  quantity: number;
  price: number;
  averagePrice: number;
  orderStatus: string;
  time: number;
  value: number;
}

interface LiquidationsWidgetProps {
  symbol?: string;
  onClose?: () => void;
}

export function LiquidationsWidget({ symbol = 'BTC/USDT', onClose }: LiquidationsWidgetProps) {
  const [liquidations, setLiquidations] = useState<Liquidation[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [filter, setFilter] = useState<'all' | 'longs' | 'shorts'>('all');
  const [totalLongs, setTotalLongs] = useState(0);
  const [totalShorts, setTotalShorts] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  // Format symbol for Binance WebSocket
  const formatSymbol = useCallback((sym: string) => {
    return sym.replace('/', '').toLowerCase();
  }, []);

  // Connect to Binance Futures Liquidation Stream
  useEffect(() => {
    const formattedSymbol = formatSymbol(symbol);
    // Using all liquidation stream for now (more active)
    const wsUrl = `wss://fstream.binance.com/ws/${formattedSymbol}@forceOrder`;

    const connect = () => {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const order = data.o;

          const liquidation: Liquidation = {
            id: `${order.s}-${order.T}`,
            symbol: order.s,
            side: order.S,
            orderType: order.o,
            quantity: parseFloat(order.q),
            price: parseFloat(order.p),
            averagePrice: parseFloat(order.ap),
            orderStatus: order.X,
            time: order.T,
            value: parseFloat(order.q) * parseFloat(order.p),
          };

          setLiquidations((prev) => {
            const newLiqs = [liquidation, ...prev].slice(0, 100);
            return newLiqs;
          });

          // Update totals
          if (order.S === 'SELL') {
            setTotalLongs((prev) => prev + liquidation.value);
          } else {
            setTotalShorts((prev) => prev + liquidation.value);
          }
        } catch (error) {
          console.error('Error parsing liquidation data:', error);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        // Reconnect after 3 seconds
        setTimeout(connect, 3000);
      };

      wsRef.current.onerror = () => {
        wsRef.current?.close();
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [symbol, formatSymbol]);

  // Filter liquidations
  const filteredLiquidations = liquidations.filter((liq) => {
    if (filter === 'longs' && liq.side !== 'SELL') return false;
    if (filter === 'shorts' && liq.side !== 'BUY') return false;
    return true;
  });

  // Format time
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Format value
  const formatValue = (value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  // Get size class for styling
  const getSizeClass = (value: number) => {
    if (value >= 100_000) return 'large';
    if (value >= 10_000) return 'medium';
    return 'normal';
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0c]">
      {/* Header */}
      <div className="h-8 flex items-center justify-between px-3 border-b border-zinc-800 bg-zinc-900/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Zap className="w-3 h-3 text-amber-500" />
          <span className="text-xs font-medium text-white">Liquidations</span>
          <span className="text-[10px] text-zinc-500">{symbol}</span>
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              isConnected ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white"
          >
            <Settings className="w-3 h-3" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Summary Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/50 bg-zinc-900/30 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-red-500" />
            <span className="text-[10px] text-zinc-400">Longs:</span>
            <span className="text-[10px] text-red-400 font-mono">{formatValue(totalLongs)}</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            <span className="text-[10px] text-zinc-400">Shorts:</span>
            <span className="text-[10px] text-emerald-400 font-mono">{formatValue(totalShorts)}</span>
          </div>
        </div>
        <div className="flex gap-1">
          {(['all', 'longs', 'shorts'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                filter === f
                  ? f === 'longs'
                    ? 'bg-red-600/20 text-red-400'
                    : f === 'shorts'
                    ? 'bg-emerald-600/20 text-emerald-400'
                    : 'bg-cyan-600/20 text-cyan-400'
                  : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-4 gap-2 px-3 py-1.5 text-[10px] text-zinc-500 uppercase tracking-wide border-b border-zinc-800/50 flex-shrink-0">
        <span>Time</span>
        <span>Side</span>
        <span className="text-right">Price</span>
        <span className="text-right">Value</span>
      </div>

      {/* Liquidations List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filteredLiquidations.length > 0 ? (
          filteredLiquidations.map((liq, index) => {
            const isLongLiquidated = liq.side === 'SELL';
            const sizeClass = getSizeClass(liq.value);

            return (
              <div
                key={liq.id}
                className={`grid grid-cols-4 gap-2 px-3 py-1.5 text-xs font-mono border-b border-zinc-900 transition-colors ${
                  sizeClass === 'large'
                    ? isLongLiquidated
                      ? 'bg-red-500/10'
                      : 'bg-emerald-500/10'
                    : sizeClass === 'medium'
                    ? isLongLiquidated
                      ? 'bg-red-500/5'
                      : 'bg-emerald-500/5'
                    : 'hover:bg-zinc-800/30'
                } ${index === 0 ? 'animate-pulse' : ''}`}
              >
                <span className="text-zinc-400">{formatTime(liq.time)}</span>
                <span
                  className={`flex items-center gap-1 ${
                    isLongLiquidated ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {isLongLiquidated ? (
                    <>
                      <TrendingDown className="w-3 h-3" />
                      Long
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-3 h-3" />
                      Short
                    </>
                  )}
                </span>
                <span className="text-right text-zinc-300">
                  ${liq.price.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </span>
                <span
                  className={`text-right ${
                    sizeClass === 'large'
                      ? 'text-amber-400 font-bold'
                      : sizeClass === 'medium'
                      ? 'text-zinc-200'
                      : 'text-zinc-400'
                  }`}
                >
                  {formatValue(liq.value)}
                </span>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-zinc-500">
            <AlertTriangle className="w-6 h-6 mb-2 opacity-50" />
            <span className="text-xs">Waiting for liquidations...</span>
            <span className="text-[10px] mt-1">Futures data only</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="h-6 flex items-center justify-between px-3 border-t border-zinc-800 bg-zinc-900/30 text-[10px] text-zinc-500 flex-shrink-0">
        <span>{filteredLiquidations.length} liquidations</span>
        <span>{isConnected ? 'Live Futures' : 'Reconnecting...'}</span>
      </div>
    </div>
  );
}
