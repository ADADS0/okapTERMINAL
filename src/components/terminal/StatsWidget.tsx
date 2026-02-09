"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Settings, TrendingUp, TrendingDown, Activity, BarChart3, Clock, DollarSign } from 'lucide-react';

interface TickerData {
  symbol: string;
  priceChange: number;
  priceChangePercent: number;
  lastPrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  quoteVolume: number;
  openPrice: number;
  count: number;
}

interface StatsWidgetProps {
  symbol: string;
  onClose?: () => void;
}

export function StatsWidget({ symbol, onClose }: StatsWidgetProps) {
  const [ticker, setTicker] = useState<TickerData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Format symbol for Binance WebSocket
  const formatSymbol = useCallback((sym: string) => {
    return sym.replace('/', '').toLowerCase();
  }, []);

  // Connect to Binance 24hr ticker WebSocket
  useEffect(() => {
    const formattedSymbol = formatSymbol(symbol);
    const wsUrl = `wss://stream.binance.com:9443/ws/${formattedSymbol}@ticker`;

    const connect = () => {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setTicker({
            symbol: data.s,
            priceChange: parseFloat(data.p),
            priceChangePercent: parseFloat(data.P),
            lastPrice: parseFloat(data.c),
            highPrice: parseFloat(data.h),
            lowPrice: parseFloat(data.l),
            volume: parseFloat(data.v),
            quoteVolume: parseFloat(data.q),
            openPrice: parseFloat(data.o),
            count: parseInt(data.n),
          });
        } catch (error) {
          console.error('Error parsing ticker data:', error);
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

  // Format large numbers
  const formatNumber = (num: number, decimals = 2) => {
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(decimals)}B`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(decimals)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(decimals)}K`;
    return num.toFixed(decimals);
  };

  // Format price
  const formatPrice = (price: number) => {
    if (price >= 10000) return price.toFixed(0);
    if (price >= 100) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  };

  const isPositive = ticker ? ticker.priceChangePercent >= 0 : true;

  return (
    <div className="h-full flex flex-col bg-[#0a0a0c]">
      {/* Header */}
      <div className="h-8 flex items-center justify-between px-3 border-b border-zinc-800 bg-zinc-900/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-white">Statistics</span>
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

      {/* Content */}
      {ticker ? (
        <div className="flex-1 p-3 space-y-3 overflow-y-auto">
          {/* Price & Change */}
          <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500 uppercase tracking-wide">Last Price</span>
              {isPositive ? (
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold font-mono ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                ${formatPrice(ticker.lastPrice)}
              </span>
              <span className={`text-sm font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPositive ? '+' : ''}{ticker.priceChangePercent.toFixed(2)}%
              </span>
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {isPositive ? '+' : ''}${ticker.priceChange.toFixed(2)} (24h)
            </div>
          </div>

          {/* High / Low */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] text-zinc-500 uppercase">24h High</span>
              </div>
              <span className="text-sm font-mono text-white">${formatPrice(ticker.highPrice)}</span>
            </div>
            <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <div className="flex items-center gap-1 mb-1">
                <TrendingDown className="w-3 h-3 text-red-500" />
                <span className="text-[10px] text-zinc-500 uppercase">24h Low</span>
              </div>
              <span className="text-sm font-mono text-white">${formatPrice(ticker.lowPrice)}</span>
            </div>
          </div>

          {/* Volume */}
          <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <div className="flex items-center gap-1 mb-2">
              <BarChart3 className="w-3 h-3 text-cyan-500" />
              <span className="text-[10px] text-zinc-500 uppercase">24h Volume</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-zinc-500 block mb-0.5">Base</span>
                <span className="text-sm font-mono text-white">{formatNumber(ticker.volume)}</span>
              </div>
              <div>
                <span className="text-xs text-zinc-500 block mb-0.5">Quote (USDT)</span>
                <span className="text-sm font-mono text-white">${formatNumber(ticker.quoteVolume)}</span>
              </div>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <div className="flex items-center gap-1 mb-1">
                <DollarSign className="w-3 h-3 text-amber-500" />
                <span className="text-[10px] text-zinc-500 uppercase">Open</span>
              </div>
              <span className="text-sm font-mono text-white">${formatPrice(ticker.openPrice)}</span>
            </div>
            <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <div className="flex items-center gap-1 mb-1">
                <Activity className="w-3 h-3 text-purple-500" />
                <span className="text-[10px] text-zinc-500 uppercase">Trades</span>
              </div>
              <span className="text-sm font-mono text-white">{formatNumber(ticker.count, 0)}</span>
            </div>
          </div>

          {/* Price Range Bar */}
          <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-zinc-500 uppercase">24h Range</span>
              <span className="text-[10px] text-zinc-500">
                {((ticker.lastPrice - ticker.lowPrice) / (ticker.highPrice - ticker.lowPrice) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 rounded-full"
                style={{
                  width: `${((ticker.lastPrice - ticker.lowPrice) / (ticker.highPrice - ticker.lowPrice) * 100)}%`,
                }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-zinc-500">
              <span>${formatPrice(ticker.lowPrice)}</span>
              <span>${formatPrice(ticker.highPrice)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-zinc-600 border-t-cyan-500 rounded-full animate-spin" />
            <span className="text-xs text-zinc-500">Loading statistics...</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="h-6 flex items-center justify-between px-3 border-t border-zinc-800 bg-zinc-900/30 text-[10px] text-zinc-500 flex-shrink-0">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>24h Stats</span>
        </div>
        <span>{isConnected ? 'Live' : 'Reconnecting...'}</span>
      </div>
    </div>
  );
}
