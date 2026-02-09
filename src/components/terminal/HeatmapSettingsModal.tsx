"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Check, ChevronDown } from 'lucide-react';

export interface HeatmapSettings {
  style: 'classic' | 'hd';
  colormap: string;
  intensityMin: number;
  intensityMax: number;
  zoomTooltip: boolean;
  extendHeatmap: boolean;
  aggregateSpot: boolean;
  aggregateUsdPerps: boolean;
  aggregateCoinPerps: boolean;
  selectedExchanges: string[];
}

interface HeatmapSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: HeatmapSettings;
  onSettingsChange: (settings: HeatmapSettings) => void;
}

const COLORMAPS = [
  { id: 'viridis', name: 'Viridis', colors: ['#440154', '#21918c', '#fde725'] },
  { id: 'plasma', name: 'Plasma', colors: ['#0d0887', '#cc4778', '#f0f921'] },
  { id: 'magma', name: 'Magma', colors: ['#000004', '#b73779', '#fcfdbf'] },
  { id: 'inferno', name: 'Inferno', colors: ['#000004', '#bb3754', '#fcffa4'] },
  { id: 'cividis', name: 'Cividis', colors: ['#002051', '#7a7b78', '#fdea45'] },
  { id: 'turbo', name: 'Turbo', colors: ['#30123b', '#28bbec', '#a2fc3c', '#fb8022', '#7a0403'] },
  { id: 'jet', name: 'Jet', colors: ['#00007f', '#00ffff', '#ffff00', '#ff0000', '#7f0000'] },
  { id: 'cool-warm', name: 'Cool-Warm', colors: ['#3b4cc0', '#f7f7f7', '#b40426'] },
  { id: 'ocean', name: 'Ocean', colors: ['#00171f', '#003459', '#007ea7', '#00a8e8', '#9effff'] },
  { id: 'fire', name: 'Fire', colors: ['#1a0000', '#8b0000', '#ff4500', '#ffa500', '#ffff00'] },
];

const EXCHANGES = [
  { id: 'binance', name: 'Binance', color: '#F0B90B' },
  { id: 'bybit', name: 'Bybit', color: '#F7A600' },
  { id: 'okx', name: 'OKX', color: '#FFFFFF' },
  { id: 'coinbase', name: 'Coinbase', color: '#0052FF' },
  { id: 'kraken', name: 'Kraken', color: '#5741D9' },
  { id: 'hyperliquid', name: 'Hyperliquid', color: '#00D4AA' },
];

export function HeatmapSettingsModal({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
}: HeatmapSettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<HeatmapSettings>(settings);
  const [showColormapDropdown, setShowColormapDropdown] = useState(false);

  const updateSetting = <K extends keyof HeatmapSettings>(
    key: K,
    value: HeatmapSettings[K]
  ) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const toggleExchange = (exchangeId: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      selectedExchanges: prev.selectedExchanges.includes(exchangeId)
        ? prev.selectedExchanges.filter((e) => e !== exchangeId)
        : [...prev.selectedExchanges, exchangeId],
    }));
  };

  const handleApply = () => {
    onSettingsChange(localSettings);
    onOpenChange(false);
  };

  const handleReset = () => {
    const defaultSettings: HeatmapSettings = {
      style: 'classic',
      colormap: 'viridis',
      intensityMin: 0,
      intensityMax: 100,
      zoomTooltip: true,
      extendHeatmap: false,
      aggregateSpot: true,
      aggregateUsdPerps: true,
      aggregateCoinPerps: false,
      selectedExchanges: ['binance'],
    };
    setLocalSettings(defaultSettings);
  };

  const selectedColormap = COLORMAPS.find((c) => c.id === localSettings.colormap) || COLORMAPS[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0 border-b border-zinc-800">
          <DialogTitle className="text-white text-center text-base flex items-center justify-between">
            <span>Heatmap Settings</span>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-5">
          {/* Style */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 uppercase tracking-wide font-medium">
              Style
            </label>
            <div className="flex gap-2">
              {(['classic', 'hd'] as const).map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => updateSetting('style', style)}
                  className={`flex-1 py-2 px-4 text-sm rounded-lg transition-colors ${
                    localSettings.style === style
                      ? 'bg-cyan-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  {style === 'classic' ? 'Classic' : 'HD Heatmap'}
                </button>
              ))}
            </div>
          </div>

          {/* Colormap */}
          <div className="space-y-2 relative">
            <label className="text-xs text-zinc-400 uppercase tracking-wide font-medium">
              Colormap
            </label>
            <button
              type="button"
              onClick={() => setShowColormapDropdown(!showColormapDropdown)}
              className="w-full flex items-center justify-between p-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-16 h-4 rounded"
                  style={{
                    background: `linear-gradient(to right, ${selectedColormap.colors.join(', ')})`,
                  }}
                />
                <span className="text-white text-sm">{selectedColormap.name}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${showColormapDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showColormapDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowColormapDropdown(false)} />
                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                  {COLORMAPS.map((colormap) => (
                    <button
                      key={colormap.id}
                      type="button"
                      onClick={() => {
                        updateSetting('colormap', colormap.id);
                        setShowColormapDropdown(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-800 transition-colors ${
                        localSettings.colormap === colormap.id ? 'bg-zinc-800' : ''
                      }`}
                    >
                      <div
                        className="w-16 h-4 rounded"
                        style={{
                          background: `linear-gradient(to right, ${colormap.colors.join(', ')})`,
                        }}
                      />
                      <span className="text-white text-sm">{colormap.name}</span>
                      {localSettings.colormap === colormap.id && (
                        <Check className="w-4 h-4 text-cyan-400 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Intensity */}
          <div className="space-y-3">
            <label className="text-xs text-zinc-400 uppercase tracking-wide font-medium">
              Intensity Range
            </label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-xs text-zinc-500 mb-1 block">Low</label>
                <input
                  type="number"
                  value={localSettings.intensityMin}
                  onChange={(e) => updateSetting('intensityMin', Number(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                  min={0}
                  max={100}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-zinc-500 mb-1 block">Peak</label>
                <input
                  type="number"
                  value={localSettings.intensityMax}
                  onChange={(e) => updateSetting('intensityMax', Number(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                  min={0}
                  max={100}
                />
              </div>
            </div>
            <div
              className="h-3 rounded-full"
              style={{
                background: `linear-gradient(to right, ${selectedColormap.colors.join(', ')})`,
              }}
            />
          </div>

          {/* Checkboxes */}
          <div className="space-y-2">
            {[
              { key: 'zoomTooltip' as const, label: 'Enable zoom tooltip' },
              { key: 'extendHeatmap' as const, label: 'Extend heatmap' },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => updateSetting(key, !localSettings[key])}
                className="w-full flex items-center gap-3 p-2 hover:bg-zinc-800/50 rounded-lg transition-colors"
              >
                <div
                  className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    localSettings[key]
                      ? 'bg-cyan-500 border-cyan-500'
                      : 'border-zinc-600 hover:border-zinc-500'
                  }`}
                >
                  {localSettings[key] && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-white text-sm">{label}</span>
              </button>
            ))}
          </div>

          {/* Aggregate Options */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 uppercase tracking-wide font-medium">
              Aggregate
            </label>
            <div className="flex gap-2">
              {[
                { key: 'aggregateSpot' as const, label: 'Spot' },
                { key: 'aggregateUsdPerps' as const, label: 'USD Perps' },
                { key: 'aggregateCoinPerps' as const, label: 'COIN Perps' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => updateSetting(key, !localSettings[key])}
                  className={`flex-1 py-2 px-3 text-xs rounded-lg transition-colors ${
                    localSettings[key]
                      ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-600'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white border border-transparent'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Exchange Selection */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 uppercase tracking-wide font-medium">
              Exchanges
            </label>
            <div className="flex flex-wrap gap-2">
              {EXCHANGES.map((exchange) => (
                <button
                  key={exchange.id}
                  type="button"
                  onClick={() => toggleExchange(exchange.id)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    localSettings.selectedExchanges.includes(exchange.id)
                      ? 'text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                  }`}
                  style={{
                    backgroundColor: localSettings.selectedExchanges.includes(exchange.id)
                      ? `${exchange.color}20`
                      : undefined,
                    borderColor: localSettings.selectedExchanges.includes(exchange.id)
                      ? exchange.color
                      : 'transparent',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    color: localSettings.selectedExchanges.includes(exchange.id)
                      ? exchange.color
                      : undefined,
                  }}
                >
                  {exchange.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Reset to Default
          </button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-zinc-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const defaultHeatmapSettings: HeatmapSettings = {
  style: 'classic',
  colormap: 'viridis',
  intensityMin: 0,
  intensityMax: 100,
  zoomTooltip: true,
  extendHeatmap: false,
  aggregateSpot: true,
  aggregateUsdPerps: true,
  aggregateCoinPerps: false,
  selectedExchanges: ['binance'],
};
