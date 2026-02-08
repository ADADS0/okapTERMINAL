"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Settings, ArrowUp, ArrowDown } from 'lucide-react';

interface Trade {
  id: string;
  price: number;
  quantity: number;
  time: number;
  isBuyerMaker: boolean;
}

interface TradesWidgetProps {
  symbol: string;
  onClose?: () => void;
}

export function TradesWidget({ symbol, onClose }: TradesWidgetProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [filter, setFilter] = useState<'all' | 'buys' | 'sells'>('all');
  const [minSize, setMinSize] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Format symbol for Binance WebSocket
  const formatSymbol = useCallback((sym: string) => {
    return sym.replace('/', '').toLowerCase();
  }, []);

  // Connect to Binance trades WebSocket
  useEffect(() => {
    const formattedSymbol = formatSymbol(symbol);
    const wsUrl = `wss://stream.binance.com:9443/ws/${formattedSymbol}@trade`;

    const connect = () => {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const trade: Trade = {
            id: data.t.toString(),
            price: parseFloat(data.p),
            quantity: parseFloat(data.q),
            time: data.T,
            isBuyerMaker: data.m,
          };

          setTrades((prev) => {
            const newTrades = [trade, ...prev].slice(0, 100);
            return newTrades;
          });
        } catch (error) {
          console.error('Error parsing trade data:', error);
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

  // Filter trades
  const filteredTrades = trades.filter((trade) => {
    if (filter === 'buys' && trade.isBuyerMaker) return false;
    if (filter === 'sells' && !trade.isBuyerMaker) return false;
    if (trade.quantity * trade.price < minSize) return false;
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

  // Format quantity
  const formatQuantity = (qty: number) => {
    if (qty >= 1000) return `${(qty / 1000).toFixed(2)}K`;
    if (qty >= 1) return qty.toFixed(4);
    return qty.toFixed(6);
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0c]">
      {/* Header */}
      <div className="h-8 flex items-center justify-between px-3 border-b border-zinc-800 bg-zinc-900/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-white">Time & Sales</span>
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

      {/* Filters */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800/50 flex-shrink-0">
        <div className="flex gap-1">
          {(['all', 'buys', 'sells'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                filter === f
                  ? f === 'buys'
                    ? 'bg-emerald-600/20 text-emerald-400'
                    : f === 'sells'
                    ? 'bg-red-600/20 text-red-400'
                    : 'bg-cyan-600/20 text-cyan-400'
                  : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <input
          type="number"
          value={minSize || ''}
          onChange={(e) => setMinSize(parseFloat(e.target.value) || 0)}
          placeholder="Min $"
          className="w-16 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-[10px] text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-600"
        />
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-4 gap-2 px-3 py-1.5 text-[10px] text-zinc-500 uppercase tracking-wide border-b border-zinc-800/50 flex-shrink-0">
        <span>Time</span>
        <span className="text-right">Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Value</span>
      </div>

      {/* Trade List */}
      <div ref={containerRef} className="flex-1 overflow-y-auto scrollbar-thin">
        {filteredTrades.map((trade) => (
          <div
            key={trade.id}
            className={`grid grid-cols-4 gap-2 px-3 py-1 text-xs font-mono border-b border-zinc-900 hover:bg-zinc-800/30 transition-colors ${
              trade.isBuyerMaker ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            <span className="text-zinc-400">{formatTime(trade.time)}</span>
            <span className="text-right flex items-center justify-end gap-1">
              {trade.isBuyerMaker ? (
                <ArrowDown className="w-2.5 h-2.5" />
              ) : (
                <ArrowUp className="w-2.5 h-2.5" />
              )}
              {trade.price.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-right text-zinc-300">
              {formatQuantity(trade.quantity)}
            </span>
            <span className="text-right text-zinc-400">
              ${(trade.price * trade.quantity).toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>
          </div>
        ))}
        {filteredTrades.length === 0 && (
          <div className="flex items-center justify-center h-32 text-zinc-500 text-xs">
            Waiting for trades...
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="h-6 flex items-center justify-between px-3 border-t border-zinc-800 bg-zinc-900/30 text-[10px] text-zinc-500 flex-shrink-0">
        <span>{filteredTrades.length} trades</span>
        <span>{isConnected ? 'Live' : 'Reconnecting...'}</span>
      </div>
    </div>
  );
}
