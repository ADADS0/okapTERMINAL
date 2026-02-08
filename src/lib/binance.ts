import type { CandleData } from './types';

const BINANCE_API_BASE = 'https://api.binance.com/api/v3';
const BINANCE_WS_BASE = 'wss://stream.binance.com:9443';
const BINANCE_WS_SINGLE = 'wss://stream.binance.com:9443/ws';
const BINANCE_WS_COMBINED = 'wss://stream.binance.com:9443/stream?streams=';

export interface BinanceKline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteAssetVolume: string;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: string;
  takerBuyQuoteAssetVolume: string;
}

export interface BinanceSymbol {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
}

export interface BinanceTicker {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
}

export interface OrderBookUpdate {
  bids: [string, string][]; // [price, quantity]
  asks: [string, string][]; // [price, quantity]
  lastUpdateId: number;
}

export interface AggTrade {
  price: number;
  quantity: number;
  time: number;
  isBuyerMaker: boolean;
}

// WebSocket message types
interface BinanceKlineData {
  t: number;  // Kline start time
  o: string;  // Open price
  h: string;  // High price
  l: string;  // Low price
  c: string;  // Close price
  v: string;  // Base asset volume
  x: boolean; // Is this kline closed?
}

interface BinanceKlineEvent {
  e: 'kline';
  k: BinanceKlineData;
}

interface BinanceDepthUpdate {
  e: 'depthUpdate';
  b: [string, string][]; // Bids
  a: [string, string][]; // Asks
  u?: number;
  lastUpdateId?: number;
}

interface BinanceDepthSnapshot {
  bids: [string, string][];
  asks: [string, string][];
  lastUpdateId: number;
}

interface BinanceAggTradeEvent {
  e: 'aggTrade';
  p: string;  // Price
  q: string;  // Quantity
  T: number;  // Trade time
  m: boolean; // Is buyer maker
}

type BinanceEventData = BinanceKlineEvent | BinanceDepthUpdate | BinanceAggTradeEvent | BinanceDepthSnapshot;

interface BinanceStreamMessage {
  data?: BinanceEventData;
  e?: string;
  [key: string]: unknown;
}

// Convert Binance timeframe format
export function toBinanceInterval(timeframe: string): string {
  const map: Record<string, string> = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1h': '1h',
    '4h': '4h',
    '1d': '1d',
  };
  return map[timeframe] || '5m';
}

// Generate mock kline data as fallback
function generateMockKlines(count: number, basePrice = 97500): CandleData[] {
  const candles: CandleData[] = [];
  let currentPrice = basePrice;
  const now = Date.now();
  const interval = 5 * 60 * 1000; // 5 minutes

  for (let i = count - 1; i >= 0; i--) {
    const volatility = 0.002 + Math.random() * 0.003;
    const trend = (Math.random() - 0.48) * volatility;

    const open = currentPrice;
    const close = open * (1 + trend);
    const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
    const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);
    const volume = 100 + Math.random() * 500;

    candles.push({
      time: now - i * interval,
      open,
      high,
      low,
      close,
      volume,
    });

    currentPrice = close;
  }

  return candles;
}

// Fetch klines (candlestick data) from Binance
export async function fetchKlines(
  symbol: string,
  interval: string,
  limit = 100
): Promise<CandleData[]> {
  try {
    // Convert symbol format (BTC/USDT -> BTCUSDT)
    const binanceSymbol = symbol.replace('/', '').toUpperCase();
    const binanceInterval = toBinanceInterval(interval);

    const response = await fetch(
      `${BINANCE_API_BASE}/klines?symbol=${binanceSymbol}&interval=${binanceInterval}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();

    return data.map((kline: (string | number)[]): CandleData => ({
      time: kline[0] as number,
      open: parseFloat(kline[1] as string),
      high: parseFloat(kline[2] as string),
      low: parseFloat(kline[3] as string),
      close: parseFloat(kline[4] as string),
      volume: parseFloat(kline[5] as string),
    }));
  } catch (error) {
    console.error('Failed to fetch klines, using mock data:', error);
    // Return mock data as fallback
    return generateMockKlines(limit);
  }
}

// Fetch 24hr ticker for a symbol
export async function fetchTicker(symbol: string): Promise<BinanceTicker | null> {
  try {
    const binanceSymbol = symbol.replace('/', '').toUpperCase();
    const response = await fetch(
      `${BINANCE_API_BASE}/ticker/24hr?symbol=${binanceSymbol}`
    );

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch ticker:', error);
    return null;
  }
}

// Fetch all trading symbols from Binance
export async function fetchSymbols(): Promise<BinanceSymbol[]> {
  try {
    const response = await fetch(`${BINANCE_API_BASE}/exchangeInfo`);

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();
    return data.symbols
      .filter((s: BinanceSymbol) => s.status === 'TRADING')
      .map((s: BinanceSymbol) => ({
        symbol: s.symbol,
        baseAsset: s.baseAsset,
        quoteAsset: s.quoteAsset,
        status: s.status,
      }));
  } catch (error) {
    console.error('Failed to fetch symbols:', error);
    return [];
  }
}

// Fetch order book depth
export async function fetchOrderBook(symbol: string, limit = 100): Promise<OrderBookUpdate | null> {
  try {
    const binanceSymbol = symbol.replace('/', '').toUpperCase();
    const response = await fetch(
      `${BINANCE_API_BASE}/depth?symbol=${binanceSymbol}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      bids: data.bids,
      asks: data.asks,
      lastUpdateId: data.lastUpdateId,
    };
  } catch (error) {
    console.error('Failed to fetch order book:', error);
    return null;
  }
}

// Enhanced WebSocket manager for real-time data
export class BinanceWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private symbol: string;
  private streams: string[];
  private callbacks: {
    onKline?: (kline: CandleData, isClosed: boolean) => void;
    onPrice?: (price: number) => void;
    onOrderBook?: (update: OrderBookUpdate) => void;
    onTrade?: (trade: AggTrade) => void;
    onError?: (error: Error) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
  };

  constructor(
    symbol: string,
    interval: string,
    callbacks: BinanceWebSocket['callbacks']
  ) {
    this.symbol = symbol.replace('/', '').toLowerCase();
    this.callbacks = callbacks;

    // Build streams array
    this.streams = [
      `${this.symbol}@kline_${interval}`,
      `${this.symbol}@depth20@100ms`,
      `${this.symbol}@aggTrade`,
    ];
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    // Use combined stream endpoint for multiple streams
    const streamString = this.streams.join('/');
    const wsUrl = `${BINANCE_WS_COMBINED}${streamString}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('Binance WebSocket connected');
        this.reconnectAttempts = 0;
        this.callbacks.onConnect?.();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.callbacks.onError?.(new Error('WebSocket connection error'));
      };

      this.ws.onclose = () => {
        console.log('Binance WebSocket disconnected');
        this.callbacks.onDisconnect?.();
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.attemptReconnect();
    }
  }

  private handleMessage(data: BinanceStreamMessage): void {
    // Handle combined stream format - use type assertion for dynamic data
    const eventData = (data.data || data) as Record<string, unknown>;
    const eventType = eventData.e as string | undefined;

    switch (eventType) {
      case 'kline':
        if (eventData.k) {
          this.handleKline(eventData.k as BinanceKlineData);
        }
        break;
      case 'depthUpdate':
        this.handleDepthUpdate({
          e: 'depthUpdate',
          b: (eventData.b || []) as [string, string][],
          a: (eventData.a || []) as [string, string][],
          u: eventData.u as number | undefined,
          lastUpdateId: eventData.lastUpdateId as number | undefined,
        });
        break;
      case 'aggTrade':
        this.handleAggTrade({
          e: 'aggTrade',
          p: eventData.p as string,
          q: eventData.q as string,
          T: eventData.T as number,
          m: eventData.m as boolean,
        });
        break;
      default:
        // Handle direct stream data (non-combined)
        if (eventData.bids && eventData.asks) {
          this.handleDepthSnapshot({
            bids: eventData.bids as [string, string][],
            asks: eventData.asks as [string, string][],
            lastUpdateId: (eventData.lastUpdateId as number) || 0,
          });
        }
    }
  }

  private handleKline(k: BinanceKlineData): void {
    const kline: CandleData = {
      time: k.t,
      open: parseFloat(k.o),
      high: parseFloat(k.h),
      low: parseFloat(k.l),
      close: parseFloat(k.c),
      volume: parseFloat(k.v),
    };

    this.callbacks.onPrice?.(kline.close);
    this.callbacks.onKline?.(kline, k.x); // k.x = is this kline closed?
  }

  private handleDepthUpdate(data: BinanceDepthUpdate): void {
    const update: OrderBookUpdate = {
      bids: data.b || [],
      asks: data.a || [],
      lastUpdateId: data.u || data.lastUpdateId || 0,
    };
    this.callbacks.onOrderBook?.(update);
  }

  private handleDepthSnapshot(data: BinanceDepthSnapshot): void {
    const update: OrderBookUpdate = {
      bids: data.bids || [],
      asks: data.asks || [],
      lastUpdateId: data.lastUpdateId,
    };
    this.callbacks.onOrderBook?.(update);
  }

  private handleAggTrade(data: BinanceAggTradeEvent): void {
    const trade: AggTrade = {
      price: parseFloat(data.p),
      quantity: parseFloat(data.q),
      time: data.T,
      isBuyerMaker: data.m,
    };
    this.callbacks.onTrade?.(trade);
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  changeSymbol(newSymbol: string, interval: string): void {
    this.disconnect();
    this.symbol = newSymbol.replace('/', '').toLowerCase();
    this.streams = [
      `${this.symbol}@kline_${interval}`,
      `${this.symbol}@depth20@100ms`,
      `${this.symbol}@aggTrade`,
    ];
    this.connect();
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Simple WebSocket for backward compatibility
export function createPriceWebSocket(
  symbol: string,
  onPrice: (price: number) => void,
  onKline?: (kline: CandleData) => void
): WebSocket | null {
  try {
    const binanceSymbol = symbol.replace('/', '').toLowerCase();
    const ws = new WebSocket(`${BINANCE_WS_SINGLE}/${binanceSymbol}@kline_1m`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.k) {
        const kline = data.k;
        onPrice(parseFloat(kline.c));

        if (onKline) {
          onKline({
            time: kline.t,
            open: parseFloat(kline.o),
            high: parseFloat(kline.h),
            low: parseFloat(kline.l),
            close: parseFloat(kline.c),
            volume: parseFloat(kline.v),
          });
        }
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return ws;
  } catch (error) {
    console.error('Failed to create WebSocket:', error);
    return null;
  }
}
