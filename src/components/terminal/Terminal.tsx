"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Toolbar } from './Toolbar';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { CandleChart } from './CandleChart';
import { VPVR } from './VPVR';
import { ChartTab } from './ChartTab';
import { ChartHeader } from './ChartHeader';
import { SymbolSearchModal } from './SymbolSearchModal';
import { OrderBook } from './OrderBook';
import { CVDPanel } from './CVDPanel';
import { RSIPanel } from './RSIPanel';
import { MACDPanel } from './MACDPanel';
import { generateHeatmapData, generateVPVRData } from '@/lib/data';
import { fetchKlines, BinanceWebSocket, toBinanceInterval, type OrderBookUpdate } from '@/lib/binance';
import type { TimeFrame, Symbol as SymbolType, CandleData, HeatmapCell, ActiveIndicators } from '@/lib/types';
import { X, Wifi, WifiOff, LayoutGrid, LineChart, Activity, TrendingUp, Zap } from 'lucide-react';
import { HeatmapWidget } from './HeatmapWidget';
import { AdvancedChartWidget } from './AdvancedChartWidget';
import { ChartWidget } from './ChartWidget';
import { TradesWidget } from './TradesWidget';
import { StatsWidget } from './StatsWidget';
import { LiquidationsWidget } from './LiquidationsWidget';
import { type WidgetType } from './WidgetMenu';
import { WidgetWorkspace, createWidget, type WidgetInstance } from './WidgetWorkspace';
import { loadIndicators, saveIndicators, defaultIndicators, loadDisplaySettings, saveDisplaySettings, defaultDisplaySettings, type DisplaySettings, loadWidgets, saveWidgets } from '@/lib/storage';

export function Terminal() {
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolType>({
    symbol: 'BTC/USDT',
    base: 'BTC',
    quote: 'USDT',
    exchange: 'binance',
    type: 'spot',
  });
  const [timeframe, setTimeframe] = useState<TimeFrame>('5m');
  const [activeTool, setActiveTool] = useState('cursor');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSymbolSearch, setShowSymbolSearch] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fullscreen toggle handler
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.error('Error attempting to exit fullscreen:', err);
      });
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Display settings with localStorage persistence
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(defaultDisplaySettings);

  // Indicator state with localStorage persistence
  const [indicators, setIndicators] = useState<ActiveIndicators>(defaultIndicators);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // State for chart data
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapCell[][]>([]);
  const [vpvrData, setVpvrData] = useState<{ price: number; buyVolume: number; sellVolume: number }[]>([]);
  const [orderBook, setOrderBook] = useState<OrderBookUpdate | null>(null);

  // Floating widgets state
  const [floatingWidgets, setFloatingWidgets] = useState<WidgetInstance[]>([]);
  const workspaceRef = useRef<HTMLDivElement>(null);

  // WebSocket reference
  const wsRef = useRef<BinanceWebSocket | null>(null);

  // Load initial data from Binance
  const loadInitialData = useCallback(async (symbol: string, tf: TimeFrame) => {
    setIsLoading(true);
    try {
      const klines = await fetchKlines(symbol, tf, 100);
      if (klines.length > 0) {
        setCandles(klines);
        setHeatmap(generateHeatmapData(klines, 25));
        setVpvrData(generateVPVRData(klines, 40));
        setCurrentPrice(klines[klines.length - 1].close);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize WebSocket connection
  const initWebSocket = useCallback((symbol: string, tf: TimeFrame) => {
    // Disconnect existing connection
    if (wsRef.current) {
      wsRef.current.disconnect();
    }

    const interval = toBinanceInterval(tf);

    wsRef.current = new BinanceWebSocket(symbol, interval, {
      onPrice: (price) => {
        setCurrentPrice(price);
      },
      onKline: (kline, isClosed) => {
        setCandles((prev) => {
          if (prev.length === 0) return prev;

          const newCandles = [...prev];
          const lastCandle = newCandles[newCandles.length - 1];

          if (isClosed) {
            // Add new candle and remove oldest
            newCandles.push(kline);
            if (newCandles.length > 100) {
              newCandles.shift();
            }
          } else {
            // Update current candle
            if (lastCandle && Math.floor(lastCandle.time / 60000) === Math.floor(kline.time / 60000)) {
              newCandles[newCandles.length - 1] = kline;
            }
          }

          return newCandles;
        });
      },
      onOrderBook: (update) => {
        setOrderBook(update);
      },
      onConnect: () => {
        setIsConnected(true);
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
      onError: (error) => {
        console.error('WebSocket error:', error);
      },
    });

    wsRef.current.connect();
  }, []);

  // Generate heatmap and VPVR when candles update
  useEffect(() => {
    if (candles.length > 0) {
      setHeatmap(generateHeatmapData(candles, 25));
      setVpvrData(generateVPVRData(candles, 40));
    }
  }, [candles]);

  // Initialize client-side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load settings from localStorage
  useEffect(() => {
    if (isClient && !settingsLoaded) {
      const savedIndicators = loadIndicators();
      const savedDisplay = loadDisplaySettings();
      setIndicators(savedIndicators);
      setDisplaySettings(savedDisplay);
      setSettingsLoaded(true);
    }
  }, [isClient, settingsLoaded]);

  // Toggle indicator and save to localStorage
  const toggleIndicator = useCallback((key: keyof ActiveIndicators, enabled?: boolean) => {
    setIndicators((prev) => {
      const newIndicators = {
        ...prev,
        [key]: {
          ...prev[key],
          enabled: enabled !== undefined ? enabled : !prev[key].enabled,
        },
      };
      saveIndicators(newIndicators);
      return newIndicators;
    });
  }, []);

  // Toggle display setting and save to localStorage
  const toggleDisplay = useCallback((key: keyof DisplaySettings) => {
    setDisplaySettings((prev) => {
      const newSettings = {
        ...prev,
        [key]: !prev[key],
      };
      saveDisplaySettings(newSettings);
      return newSettings;
    });
  }, []);

  // Load floating widgets from localStorage
  useEffect(() => {
    if (isClient) {
      const savedWidgets = loadWidgets();
      if (savedWidgets.length > 0) {
        setFloatingWidgets(savedWidgets as WidgetInstance[]);
      }
    }
  }, [isClient]);

  // Save floating widgets when they change
  const handleWidgetsChange = useCallback((widgets: WidgetInstance[]) => {
    setFloatingWidgets(widgets);
    saveWidgets(widgets);
  }, []);

  // Handle adding a new widget from the menu
  const handleAddWidget = useCallback((widgetType: WidgetType) => {
    const containerWidth = workspaceRef.current?.clientWidth || 1200;
    const containerHeight = workspaceRef.current?.clientHeight || 700;
    const newWidget = createWidget(widgetType, floatingWidgets, containerWidth, containerHeight);
    const updatedWidgets = [...floatingWidgets, newWidget];
    setFloatingWidgets(updatedWidgets);
    saveWidgets(updatedWidgets);
  }, [floatingWidgets]);

  // Destructure display settings for easier access
  const { showHeatmap, showVWAP, showCVD, showFootprint, showHeatmapWidget, showAdvancedChartWidget, showChartWidget, showRSI, showMACD, showBollinger } = displaySettings;

  // Load data and connect WebSocket when symbol or timeframe changes
  useEffect(() => {
    if (!isClient) return;

    const symbolString = `${selectedSymbol.base}/${selectedSymbol.quote}`;
    loadInitialData(symbolString, timeframe);
    initWebSocket(symbolString, timeframe);

    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect();
      }
    };
  }, [isClient, selectedSymbol, timeframe, loadInitialData, initWebSocket]);

  // Price range for VPVR
  const priceRange = useMemo(() => {
    if (candles.length === 0) return { min: 0, max: 0 };
    return {
      min: Math.min(...candles.map((c) => c.low)) * 0.998,
      max: Math.max(...candles.map((c) => c.high)) * 1.002,
    };
  }, [candles]);

  // Price info from latest candle
  const priceInfo = useMemo(() => {
    if (candles.length === 0) {
      return { open: 0, high: 0, low: 0, close: 0, change: 0 };
    }
    const latest = candles[candles.length - 1];
    const previous = candles[candles.length - 2] || latest;
    return {
      open: latest.open,
      high: latest.high,
      low: latest.low,
      close: latest.close,
      change: latest.close - previous.close,
    };
  }, [candles]);

  const handleSymbolSelect = (symbol: SymbolType) => {
    setSelectedSymbol(symbol);
  };

  const handleTimeframeChange = (tf: TimeFrame) => {
    setTimeframe(tf);
  };

  const displaySymbol = `${selectedSymbol.base}/${selectedSymbol.quote}@${selectedSymbol.exchange.toUpperCase()}`;

  // Show loading state during SSR/hydration
  if (!isClient) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
          <span className="text-zinc-400">Loading Terminal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-950 text-white overflow-hidden">
      {/* Top Toolbar */}
      <Toolbar
        symbol={displaySymbol}
        timeframe={timeframe}
        onSymbolClick={() => setShowSymbolSearch(true)}
        onTimeframeChange={handleTimeframeChange}
        priceInfo={priceInfo}
        onAddWidget={handleAddWidget}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          collapsed={sidebarCollapsed}
          onCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Chart Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chart Tabs */}
          <div className="h-8 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-2">
            <div className="flex items-end">
              <ChartTab
                symbol={selectedSymbol.symbol}
                exchange={selectedSymbol.exchange}
                timeframe={timeframe}
                active={true}
                onClick={() => {}}
                onClose={() => {}}
              />
            </div>
            {/* Connection Status & Heatmap Widget Toggle */}
            <div className="flex items-center gap-3 pr-2">
              {/* Chart Widget Toggle */}
              <button
                type="button"
                onClick={() => toggleDisplay('showChartWidget')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  showChartWidget
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                }`}
                title="Toggle Chart Widget"
              >
                <Activity className="w-3 h-3" />
                <span>Chart</span>
              </button>

              {/* Advanced Chart Widget Toggle */}
              <button
                type="button"
                onClick={() => toggleDisplay('showAdvancedChartWidget')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  showAdvancedChartWidget
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                }`}
                title="Toggle Advanced Chart Widget"
              >
                <LineChart className="w-3 h-3" />
                <span>Chart+</span>
              </button>

              {/* Heatmap Widget Toggle */}
              <button
                type="button"
                onClick={() => toggleDisplay('showHeatmapWidget')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  showHeatmapWidget
                    ? 'bg-cyan-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                }`}
                title="Toggle OrderBook Heatmap Widget"
              >
                <LayoutGrid className="w-3 h-3" />
                <span>Heatmap</span>
              </button>

              {isLoading ? (
                <div className="flex items-center gap-1 text-xs text-amber-500">
                  <div className="w-3 h-3 border border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : isConnected ? (
                <div className="flex items-center gap-1 text-xs text-emerald-500">
                  <Wifi className="w-3 h-3" />
                  <span>Live</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-red-500">
                  <WifiOff className="w-3 h-3" />
                  <span>Disconnected</span>
                </div>
              )}
            </div>
          </div>

          {/* Chart Header */}
          <ChartHeader
            symbol={selectedSymbol.symbol}
            exchange={selectedSymbol.exchange}
            timeframe={timeframe}
            priceInfo={priceInfo}
            showHeatmap={showHeatmap}
            onToggleHeatmap={() => toggleDisplay('showHeatmap')}
            showVWAP={showVWAP}
            onToggleVWAP={() => toggleDisplay('showVWAP')}
            showCVD={showCVD}
            onToggleCVD={() => toggleDisplay('showCVD')}
            showFootprint={showFootprint}
            onToggleFootprint={() => toggleDisplay('showFootprint')}
            showRSI={showRSI}
            onToggleRSI={() => toggleDisplay('showRSI')}
            showMACD={showMACD}
            onToggleMACD={() => toggleDisplay('showMACD')}
            showBollinger={showBollinger}
            onToggleBollinger={() => toggleDisplay('showBollinger')}
          />

          {/* Chart Content */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Main Chart */}
            <div className="flex-1 relative">
              {isLoading && candles.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center bg-[#0a0a0c]">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-zinc-600 border-t-cyan-500 rounded-full animate-spin" />
                    <span className="text-zinc-500">Loading chart data...</span>
                  </div>
                </div>
              ) : (
                <CandleChart
                  candles={candles}
                  heatmap={heatmap}
                  showHeatmap={showHeatmap}
                  currentPrice={currentPrice}
                  showVWAP={showVWAP}
                  showCVD={showCVD}
                  showFootprint={showFootprint}
                  showBollinger={showBollinger}
                />
              )}

              {/* Logo Watermark */}
              <div className="absolute bottom-12 left-4 flex items-center gap-2 opacity-80">
                <span className="text-cyan-500 font-bold text-lg">OKAP</span>
                <span className="text-white font-bold text-sm">TERMINAL</span>
              </div>

              {/* Live Price Badge */}
              {currentPrice > 0 && (
                <div className="absolute top-4 right-4 bg-zinc-900/90 border border-zinc-700 rounded px-3 py-1.5">
                  <div className="text-xs text-zinc-400">Live Price</div>
                  <div className={`text-lg font-mono font-bold ${priceInfo.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              )}
            </div>

            {/* Order Book Panel */}
            {orderBook && (
              <div className="w-40 border-l border-zinc-800">
                <OrderBook data={orderBook} currentPrice={currentPrice} />
              </div>
            )}

            {/* VPVR Panel */}
            <div className="w-32 border-l border-zinc-800">
              <VPVR
                data={vpvrData}
                currentPrice={currentPrice}
                minPrice={priceRange.min}
                maxPrice={priceRange.max}
              />
            </div>

            {/* Floating Close Button */}
            <button
              type="button"
              className="absolute top-2 right-36 p-1 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Floating Widget Workspace */}
            <div ref={workspaceRef} className="absolute inset-0 pointer-events-none">
              <div className="relative w-full h-full pointer-events-auto">
                <WidgetWorkspace
                  widgets={floatingWidgets}
                  onWidgetsChange={handleWidgetsChange}
                  symbol={selectedSymbol}
                  timeframe={timeframe}
                  orderBook={orderBook}
                  currentPrice={currentPrice}
                  onSymbolClick={() => setShowSymbolSearch(true)}
                />
              </div>
            </div>
          </div>

          {/* CVD Panel - shown when CVD is enabled */}
          {showCVD && candles.length > 0 && (
            <CVDPanel candles={candles} height={100} />
          )}

          {/* RSI Panel - shown when RSI is enabled */}
          {showRSI && candles.length > 0 && (
            <RSIPanel candles={candles} height={100} />
          )}

          {/* MACD Panel - shown when MACD is enabled */}
          {showMACD && candles.length > 0 && (
            <MACDPanel candles={candles} height={100} />
          )}
        </div>

        {/* Advanced Chart Widget Panel - Independent Widget */}
        {showAdvancedChartWidget && (
          <div className="w-[650px] border-l border-zinc-800 flex flex-col">
            <div className="h-8 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-3">
              <span className="text-xs text-zinc-400 font-medium">Advanced Chart</span>
              <button
                type="button"
                onClick={() => toggleDisplay('showAdvancedChartWidget')}
                className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <AdvancedChartWidget
                symbol={`${selectedSymbol.base}/${selectedSymbol.quote}`}
                defaultTimeframe={timeframe}
                onClose={() => toggleDisplay('showAdvancedChartWidget')}
              />
            </div>
          </div>
        )}

        {/* Chart Widget Panel - Independent Widget */}
        {showChartWidget && (
          <div className="w-[550px] border-l border-zinc-800 flex flex-col">
            <ChartWidget
              symbol={selectedSymbol}
              defaultTimeframe={timeframe}
              onClose={() => toggleDisplay('showChartWidget')}
              onSymbolClick={() => setShowSymbolSearch(true)}
              title={`${selectedSymbol.base}/${selectedSymbol.quote}@${selectedSymbol.exchange}`}
            />
          </div>
        )}

        {/* Heatmap Widget Panel - Independent Widget */}
        {showHeatmapWidget && (
          <div className="w-[600px] border-l border-zinc-800 flex flex-col">
            <div className="h-8 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-3">
              <span className="text-xs text-zinc-400 font-medium">OrderBook Heatmap</span>
              <button
                type="button"
                onClick={() => toggleDisplay('showHeatmapWidget')}
                className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <HeatmapWidget
                symbol={`${selectedSymbol.base}/${selectedSymbol.quote}`}
                onClose={() => toggleDisplay('showHeatmapWidget')}
              />
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar
        version="OKAP v1.0.0"
        connectionStatus={isConnected ? 'connected' : 'disconnected'}
        symbol={`${selectedSymbol.base}${selectedSymbol.quote}`}
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
      />

      {/* Symbol Search Modal */}
      <SymbolSearchModal
        open={showSymbolSearch}
        onOpenChange={setShowSymbolSearch}
        onSelectSymbol={handleSymbolSelect}
      />
    </div>
  );
}
