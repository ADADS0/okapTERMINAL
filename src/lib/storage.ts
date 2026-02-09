import type { ChartDrawing, ActiveIndicators } from './types';

const DRAWINGS_KEY = 'okap_terminal_drawings';
const INDICATORS_KEY = 'okap_terminal_indicators';
const SETTINGS_KEY = 'okap_terminal_settings';
const DISPLAY_KEY = 'okap_terminal_display';

// Display settings for chart overlays
export interface DisplaySettings {
  showHeatmap: boolean;
  showVWAP: boolean;
  showCVD: boolean;
  showFootprint: boolean;
  showHeatmapWidget: boolean;
  showAdvancedChartWidget: boolean;
  showChartWidget: boolean;
  showRSI: boolean;
  showMACD: boolean;
  showBollinger: boolean;
}

export const defaultDisplaySettings: DisplaySettings = {
  showHeatmap: true,
  showVWAP: false,
  showCVD: false,
  showFootprint: false,
  showHeatmapWidget: false,
  showAdvancedChartWidget: false,
  showChartWidget: false,
  showRSI: false,
  showMACD: false,
  showBollinger: false,
};

// Default indicator settings
export const defaultIndicators: ActiveIndicators = {
  sma: { enabled: false, period: 20, color: '#f59e0b' },
  ema: { enabled: false, period: 9, color: '#3b82f6' },
  rsi: { enabled: false, period: 14 },
  macd: { enabled: false, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
  bollinger: { enabled: false, period: 20, stdDev: 2 },
  vwap: { enabled: false, showBands: true, color: '#fbbf24' },
  cvd: { enabled: false, color: '#a855f7' },
};

// Save drawings to localStorage
export function saveDrawings(symbol: string, drawings: ChartDrawing[]): void {
  try {
    const allDrawings = getDrawingsMap();
    allDrawings[symbol] = drawings;
    localStorage.setItem(DRAWINGS_KEY, JSON.stringify(allDrawings));
  } catch (error) {
    console.error('Failed to save drawings:', error);
  }
}

// Load drawings from localStorage
export function loadDrawings(symbol: string): ChartDrawing[] {
  try {
    const allDrawings = getDrawingsMap();
    return allDrawings[symbol] || [];
  } catch (error) {
    console.error('Failed to load drawings:', error);
    return [];
  }
}

// Get all drawings map
function getDrawingsMap(): Record<string, ChartDrawing[]> {
  try {
    const data = localStorage.getItem(DRAWINGS_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

// Clear drawings for a symbol
export function clearDrawings(symbol: string): void {
  try {
    const allDrawings = getDrawingsMap();
    delete allDrawings[symbol];
    localStorage.setItem(DRAWINGS_KEY, JSON.stringify(allDrawings));
  } catch (error) {
    console.error('Failed to clear drawings:', error);
  }
}

// Save indicator settings
export function saveIndicators(indicators: ActiveIndicators): void {
  try {
    localStorage.setItem(INDICATORS_KEY, JSON.stringify(indicators));
  } catch (error) {
    console.error('Failed to save indicators:', error);
  }
}

// Load indicator settings
export function loadIndicators(): ActiveIndicators {
  try {
    const data = localStorage.getItem(INDICATORS_KEY);
    return data ? { ...defaultIndicators, ...JSON.parse(data) } : defaultIndicators;
  } catch {
    return defaultIndicators;
  }
}

// Save general settings
export function saveSettings(settings: Record<string, unknown>): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

// Load general settings
export function loadSettings(): Record<string, unknown> {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

// Generate unique ID for drawings
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Save display settings
export function saveDisplaySettings(display: DisplaySettings): void {
  try {
    localStorage.setItem(DISPLAY_KEY, JSON.stringify(display));
  } catch (error) {
    console.error('Failed to save display settings:', error);
  }
}

// Load display settings
export function loadDisplaySettings(): DisplaySettings {
  try {
    const data = localStorage.getItem(DISPLAY_KEY);
    return data ? { ...defaultDisplaySettings, ...JSON.parse(data) } : defaultDisplaySettings;
  } catch {
    return defaultDisplaySettings;
  }
}

// Widget storage
const WIDGETS_KEY = 'okap_terminal_widgets';

export interface StoredWidget {
  id: string;
  type: string;
  title: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
  };
}

export function saveWidgets(widgets: StoredWidget[]): void {
  try {
    localStorage.setItem(WIDGETS_KEY, JSON.stringify(widgets));
  } catch (error) {
    console.error('Failed to save widgets:', error);
  }
}

export function loadWidgets(): StoredWidget[] {
  try {
    const data = localStorage.getItem(WIDGETS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}
