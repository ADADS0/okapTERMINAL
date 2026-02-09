"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import type { TimeFrame } from '@/lib/types';
import { TIMEFRAMES } from '@/lib/data';
import { WidgetMenu, type WidgetType } from './WidgetMenu';
import {
  ChevronDown,
  BarChart2,
  Pencil,
  Square,
  Monitor,
  Coins,
  LayoutGrid,
  Camera,
  Settings,
  Bell,
  CandlestickChart,
  LineChart,
  X,
  Download,
  TrendingUp,
  Minus,
  Circle,
  Triangle,
  Type,
  Trash2,
  Save,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  Grid,
  Check,
  AlertCircle,
  Clock,
  ArrowUp,
  ArrowDown,
  Plus,
  Crosshair,
} from 'lucide-react';

interface ToolbarProps {
  symbol: string;
  timeframe: TimeFrame;
  onSymbolClick: () => void;
  onTimeframeChange: (tf: TimeFrame) => void;
  onAddWidget?: (widgetType: WidgetType) => void;
  priceInfo: {
    open: number;
    high: number;
    low: number;
    close: number;
    change: number;
  };
}

type DrawingTool = 'line' | 'rectangle' | 'circle' | 'triangle' | 'text' | 'trendline' | null;

interface Alert {
  id: string;
  symbol: string;
  condition: 'above' | 'below' | 'crosses';
  price: number;
  enabled: boolean;
  createdAt: string;
}

interface SettingsState {
  theme: 'dark' | 'light';
  soundEnabled: boolean;
  notifications: boolean;
  gridLines: boolean;
  crosshair: boolean;
  autoSave: boolean;
  colorScheme: 'default' | 'colorblind' | 'high-contrast';
}

export function Toolbar({
  symbol,
  timeframe,
  onSymbolClick,
  onTimeframeChange,
  onAddWidget,
  priceInfo,
}: ToolbarProps) {
  const isPositive = priceInfo.change >= 0;
  const [showTimeframeDropdown, setShowTimeframeDropdown] = useState(false);
  const [showChartTypeDropdown, setShowChartTypeDropdown] = useState(false);
  const [showIndicatorsPanel, setShowIndicatorsPanel] = useState(false);
  const [chartType, setChartType] = useState<'candles' | 'line' | 'heikin'>('candles');

  // New state for modals
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showGridModal, setShowGridModal] = useState(false);
  const [showDrawingTools, setShowDrawingTools] = useState(false);
  const [activeDrawingTool, setActiveDrawingTool] = useState<DrawingTool>(null);
  const [screenshotStatus, setScreenshotStatus] = useState<'idle' | 'capturing' | 'success' | 'error'>('idle');

  // Settings state
  const [settings, setSettings] = useState<SettingsState>({
    theme: 'dark',
    soundEnabled: true,
    notifications: true,
    gridLines: true,
    crosshair: true,
    autoSave: true,
    colorScheme: 'default',
  });

  // Alerts state
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [newAlertPrice, setNewAlertPrice] = useState('');
  const [newAlertCondition, setNewAlertCondition] = useState<'above' | 'below' | 'crosses'>('above');

  // Grid layout state
  const [gridLayout, setGridLayout] = useState('1x1');

  // Layout state
  const [showLayoutDropdown, setShowLayoutDropdown] = useState(false);
  const [currentLayout, setCurrentLayout] = useState('Untitled Layout');
  const [savedLayouts, setSavedLayouts] = useState<string[]>(['Default', 'Trading', 'Analysis']);

  // Load layouts from localStorage on mount
  useEffect(() => {
    try {
      const savedLayoutsData = localStorage.getItem('okapTerminalLayouts');
      if (savedLayoutsData) {
        const parsed = JSON.parse(savedLayoutsData);
        if (parsed.layouts) setSavedLayouts(parsed.layouts);
        if (parsed.current) setCurrentLayout(parsed.current);
      }
    } catch (e) {
      console.error('Failed to load layouts', e);
    }
  }, []);

  // Save current layout
  const handleSaveLayout = () => {
    const name = prompt('Enter layout name:', currentLayout === 'Untitled Layout' ? '' : currentLayout);
    if (name && name.trim()) {
      const trimmedName = name.trim();
      if (!savedLayouts.includes(trimmedName)) {
        const newLayouts = [...savedLayouts, trimmedName];
        setSavedLayouts(newLayouts);
        localStorage.setItem('okapTerminalLayouts', JSON.stringify({ layouts: newLayouts, current: trimmedName }));
      }
      setCurrentLayout(trimmedName);
      setShowLayoutDropdown(false);
    }
  };

  // Select layout
  const handleSelectLayout = (layoutName: string) => {
    setCurrentLayout(layoutName);
    localStorage.setItem('okapTerminalLayouts', JSON.stringify({ layouts: savedLayouts, current: layoutName }));
    setShowLayoutDropdown(false);
  };

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('okapTerminalSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
      const savedAlerts = localStorage.getItem('okapTerminalAlerts');
      if (savedAlerts) {
        setAlerts(JSON.parse(savedAlerts));
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback((newSettings: SettingsState) => {
    setSettings(newSettings);
    localStorage.setItem('okapTerminalSettings', JSON.stringify(newSettings));
  }, []);

  // Save alerts to localStorage
  const saveAlerts = useCallback((newAlerts: Alert[]) => {
    setAlerts(newAlerts);
    localStorage.setItem('okapTerminalAlerts', JSON.stringify(newAlerts));
  }, []);

  const handleTimeframeSelect = (tf: TimeFrame) => {
    onTimeframeChange(tf);
    setShowTimeframeDropdown(false);
  };

  const handleChartTypeSelect = (type: 'candles' | 'line' | 'heikin') => {
    setChartType(type);
    setShowChartTypeDropdown(false);
  };

  // Screenshot functionality
  const handleScreenshot = useCallback(async () => {
    setScreenshotStatus('capturing');
    try {
      const chartCanvas = document.querySelector('canvas');

      if (chartCanvas instanceof HTMLCanvasElement) {
        const link = document.createElement('a');
        link.download = `okap-chart-${symbol.replace(/[/@]/g, '-')}-${Date.now()}.png`;
        link.href = chartCanvas.toDataURL('image/png');
        link.click();
        setScreenshotStatus('success');
      } else {
        // Fallback: create info canvas
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0a0a0c';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#22d3ee';
          ctx.font = 'bold 24px system-ui';
          ctx.fillText('OKAP TERMINAL', 40, 50);
          ctx.fillStyle = '#ffffff';
          ctx.font = '16px monospace';
          ctx.fillText(`Symbol: ${symbol}`, 40, 90);
          ctx.fillText(`Timeframe: ${timeframe}`, 40, 115);
          ctx.fillText(`Price: $${priceInfo.close.toFixed(2)}`, 40, 140);
          ctx.fillText(`Captured: ${new Date().toLocaleString()}`, 40, 165);
        }

        const link = document.createElement('a');
        link.download = `okap-chart-${symbol.replace(/[/@]/g, '-')}-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        setScreenshotStatus('success');
      }

      setTimeout(() => setScreenshotStatus('idle'), 2000);
    } catch (error) {
      console.error('Screenshot failed:', error);
      setScreenshotStatus('error');
      setTimeout(() => setScreenshotStatus('idle'), 2000);
    }
  }, [symbol, timeframe, priceInfo]);

  // Drawing tool selection
  const handleDrawingToolSelect = (tool: DrawingTool) => {
    setActiveDrawingTool(tool);
    setShowDrawingTools(false);
  };

  // Add new alert
  const handleAddAlert = () => {
    if (!newAlertPrice) return;
    const newAlert: Alert = {
      id: Date.now().toString(),
      symbol: symbol.split('@')[0],
      condition: newAlertCondition,
      price: parseFloat(newAlertPrice),
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    const updatedAlerts = [...alerts, newAlert];
    saveAlerts(updatedAlerts);
    setNewAlertPrice('');
  };

  // Delete alert
  const handleDeleteAlert = (id: string) => {
    const updatedAlerts = alerts.filter(a => a.id !== id);
    saveAlerts(updatedAlerts);
  };

  // Toggle alert
  const handleToggleAlert = (id: string) => {
    const updatedAlerts = alerts.map(a =>
      a.id === id ? { ...a, enabled: !a.enabled } : a
    );
    saveAlerts(updatedAlerts);
  };

  return (
    <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center px-2 gap-1 relative">
      {/* Symbol Selector */}
      <Button
        variant="ghost"
        className="h-7 px-2 text-sm font-medium text-white hover:bg-zinc-800 flex items-center gap-1"
        onClick={onSymbolClick}
      >
        {symbol}
        <ChevronDown className="w-3 h-3 text-zinc-400" />
      </Button>

      {/* Timeframe Selector */}
      <div className="relative">
        <Button
          variant="ghost"
          className="h-7 px-2 text-sm font-medium text-white hover:bg-zinc-800"
          onClick={() => setShowTimeframeDropdown(!showTimeframeDropdown)}
        >
          {timeframe}
          <ChevronDown className="w-3 h-3 text-zinc-400 ml-1" />
        </Button>

        {showTimeframeDropdown && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowTimeframeDropdown(false)} />
            <div className="absolute top-full left-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-md shadow-xl z-50 min-w-[80px]">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  type="button"
                  className={`w-full px-3 py-1.5 text-left text-sm hover:bg-zinc-800 transition-colors ${
                    tf === timeframe ? 'text-cyan-400 bg-zinc-800' : 'text-white'
                  }`}
                  onClick={() => handleTimeframeSelect(tf)}
                >
                  {tf}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-32 h-2 bg-zinc-800 rounded-full ml-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: '45%', background: 'linear-gradient(90deg, #22c55e, #eab308, #ef4444)' }}
        />
      </div>

      <div className="h-5 w-px bg-zinc-700 mx-2" />

      {/* Chart Type Dropdown */}
      <div className="relative">
        <Button
          variant="ghost"
          size="xs"
          className={`text-zinc-400 hover:text-white ${showChartTypeDropdown ? 'bg-zinc-800 text-white' : ''}`}
          onClick={() => setShowChartTypeDropdown(!showChartTypeDropdown)}
        >
          {chartType === 'candles' ? <CandlestickChart className="w-4 h-4" /> : chartType === 'line' ? <LineChart className="w-4 h-4" /> : <BarChart2 className="w-4 h-4" />}
        </Button>

        {showChartTypeDropdown && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowChartTypeDropdown(false)} />
            <div className="absolute top-full left-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-md shadow-xl z-50 min-w-[140px]">
              {[
                { type: 'candles' as const, icon: CandlestickChart, label: 'Candlestick' },
                { type: 'line' as const, icon: LineChart, label: 'Line Chart' },
                { type: 'heikin' as const, icon: BarChart2, label: 'Heikin Ashi' },
              ].map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  type="button"
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-zinc-800 flex items-center gap-2 ${chartType === type ? 'text-cyan-400 bg-zinc-800' : 'text-white'}`}
                  onClick={() => handleChartTypeSelect(type)}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Grid Layout Button */}
      <div className="relative">
        <Button
          variant="ghost"
          size="xs"
          className={`text-zinc-400 hover:text-white ${showGridModal ? 'bg-zinc-800 text-cyan-400' : ''}`}
          title="Grid Layout"
          onClick={() => setShowGridModal(!showGridModal)}
        >
          <LayoutGrid className="w-4 h-4" />
        </Button>

        {showGridModal && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowGridModal(false)} />
            <div className="absolute top-full left-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 p-3 w-48">
              <h4 className="text-xs text-zinc-400 mb-2 font-medium">CHART LAYOUT</h4>
              <div className="grid grid-cols-3 gap-2">
                {['1x1', '1x2', '2x1', '2x2', '1x3', '3x1'].map((layout) => (
                  <button
                    key={layout}
                    type="button"
                    onClick={() => { setGridLayout(layout); setShowGridModal(false); }}
                    className={`p-2 rounded border transition-colors flex flex-col items-center gap-1 ${
                      gridLayout === layout ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' : 'border-zinc-700 hover:border-zinc-500 text-zinc-400'
                    }`}
                  >
                    <Grid className="w-4 h-4" />
                    <span className="text-xs">{layout}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Drawing Tools */}
      <div className="relative">
        <Button
          variant="ghost"
          size="xs"
          className={`text-zinc-400 hover:text-white ${showDrawingTools || activeDrawingTool ? 'bg-zinc-800 text-cyan-400' : ''}`}
          title="Draw Mode"
          onClick={() => setShowDrawingTools(!showDrawingTools)}
        >
          <Pencil className="w-4 h-4" />
        </Button>

        {showDrawingTools && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowDrawingTools(false)} />
            <div className="absolute top-full left-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 p-2 w-40">
              <h4 className="text-xs text-zinc-400 mb-2 px-2 font-medium">DRAWING TOOLS</h4>
              <div className="space-y-0.5">
                {[
                  { tool: 'line' as const, icon: Minus, label: 'Line' },
                  { tool: 'trendline' as const, icon: TrendingUp, label: 'Trendline' },
                  { tool: 'rectangle' as const, icon: Square, label: 'Rectangle' },
                  { tool: 'circle' as const, icon: Circle, label: 'Circle' },
                  { tool: 'triangle' as const, icon: Triangle, label: 'Triangle' },
                  { tool: 'text' as const, icon: Type, label: 'Text' },
                ].map(({ tool, icon: Icon, label }) => (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => handleDrawingToolSelect(tool)}
                    className={`w-full px-2 py-1.5 text-left text-sm rounded flex items-center gap-2 ${
                      activeDrawingTool === tool ? 'bg-cyan-500/20 text-cyan-400' : 'text-white hover:bg-zinc-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
                <div className="border-t border-zinc-700 my-1" />
                <button
                  type="button"
                  onClick={() => handleDrawingToolSelect(null)}
                  className="w-full px-2 py-1.5 text-left text-sm rounded flex items-center gap-2 text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <Button
        variant="ghost"
        size="xs"
        className={`text-zinc-400 hover:text-white ${activeDrawingTool === 'rectangle' ? 'text-cyan-400 bg-zinc-800' : ''}`}
        title="Shape Tools"
        onClick={() => handleDrawingToolSelect(activeDrawingTool === 'rectangle' ? null : 'rectangle')}
      >
        <Square className="w-4 h-4" />
      </Button>

      <div className="h-5 w-px bg-zinc-700 mx-2" />

      {/* Indicators Button */}
      <Button
        variant="ghost"
        className={`h-7 px-2 text-xs hover:bg-zinc-800 flex items-center gap-1 ${showIndicatorsPanel ? 'text-cyan-400 bg-zinc-800' : 'text-zinc-300'}`}
        onClick={() => setShowIndicatorsPanel(!showIndicatorsPanel)}
      >
        <BarChart2 className="w-3 h-3" />
        Indicators
      </Button>

      {showIndicatorsPanel && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowIndicatorsPanel(false)} />
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 w-80 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium">Indicators</h3>
              <button type="button" className="text-zinc-400 hover:text-white" onClick={() => setShowIndicatorsPanel(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {[
                { name: 'SMA (Simple Moving Average)', params: '20' },
                { name: 'EMA (Exponential MA)', params: '9' },
                { name: 'Bollinger Bands', params: '20, 2' },
                { name: 'RSI', params: '14' },
                { name: 'MACD', params: '12, 26, 9' },
              ].map((ind) => (
                <div key={ind.name} className="flex items-center justify-between p-2 rounded bg-zinc-800/50 hover:bg-zinc-800 cursor-pointer">
                  <span className="text-sm text-white">{ind.name}</span>
                  <span className="text-xs text-zinc-500">{ind.params}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="h-5 w-px bg-zinc-700 mx-2" />

      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="xs" className="text-zinc-400 hover:text-white" title="Full Screen">
          <Monitor className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="xs" className="text-zinc-400 hover:text-white" title="Token Info">
          <Coins className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1" />

      {/* Layout Dropdown */}
      <div className="relative">
        <Button
          variant="ghost"
          className={`h-7 px-2 text-xs hover:bg-zinc-800 flex items-center gap-1 ${showLayoutDropdown ? 'bg-zinc-800 text-cyan-400' : 'text-zinc-300'}`}
          onClick={() => setShowLayoutDropdown(!showLayoutDropdown)}
        >
          {currentLayout}
          <ChevronDown className={`w-3 h-3 transition-transform ${showLayoutDropdown ? 'rotate-180' : ''}`} />
        </Button>

        {showLayoutDropdown && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowLayoutDropdown(false)} />
            <div className="absolute top-full right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 min-w-[180px] py-1">
              <div className="px-3 py-1.5 text-[10px] text-zinc-500 uppercase tracking-wide border-b border-zinc-800">
                Saved Layouts
              </div>
              {savedLayouts.map((layout) => (
                <button
                  key={layout}
                  type="button"
                  onClick={() => handleSelectLayout(layout)}
                  className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-zinc-800 transition-colors ${
                    currentLayout === layout ? 'text-cyan-400 bg-zinc-800/50' : 'text-white'
                  }`}
                >
                  {currentLayout === layout && <Check className="w-3 h-3" />}
                  <span className={currentLayout === layout ? '' : 'ml-5'}>{layout}</span>
                </button>
              ))}
              <div className="border-t border-zinc-800 mt-1 pt-1">
                <button
                  type="button"
                  onClick={handleSaveLayout}
                  className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-zinc-800 transition-colors text-cyan-400"
                >
                  <Save className="w-3 h-3" />
                  Save Current Layout
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <WidgetMenu onSelectWidget={(widget) => onAddWidget?.(widget)} />

      <div className="flex items-center gap-0.5">
        {/* Screenshot */}
        <Button
          variant="ghost"
          size="xs"
          className={`text-zinc-400 hover:text-white ${screenshotStatus === 'success' ? 'text-green-400' : ''}`}
          title="Take Screenshot"
          onClick={handleScreenshot}
        >
          {screenshotStatus === 'capturing' ? (
            <div className="w-4 h-4 border-2 border-zinc-500 border-t-cyan-400 rounded-full animate-spin" />
          ) : screenshotStatus === 'success' ? (
            <Download className="w-4 h-4" />
          ) : (
            <Camera className="w-4 h-4" />
          )}
        </Button>

        {/* Settings */}
        <Button
          variant="ghost"
          size="xs"
          className={`text-zinc-400 hover:text-white ${showSettingsModal ? 'text-cyan-400 bg-zinc-800' : ''}`}
          title="Settings"
          onClick={() => setShowSettingsModal(!showSettingsModal)}
        >
          <Settings className="w-4 h-4" />
        </Button>

        {/* Alerts */}
        <Button
          variant="ghost"
          size="xs"
          className={`text-zinc-400 hover:text-white relative ${showAlertsModal ? 'text-cyan-400 bg-zinc-800' : ''}`}
          title="Price Alerts"
          onClick={() => setShowAlertsModal(!showAlertsModal)}
        >
          <Bell className="w-4 h-4" />
          {alerts.filter(a => a.enabled).length > 0 && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-500 rounded-full text-[8px] flex items-center justify-center text-white font-bold">
              {alerts.filter(a => a.enabled).length}
            </span>
          )}
        </Button>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowSettingsModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-96 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-cyan-400" />
                Settings
              </h2>
              <button type="button" className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800" onClick={() => setShowSettingsModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Theme */}
              <div className="space-y-2">
                <label className="text-xs text-zinc-400 uppercase tracking-wide">Theme</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveSettings({ ...settings, theme: 'dark' })}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                      settings.theme === 'dark' ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' : 'border-zinc-700 text-zinc-400'
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                    Dark
                  </button>
                  <button
                    type="button"
                    onClick={() => saveSettings({ ...settings, theme: 'light' })}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                      settings.theme === 'light' ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' : 'border-zinc-700 text-zinc-400'
                    }`}
                  >
                    <Sun className="w-4 h-4" />
                    Light
                  </button>
                </div>
              </div>

              {/* Toggle Options */}
              <div className="space-y-3">
                <label className="text-xs text-zinc-400 uppercase tracking-wide">Options</label>
                {[
                  { key: 'soundEnabled' as const, label: 'Sound Effects', icon: settings.soundEnabled ? Volume2 : VolumeX },
                  { key: 'notifications' as const, label: 'Notifications', icon: Bell },
                  { key: 'gridLines' as const, label: 'Grid Lines', icon: Grid },
                  { key: 'crosshair' as const, label: 'Crosshair', icon: Crosshair },
                  { key: 'autoSave' as const, label: 'Auto Save', icon: Save },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => saveSettings({ ...settings, [key]: !settings[key] })}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-zinc-700 hover:border-zinc-500 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-white text-sm">
                      <Icon className="w-4 h-4 text-zinc-400" />
                      {label}
                    </span>
                    <div className={`w-10 h-5 rounded-full transition-colors relative ${settings[key] ? 'bg-cyan-500' : 'bg-zinc-700'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${settings[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Alerts Modal */}
      {showAlertsModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowAlertsModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-[420px] max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-cyan-400" />
                Price Alerts
              </h2>
              <button type="button" className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800" onClick={() => setShowAlertsModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Create New Alert */}
              <div className="space-y-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <label className="text-xs text-zinc-400 uppercase tracking-wide">Create New Alert</label>
                <div className="flex gap-2">
                  <select
                    value={newAlertCondition}
                    onChange={(e) => setNewAlertCondition(e.target.value as 'above' | 'below' | 'crosses')}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="above">Above</option>
                    <option value="below">Below</option>
                    <option value="crosses">Crosses</option>
                  </select>
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                    <input
                      type="number"
                      value={newAlertPrice}
                      onChange={(e) => setNewAlertPrice(e.target.value)}
                      placeholder="Price"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-7 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddAlert}
                    disabled={!newAlertPrice}
                    className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-500 disabled:opacity-50 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Existing Alerts */}
              <div className="space-y-2">
                <label className="text-xs text-zinc-400 uppercase tracking-wide">Active Alerts ({alerts.length})</label>
                {alerts.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No alerts set</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          alert.enabled ? 'border-zinc-700 bg-zinc-800/30' : 'border-zinc-800 bg-zinc-900/50 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleAlert(alert.id)}
                            className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                              alert.enabled ? 'bg-cyan-500 border-cyan-500' : 'border-zinc-600'
                            }`}
                          >
                            {alert.enabled && <Check className="w-3 h-3 text-white" />}
                          </button>
                          <div>
                            <div className="flex items-center gap-2 text-sm text-white">
                              {alert.condition === 'above' ? <ArrowUp className="w-3 h-3 text-green-400" /> : alert.condition === 'below' ? <ArrowDown className="w-3 h-3 text-red-400" /> : <TrendingUp className="w-3 h-3 text-amber-400" />}
                              <span className="font-mono">${alert.price.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                              <span>{alert.symbol}</span>
                              <Clock className="w-3 h-3" />
                              <span>{new Date(alert.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <button type="button" onClick={() => handleDeleteAlert(alert.id)} className="p-1 text-zinc-500 hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
