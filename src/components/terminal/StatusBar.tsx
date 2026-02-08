"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, Circle, Globe, Activity, Clock, Wifi, Server, Maximize2, Minimize2 } from 'lucide-react';

interface StatusBarProps {
  version: string;
  connectionStatus?: 'connected' | 'disconnected' | 'connecting';
  symbol?: string;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

const REGIONS = [
  { id: 'eu-west', name: 'EU West', flag: '🇪🇺' },
  { id: 'us-east', name: 'US East', flag: '🇺🇸' },
  { id: 'us-west', name: 'US West', flag: '🇺🇸' },
  { id: 'asia-east', name: 'Asia East', flag: '🇸🇬' },
  { id: 'asia-south', name: 'Asia South', flag: '🇮🇳' },
];

export function StatusBar({
  version,
  connectionStatus = 'disconnected',
  symbol,
  onToggleFullscreen,
  isFullscreen = false,
}: StatusBarProps) {
  const [fps, setFps] = useState(60);
  const [latency, setLatency] = useState(45);
  const [time, setTime] = useState('');
  const [selectedRegion, setSelectedRegion] = useState(REGIONS[0]);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);

  // FPS measurement
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const rafRef = useRef<number | null>(null);

  // Measure actual FPS
  useEffect(() => {
    const measureFps = () => {
      frameCountRef.current++;
      const now = performance.now();
      const elapsed = now - lastTimeRef.current;

      if (elapsed >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / elapsed));
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      rafRef.current = requestAnimationFrame(measureFps);
    };

    rafRef.current = requestAnimationFrame(measureFps);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const utcHours = now.getUTCHours().toString().padStart(2, '0');
      const utcMinutes = now.getUTCMinutes().toString().padStart(2, '0');
      const utcSeconds = now.getUTCSeconds().toString().padStart(2, '0');
      setTime(`${utcHours}:${utcMinutes}:${utcSeconds} UTC`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    // Simulate latency fluctuations based on connection status
    const latencyInterval = setInterval(() => {
      if (connectionStatus === 'connected') {
        // Simulate realistic latency based on region
        const baseLatency = selectedRegion.id.includes('eu') ? 25 :
                           selectedRegion.id.includes('us') ? 45 : 65;
        setLatency(baseLatency + Math.floor(Math.random() * 30));
      } else {
        setLatency(0);
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      clearInterval(latencyInterval);
    };
  }, [connectionStatus, selectedRegion]);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-emerald-500';
      case 'connecting':
        return 'text-amber-500';
      default:
        return 'text-red-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      default:
        return 'Disconnected';
    }
  };

  const getLatencyColor = () => {
    if (latency === 0) return 'text-zinc-500';
    if (latency < 30) return 'text-emerald-400';
    if (latency < 60) return 'text-amber-400';
    return 'text-red-400';
  };

  const getFpsColor = () => {
    if (fps >= 55) return 'text-emerald-400';
    if (fps >= 30) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="h-7 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between px-3 text-xs">
      <div className="flex items-center gap-4">
        {/* Version */}
        <span className="text-cyan-400 font-medium">{version}</span>

        {/* Connection Status */}
        <div className={`flex items-center gap-1.5 ${getStatusColor()}`}>
          <Circle className={`w-2 h-2 fill-current ${connectionStatus === 'connected' ? 'animate-pulse' : ''}`} />
          <span>{getStatusText()}</span>
        </div>

        {/* Symbol */}
        {symbol && (
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Activity className="w-3 h-3" />
            <span>Streaming:</span>
            <span className="text-white font-medium">{symbol}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* FPS Counter */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-800/50 rounded">
          <span className={`font-mono ${getFpsColor()}`}>{fps}</span>
          <span className="text-zinc-500">fps</span>
        </div>

        {/* Region Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowRegionDropdown(!showRegionDropdown)}
            className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-800/50 rounded hover:bg-zinc-700/50 transition-colors"
          >
            <Globe className="w-3 h-3 text-zinc-400" />
            <span className="text-zinc-300">{selectedRegion.flag} {selectedRegion.name}</span>
            <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${showRegionDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showRegionDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowRegionDropdown(false)} />
              <div className="absolute bottom-full mb-1 right-0 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 min-w-[140px] overflow-hidden">
                {REGIONS.map((region) => (
                  <button
                    key={region.id}
                    type="button"
                    onClick={() => {
                      setSelectedRegion(region);
                      setShowRegionDropdown(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-zinc-800 transition-colors ${
                      selectedRegion.id === region.id ? 'bg-zinc-800 text-cyan-400' : 'text-zinc-300'
                    }`}
                  >
                    <span>{region.flag}</span>
                    <span>{region.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Exchange */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-800/50 rounded">
          <Server className="w-3 h-3 text-amber-500" />
          <span className="text-zinc-300">Binance</span>
        </div>

        {/* Latency */}
        {connectionStatus === 'connected' && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-800/50 rounded">
            <Wifi className={`w-3 h-3 ${getLatencyColor()}`} />
            <span className={`font-mono ${getLatencyColor()}`}>{latency}</span>
            <span className="text-zinc-500">ms</span>
          </div>
        )}

        {/* UTC Time */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-800/50 rounded">
          <Clock className="w-3 h-3 text-zinc-400" />
          <span className="text-zinc-300 font-mono">{time}</span>
        </div>

        {/* Fullscreen Toggle */}
        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="p-1 hover:bg-zinc-700 rounded transition-colors text-zinc-400 hover:text-white"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
