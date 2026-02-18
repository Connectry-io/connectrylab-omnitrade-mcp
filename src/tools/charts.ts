import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ExchangeManager } from '../exchanges/manager.js';
import type { ToolResponse } from '../types/index.js';
import { generateSvgChart } from '../utils/svg-chart.js';
import { fetchKlines, normalizeBinanceSymbol } from '../paper/wallet.js';

/**
 * Convert timeframe string to milliseconds
 */
function timeframeToMs(timeframe: string): number {
  const units: Record<string, number> = {
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
  };
  return units[timeframe] ?? units['24h']!;
}

/**
 * Map our timeframe labels to Binance kline intervals + candle counts
 */
function getBinanceIntervalConfig(timeframe: string): { interval: string; limit: number } {
  const mapping: Record<string, { interval: string; limit: number }> = {
    '1h': { interval: '5m', limit: 12 },     // 1h = twelve 5m candles
    '4h': { interval: '15m', limit: 16 },    // 4h = sixteen 15m candles
    '24h': { interval: '1h', limit: 24 },    // 24h = 24 hourly candles
    '7d': { interval: '4h', limit: 42 },     // 7d = 42 four-hourly candles
  };
  return mapping[timeframe] ?? { interval: '1h', limit: 24 };
}

/**
 * Get CCXT timeframe string from our timeframe
 */
function getCCXTTimeframe(timeframe: string): string {
  const mapping: Record<string, string> = {
    '1h': '5m',
    '4h': '15m',
    '24h': '1h',
    '7d': '4h',
  };
  return mapping[timeframe] ?? '1h';
}

/**
 * Register chart-related MCP tools
 * Returns SVG charts for rich rendering in Claude
 */
export function registerChartTools(
  server: McpServer,
  exchangeManager: ExchangeManager
): void {
  server.tool(
    'get_chart',
    'Get an SVG price chart for a cryptocurrency pair. Returns a clean, dark-themed line chart with price history. Example: "Show BTC chart last 24h"',
    {
      symbol: z
        .string()
        .describe('Trading pair in format "BASE/QUOTE" or just the base asset (e.g., "BTC/USDT" or "BTC")'),
      timeframe: z
        .enum(['1h', '4h', '24h', '7d'])
        .default('24h')
        .describe('Time period: 1h, 4h, 24h, or 7d (default: 24h)'),
      exchange: z
        .string()
        .optional()
        .describe('Specific exchange name. Omit to use Binance public data (no API key needed).'),
      width: z
        .number()
        .int()
        .min(400)
        .max(1600)
        .default(800)
        .describe('SVG chart width in pixels (default: 800)'),
      height: z
        .number()
        .int()
        .min(250)
        .max(900)
        .default(420)
        .describe('SVG chart height in pixels (default: 420)'),
    },
    async ({ symbol, timeframe, exchange, width, height }): Promise<ToolResponse> => {
      const normalizedSymbol = symbol.toUpperCase().includes('/')
        ? symbol.toUpperCase()
        : `${symbol.toUpperCase()}/USDT`;

      const baseAsset = normalizedSymbol.split('/')[0]!;

      // ── Try configured exchange first, fall back to Binance public API ──
      let klines: Awaited<ReturnType<typeof fetchKlines>> | null = null;
      let usedExchange = 'binance';

      // Attempt exchange OHLCV if configured
      if (exchange || exchangeManager.getAll().size > 0) {
        try {
          let selectedExchange;
          let exchangeName: string;

          if (exchange) {
            selectedExchange = exchangeManager.get(exchange);
            exchangeName = exchange.toLowerCase();
          } else {
            const firstEntry = Array.from(exchangeManager.getAll().entries())[0];
            if (firstEntry) {
              [exchangeName, selectedExchange] = firstEntry;
            } else {
              exchangeName = 'binance';
            }
          }

          if (selectedExchange?.has.fetchOHLCV) {
            const ccxtTimeframe = getCCXTTimeframe(timeframe);
            const now = Date.now();
            const since = now - timeframeToMs(timeframe);
            const ohlcv = await selectedExchange.fetchOHLCV(
              normalizedSymbol,
              ccxtTimeframe,
              since
            );

            if (ohlcv && ohlcv.length > 1) {
              klines = (ohlcv as unknown as number[][]).map((k) => ({
                time: k[0]!,
                open: k[1]!,
                high: k[2]!,
                low: k[3]!,
                close: k[4]!,
                volume: k[5]!,
              }));
              usedExchange = exchangeName!;
            }
          }
        } catch {
          // Fall through to Binance public API
        }
      }

      // ── Fall back to Binance public API (no auth needed) ─────────────────
      if (!klines || klines.length < 2) {
        try {
          const { interval, limit } = getBinanceIntervalConfig(timeframe);
          klines = await fetchKlines(baseAsset, interval, limit);
          usedExchange = 'binance';
        } catch (err) {
          return {
            content: [
              {
                type: 'text',
                text: `Failed to fetch chart data for ${normalizedSymbol}: ${(err as Error).message}`,
              },
            ],
            isError: true,
          };
        }
      }

      if (!klines || klines.length < 2) {
        return {
          content: [
            {
              type: 'text',
              text: `No chart data available for ${normalizedSymbol}`,
            },
          ],
          isError: true,
        };
      }

      // ── Generate SVG ────────────────────────────────────────────────────
      const svg = generateSvgChart(klines, {
        width,
        height,
        symbol: normalizedSymbol,
        timeframe,
        exchangeName: usedExchange,
      });

      const firstClose = klines[0]!.close;
      const lastClose = klines[klines.length - 1]!.close;
      const change = lastClose - firstClose;
      const changePct = ((change / firstClose) * 100).toFixed(2);
      const trend = change >= 0 ? '↑' : '↓';

      const summary = [
        `${normalizedSymbol} — ${timeframe} Chart (${usedExchange})`,
        `Open: $${firstClose.toFixed(2)} → Close: $${lastClose.toFixed(2)}`,
        `Change: ${trend} ${changePct}% ($${Math.abs(change).toFixed(2)})`,
        `Data points: ${klines.length}`,
        ``,
        svg,
      ].join('\n');

      return {
        content: [
          {
            type: 'text',
            text: summary,
          },
        ],
      };
    }
  );
}
