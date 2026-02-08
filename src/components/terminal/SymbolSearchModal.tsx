"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SYMBOLS } from '@/lib/data';
import { fetchSymbols, type BinanceSymbol } from '@/lib/binance';
import type { Symbol } from '@/lib/types';
import { Search, Loader2, X } from 'lucide-react';

interface SymbolSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSymbol: (symbol: Symbol) => void;
}

// Exchange configurations with logos/icons
const EXCHANGE_CONFIG = [
  { id: 'binance', name: 'BINANCE', color: '#F0B90B', icon: '◆' },
  { id: 'binancef', name: 'BINANCEF', color: '#F0B90B', icon: '◇' },
  { id: 'coinbase', name: 'COINBASE', color: '#0052FF', icon: '●' },
  { id: 'bybit', name: 'BYBIT', color: '#F7A600', icon: '◎' },
  { id: 'okx', name: 'OKX', color: '#FFFFFF', icon: '⬡' },
  { id: 'kraken', name: 'KRAKEN', color: '#5741D9', icon: '▣' },
  { id: 'hyperliquid', name: 'HYPERLIQUID', color: '#00D4AA', icon: '◈' },
  { id: 'lighterf', name: 'LIGHTERF', color: '#FFFFFF', icon: '◮' },
  { id: 'bitmex', name: 'BITMEX', color: '#FF0000', icon: '▲' },
  { id: 'deribit', name: 'DERIBIT', color: '#04E8B3', icon: '◐' },
  { id: 'bitfinex', name: 'BITFINEX', color: '#16B157', icon: '◒' },
  { id: 'kucoin', name: 'KUCOIN', color: '#23AF91', icon: '▢' },
];

type MarketType = 'all' | 'spot' | 'futures_usd' | 'futures_coin';

export function SymbolSearchModal({
  open,
  onOpenChange,
  onSelectSymbol,
}: SymbolSearchModalProps) {
  const [search, setSearch] = useState('');
  const [marketType, setMarketType] = useState<MarketType>('all');
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>([]);
  const [binanceSymbols, setBinanceSymbols] = useState<BinanceSymbol[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch Binance symbols when modal opens
  useEffect(() => {
    if (open && binanceSymbols.length === 0) {
      setLoading(true);
      fetchSymbols()
        .then((symbols) => {
          setBinanceSymbols(symbols);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open, binanceSymbols.length]);

  // Combine local and Binance symbols
  const allSymbols = useMemo(() => {
    const local = [...SYMBOLS];

    // Add Binance symbols that aren't already in local
    for (const bs of binanceSymbols) {
      const exists = local.some(
        s => s.base === bs.baseAsset && s.quote === bs.quoteAsset && s.exchange === 'binance'
      );
      if (!exists) {
        local.push({
          symbol: `${bs.baseAsset}/${bs.quoteAsset}`,
          base: bs.baseAsset,
          quote: bs.quoteAsset,
          exchange: 'binance',
          type: 'spot',
        });
      }
    }

    return local;
  }, [binanceSymbols]);

  const filteredSymbols = useMemo(() => {
    return allSymbols.filter((s) => {
      const matchesSearch =
        search === '' ||
        s.symbol.toLowerCase().includes(search.toLowerCase()) ||
        s.base.toLowerCase().includes(search.toLowerCase()) ||
        s.quote.toLowerCase().includes(search.toLowerCase());

      const matchesMarket =
        marketType === 'all' ||
        (marketType === 'spot' && s.type === 'spot') ||
        (marketType === 'futures_usd' && s.type === 'futures_usd') ||
        (marketType === 'futures_coin' && s.type === 'futures_coin');

      const matchesExchange =
        selectedExchanges.length === 0 || selectedExchanges.includes(s.exchange);

      return matchesSearch && matchesMarket && matchesExchange;
    }).sort((a, b) => a.base.localeCompare(b.base));
  }, [search, marketType, selectedExchanges, allSymbols]);

  const handleSelect = (symbol: Symbol) => {
    onSelectSymbol(symbol);
    onOpenChange(false);
    setSearch('');
  };

  const toggleExchange = useCallback((exchangeId: string) => {
    setSelectedExchanges((prev) => {
      if (prev.includes(exchangeId)) {
        return prev.filter(e => e !== exchangeId);
      }
      return [...prev, exchangeId];
    });
  }, []);

  const resetFilters = () => {
    setMarketType('all');
    setSelectedExchanges([]);
    setSearch('');
  };

  const getExchangeConfig = (exchangeId: string) => {
    return EXCHANGE_CONFIG.find(e => e.id === exchangeId) || {
      id: exchangeId,
      name: exchangeId.toUpperCase(),
      color: '#888888',
      icon: '●'
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-zinc-950 border-zinc-800 p-0 overflow-hidden max-h-[85vh] flex flex-col">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-white text-center text-lg">
            Find a symbol
          </DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>

        <div className="px-4 pt-3">
          {/* Search Input */}
          <div className="relative">
            <Input
              placeholder=""
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-zinc-900 border-zinc-700 h-10 pl-4 pr-10 text-white placeholder:text-zinc-600"
              autoFocus
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500 animate-spin" />
            )}
          </div>

          {/* Market Type Tabs */}
          <div className="flex items-center gap-2 mt-4">
            {[
              { value: 'all' as const, label: 'All' },
              { value: 'spot' as const, label: 'Spot' },
              { value: 'futures_usd' as const, label: 'Futures (USD Perp)' },
              { value: 'futures_coin' as const, label: 'Futures (COIN Perp)' },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setMarketType(tab.value)}
                className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                  marketType === tab.value
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <button
              type="button"
              onClick={resetFilters}
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors ml-auto"
            >
              Reset
            </button>
          </div>

          {/* Exchange Filter Icons */}
          <div className="flex items-center gap-1 mt-3 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedExchanges([])}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                selectedExchanges.length === 0
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              All
            </button>
            {EXCHANGE_CONFIG.map((exchange) => (
              <button
                key={exchange.id}
                type="button"
                onClick={() => toggleExchange(exchange.id)}
                className={`w-9 h-9 flex items-center justify-center text-lg rounded transition-all ${
                  selectedExchanges.includes(exchange.id)
                    ? 'bg-zinc-700 ring-2 ring-offset-1 ring-offset-zinc-950'
                    : 'text-zinc-400 hover:bg-zinc-800'
                }`}
                style={{
                  color: selectedExchanges.includes(exchange.id) || selectedExchanges.length === 0
                    ? exchange.color
                    : undefined,
                  
                }}
                title={exchange.name}
              >
                {exchange.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Symbols List */}
        <ScrollArea className="flex-1 mt-4 min-h-[300px]">
          <div className="px-4">
            {filteredSymbols.slice(0, 150).map((symbol, idx) => {
              const exchangeConfig = getExchangeConfig(symbol.exchange);
              return (
                <button
                  key={`${symbol.symbol}-${symbol.exchange}-${idx}`}
                  type="button"
                  onClick={() => handleSelect(symbol)}
                  className="w-full flex items-center gap-4 px-3 py-2.5 hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 last:border-0"
                >
                  {/* Symbol Name */}
                  <span className="w-24 text-left font-medium text-white">
                    {symbol.base}
                  </span>

                  {/* Quote Currency */}
                  <span className="w-16 text-left text-zinc-500 text-sm">
                    {symbol.quote}
                  </span>

                  {/* Exchange Icon & Name */}
                  <span className="flex items-center gap-2 min-w-[150px]">
                    <span
                      className="text-lg"
                      style={{ color: exchangeConfig.color }}
                    >
                      {exchangeConfig.icon}
                    </span>
                    <span className="text-zinc-300 text-sm">
                      {exchangeConfig.name}
                    </span>
                  </span>

                  {/* Market Type */}
                  <span className="ml-auto text-zinc-500 text-xs uppercase">
                    {symbol.type === 'spot'
                      ? 'SPOT'
                      : symbol.type === 'futures_usd'
                      ? 'FUTURES (USD PERP)'
                      : 'FUTURES (COIN PERP)'}
                  </span>
                </button>
              );
            })}

            {filteredSymbols.length === 0 && (
              <div className="text-center py-12 text-zinc-500">
                No symbols found matching your criteria
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-4 py-3 text-center text-zinc-500 text-sm border-t border-zinc-800">
          {filteredSymbols.length} Symbols
        </div>
      </DialogContent>
    </Dialog>
  );
}
