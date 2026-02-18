import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ExchangeManager } from '../exchanges/manager.js';
import type { ToolResponse } from '../types/index.js';

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
 * Get CCXT timeframe string from our timeframe
 */
function getCCXTTimeframe(timeframe: string): string {
  const mapping: Record<string, string> = {
    '1h': '1h',
    '4h': '4h',
    '24h': '1d',
    '7d': '1d',
  };
  return mapping[timeframe] ?? '1h';
}

/**
 * Render ASCII chart from OHLCV data
 */
function renderASCIIChart(
  ohlcv: number[][],
  symbol: string,
  timeframe: string,
  width: number = 60,
  height: number = 15
): string {
  if (ohlcv.length === 0) {
    return 'No data available';
  }

  // Extract close prices
  const prices = ohlcv.map((candle) => candle[4]!); // Close price

  // Find min/max for scaling
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  if (priceRange === 0) {
    return 'Insufficient price movement to display chart';
  }

  // Scale prices to chart height
  const scaledPrices = prices.map((price) =>
    Math.round(((price - minPrice) / priceRange) * (height - 1))
  );

  // Build chart grid
  const grid: string[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(' '));

  // Plot price line
  const step = Math.max(1, Math.floor(prices.length / width));
  let x = 0;

  for (let i = 0; i < prices.length && x < width; i += step, x++) {
    const y = height - 1 - scaledPrices[i]!;
    if (y >= 0 && y < height) {
      grid[y]![x] = '█';

      // Fill column below to make it more visible
      for (let fillY = y + 1; fillY < height; fillY++) {
        if (grid[fillY]![x] === ' ') {
          grid[fillY]![x] = '▄';
        }
      }
    }
  }

  // Add price scale on the right
  const priceSteps = 5;
  for (let i = 0; i <= priceSteps; i++) {
    const y = Math.floor((i * (height - 1)) / priceSteps);
    const price = maxPrice - (i * priceRange) / priceSteps;
    const priceStr = `$${price.toFixed(2)}`;
    grid[y]![width - 1] = '│';
  }

  // Convert grid to string
  let chart = '';
  for (let y = 0; y < height; y++) {
    chart += grid[y]!.join('') + '\n';
  }

  // Add title and footer
  const title = `${symbol} - ${timeframe} Chart`;
  const firstPrice = prices[0]!;
  const lastPrice = prices[prices.length - 1]!;
  const change = lastPrice - firstPrice;
  const changePercent = ((change / firstPrice) * 100).toFixed(2);
  const trend = change >= 0 ? '↑' : '↓';

  const header = `╔${'═'.repeat(width)}╗\n║ ${title.padEnd(width - 2)}║\n╠${'═'.repeat(width)}╣\n`;
  const footer = `╚${'═'.repeat(width)}╝\n`;
  const stats = `Start: $${firstPrice.toFixed(2)} | End: $${lastPrice.toFixed(2)} | Change: ${trend} ${changePercent}% ($${Math.abs(change).toFixed(2)})`;

  return header + chart + footer + stats;
}

/**
 * Register chart-related MCP tools
 */
export function registerChartTools(
  server: McpServer,
  exchangeManager: ExchangeManager
): void {
  server.tool(
    'get_chart',
    'Display an ASCII price chart for a cryptocurrency pair. Example: "Show BTC chart last 24h"',
    {
      symbol: z
        .string()
        .describe('Trading pair in format "BASE/QUOTE" (e.g., "BTC/USDT")'),
      timeframe: z
        .enum(['1h', '4h', '24h', '7d'])
        .default('24h')
        .describe('Time period: 1h, 4h, 24h, or 7d (default: 24h)'),
      exchange: z
        .string()
        .optional()
        .describe('Specific exchange name. Omit to use first available exchange.'),
    },
    async ({ symbol, timeframe, exchange }): Promise<ToolResponse> => {
      const normalizedSymbol = symbol.toUpperCase();

      // Select exchange
      let selectedExchange;
      let exchangeName;

      if (exchange) {
        selectedExchange = exchangeManager.get(exchange);
        exchangeName = exchange.toLowerCase();
        if (!selectedExchange) {
          return {
            content: [
              {
                type: 'text',
                text: `Exchange not configured: ${exchange}. Available: ${exchangeManager.getNames().join(', ')}`,
              },
            ],
            isError: true,
          };
        }
      } else {
        // Use first available exchange
        const firstEntry = Array.from(exchangeManager.getAll().entries())[0];
        if (!firstEntry) {
          return {
            content: [
              {
                type: 'text',
                text: 'No exchanges configured.',
              },
            ],
            isError: true,
          };
        }
        [exchangeName, selectedExchange] = firstEntry;
      }

      // Check if exchange supports OHLCV
      if (!selectedExchange.has.fetchOHLCV) {
        return {
          content: [
            {
              type: 'text',
              text: `Exchange ${exchangeName} does not support OHLCV data (candles). Try a different exchange.`,
            },
          ],
          isError: true,
        };
      }

      try {
        // Calculate time range
        const now = Date.now();
        const since = now - timeframeToMs(timeframe);
        const ccxtTimeframe = getCCXTTimeframe(timeframe);

        // Fetch OHLCV data
        const ohlcv = await selectedExchange.fetchOHLCV(
          normalizedSymbol,
          ccxtTimeframe,
          since
        );

        if (!ohlcv || ohlcv.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No chart data available for ${normalizedSymbol} on ${exchangeName}`,
              },
            ],
            isError: true,
          };
        }

        // Render chart
        const chart = renderASCIIChart(ohlcv as unknown as number[][], normalizedSymbol, timeframe);

        const result = `${chart}\n\nExchange: ${exchangeName} | Data points: ${ohlcv.length}`;

        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to fetch chart data: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
