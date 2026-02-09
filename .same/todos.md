# OKAP Terminal - Improvement Tasks

## Current Sprint - Widget System & Professional UI:

### Widget System (High Priority):
- [x] Create "+ Widget" dropdown button in toolbar with options:
  - [x] Dom (Depth of Market)
  - [x] Chart
  - [x] Orderbook
  - [x] Trades (Time & Sales)
  - [x] Stats
  - [x] Liquidations
  - [x] WatchList
  - [x] Terminal
- [x] Create independent Chart Widget with MMT-style design
  - [x] Candlestick chart with multiple chart types (Candle, Line, Area, OHLC, Heikin Ashi)
  - [x] OHLC info header display
  - [x] Timeframe selector (1m, 5m, 15m, 30m, 1H, 4H, 1D)
  - [x] Crosshair with price/time labels
  - [x] Volume bars
  - [x] Technical indicators (SMA, EMA, VWAP, Bollinger)
  - [x] Zoom and pan functionality
  - [x] Real-time WebSocket data
  - [x] Current price line with countdown timer
- [ ] Widget can be added to empty workspace ⬅️ IN PROGRESS
- [ ] Each widget is draggable and resizable ⬅️ IN PROGRESS
- [ ] Widget header with symbol, close button, settings

### Symbol Search Modal (High Priority):
- [x] Professional symbol search modal like MMT
- [x] Tabs: All, Spot, Futures (USD Perp), Futures (COIN Perp), Reset
- [x] Exchange filter icons (Binance, Coinbase, Bybit, OKX, Kraken, Hyperliquid, etc.)
- [x] Symbol list with: Symbol, Quote currency, Exchange icon, Exchange name, Type
- [x] Search input with real-time filtering
- [x] Show total symbols count at bottom

### Heatmap Settings & Improvements (High Priority):
- [x] Create Heatmap Settings Modal with:
  - [x] Style dropdown (Classic, HD Heatmap)
  - [x] Colormap dropdown (Viridis, Plasma, Magma, Inferno, etc.)
  - [x] Intensity slider with color scale preview
  - [x] Low/Peak values input
  - [x] Enable zoom tooltip checkbox
  - [x] Extend heatmap option
  - [x] Aggregate options (Spot, USD Perps, COIN Perps)
  - [x] Exchange selection for aggregation
- [x] Integrate HeatmapSettingsModal with HeatmapWidget
- [ ] Improve heatmap visualization

### Toolbar Improvements:
- [x] Add Layout dropdown (Untitled Layout)
- [ ] Add COIN button ⬅️ IN PROGRESS
- [x] Add fullscreen toggle
- [x] Better FPS counter in status bar
- [x] Region selector (EU West, etc.)
- [x] Latency display (ms)
- [x] UTC time display

## In Progress:
- [x] Integrate WidgetMenu into Toolbar
- [ ] Create draggable/resizable widget system ⬅️ IN PROGRESS
- [x] Add Trades Widget
- [x] Add Stats Widget
- [x] Add Liquidations Widget

## Completed:
- [x] Clone repository
- [x] Install dependencies
- [x] Start dev server
- [x] Fix TypeScript error in SymbolSearchModal
- [x] Toolbar modals (Settings, Alerts, Grid Layout, Drawing Tools)
- [x] Screenshot functionality with download
- [x] HeatmapWidget with real-time Binance data
- [x] Heatmap color legend in CandleChart
- [x] AdvancedChartWidget with multiple chart types
- [x] Create independent OrderBook Heatmap Widget
- [x] RSI Panel implementation
- [x] MACD Panel implementation
- [x] Fix Bollinger Bands TypeScript error
- [x] Create WidgetMenu component
- [x] Create HeatmapSettingsModal component
- [x] Create ChartWidget component with MMT-style design

## Future Enhancements:
- [ ] Add Open Interest visualization
- [ ] Multiple layouts support
- [ ] Layout save/load functionality
- [ ] Dark/Light theme toggle
