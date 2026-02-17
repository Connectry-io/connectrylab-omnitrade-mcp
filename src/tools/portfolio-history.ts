import { z } from 'zod';
import { promises as fs } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ExchangeManager } from '../exchanges/manager.js';
import type { ToolResponse } from '../types/index.js';

const HISTORY_DIR = join(homedir(), '.omnitrade');
const HISTORY_FILE = join(HISTORY_DIR, 'history.json');

interface PortfolioSnapshot {
  timestamp: number;
  totalValueUSD: number;
  exchanges: {
    [exchange: string]: {
      totalValueUSD: number;
      assets: {
        [asset: string]: {
          amount: number;
          usdValue: number;
        };
      };
    };
  };
}

interface HistoryData {
  snapshots: PortfolioSnapshot[];
}

/**
 * Ensure history directory and file exist
 */
async function ensureHistoryFile(): Promise<void> {
  try {
    await fs.mkdir(HISTORY_DIR, { recursive: true });
  } catch {
    // Directory exists
  }

  try {
    await fs.access(HISTORY_FILE);
  } catch {
    // File doesn't exist, create it
    await fs.writeFile(HISTORY_FILE, JSON.stringify({ snapshots: [] }, null, 2));
  }
}

/**
 * Load history from disk
 */
async function loadHistory(): Promise<HistoryData> {
  await ensureHistoryFile();
  const data = await fs.readFile(HISTORY_FILE, 'utf-8');
  return JSON.parse(data) as HistoryData;
}

/**
 * Save history to disk
 */
async function saveHistory(data: HistoryData): Promise<void> {
  await ensureHistoryFile();
  await fs.writeFile(HISTORY_FILE, JSON.stringify(data, null, 2));
}

/**
 * Get current portfolio value across all exchanges
 */
async function getCurrentPortfolioValue(
  exchangeManager: ExchangeManager
): Promise<PortfolioSnapshot> {
  const snapshot: PortfolioSnapshot = {
    timestamp: Date.now(),
    totalValueUSD: 0,
    exchanges: {},
  };

  // Fetch balances from all exchanges
  for (const [exchangeName, exchange] of exchangeManager.getAll()) {
    try {
      const balance = await exchange.fetchBalance();
      const exchangeData: PortfolioSnapshot['exchanges'][string] = {
        totalValueUSD: 0,
        assets: {},
      };

      // Process each asset
      for (const [asset, assetBalance] of Object.entries(balance)) {
        if (asset === 'free' || asset === 'used' || asset === 'total') continue;

        const total = (assetBalance as { total?: number }).total ?? 0;
        if (total <= 0) continue;

        // Try to get USD value
        let usdValue = 0;
        try {
          // Try ASSET/USDT, ASSET/USD, ASSET/BUSD
          const pairs = [`${asset}/USDT`, `${asset}/USD`, `${asset}/BUSD`];
          for (const pair of pairs) {
            try {
              const ticker = await exchange.fetchTicker(pair);
              const price = ticker.last ?? 0;
              usdValue = total * price;
              break;
            } catch {
              continue;
            }
          }

          // If asset is a stablecoin, use 1:1
          if (
            usdValue === 0 &&
            ['USDT', 'USD', 'USDC', 'BUSD', 'DAI'].includes(asset)
          ) {
            usdValue = total;
          }
        } catch {
          // Skip if can't get price
        }

        if (usdValue > 0) {
          exchangeData.assets[asset] = {
            amount: total,
            usdValue,
          };
          exchangeData.totalValueUSD += usdValue;
        }
      }

      if (exchangeData.totalValueUSD > 0) {
        snapshot.exchanges[exchangeName] = exchangeData;
        snapshot.totalValueUSD += exchangeData.totalValueUSD;
      }
    } catch {
      // Skip exchange if fetch fails
      continue;
    }
  }

  return snapshot;
}

/**
 * Calculate time range in milliseconds
 */
function getTimeRange(period: string): number {
  const ranges: Record<string, number> = {
    '1d': 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
    '1m': 30 * 24 * 60 * 60 * 1000,
    '3m': 90 * 24 * 60 * 60 * 1000,
    '1y': 365 * 24 * 60 * 60 * 1000,
  };
  return ranges[period] ?? ranges['1w']!;
}

/**
 * Register portfolio history MCP tools
 */
export function registerPortfolioHistoryTools(
  server: McpServer,
  exchangeManager: ExchangeManager
): void {
  // Record current portfolio snapshot
  server.tool(
    'record_portfolio_snapshot',
    'Record current portfolio value as a snapshot in history. Run this periodically to track portfolio performance over time.',
    {},
    async (): Promise<ToolResponse> => {
      const snapshot = await getCurrentPortfolioValue(exchangeManager);
      const history = await loadHistory();

      history.snapshots.push(snapshot);

      // Keep last 1000 snapshots (prevent file from growing too large)
      if (history.snapshots.length > 1000) {
        history.snapshots = history.snapshots.slice(-1000);
      }

      await saveHistory(history);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                message: '✅ Portfolio snapshot recorded',
                totalValueUSD: snapshot.totalValueUSD.toFixed(2),
                timestamp: new Date(snapshot.timestamp).toISOString(),
                exchanges: Object.keys(snapshot.exchanges).length,
                totalSnapshots: history.snapshots.length,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // Get portfolio history and P&L
  server.tool(
    'get_portfolio_history',
    'View portfolio value history and profit/loss over a time period. Example: "How has my portfolio performed this week?"',
    {
      period: z
        .enum(['1d', '1w', '1m', '3m', '1y', 'all'])
        .default('1w')
        .describe(
          'Time period: 1d (1 day), 1w (1 week), 1m (1 month), 3m (3 months), 1y (1 year), all (entire history)'
        ),
    },
    async ({ period }): Promise<ToolResponse> => {
      const history = await loadHistory();

      if (history.snapshots.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  message: 'No portfolio history recorded yet',
                  note: 'Use record_portfolio_snapshot to start tracking your portfolio over time.',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Filter snapshots by time period
      let filteredSnapshots = history.snapshots;
      if (period !== 'all') {
        const cutoffTime = Date.now() - getTimeRange(period);
        filteredSnapshots = history.snapshots.filter(
          (s) => s.timestamp >= cutoffTime
        );
      }

      if (filteredSnapshots.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No snapshots found in the last ${period}. Try a longer period or record more snapshots.`,
            },
          ],
          isError: true,
        };
      }

      // Calculate P&L
      const firstSnapshot = filteredSnapshots[0]!;
      const lastSnapshot = filteredSnapshots[filteredSnapshots.length - 1]!;
      const startValue = firstSnapshot.totalValueUSD;
      const endValue = lastSnapshot.totalValueUSD;
      const profitLoss = endValue - startValue;
      const profitLossPercent =
        startValue > 0 ? ((profitLoss / startValue) * 100).toFixed(2) : '0.00';
      const trend = profitLoss >= 0 ? '↑' : '↓';

      // Find highest and lowest values
      const values = filteredSnapshots.map((s) => s.totalValueUSD);
      const highestValue = Math.max(...values);
      const lowestValue = Math.min(...values);

      const result = {
        period,
        performance: {
          startValue: `$${startValue.toFixed(2)}`,
          endValue: `$${endValue.toFixed(2)}`,
          profitLoss: `${trend} $${Math.abs(profitLoss).toFixed(2)}`,
          profitLossPercent: `${profitLossPercent}%`,
          trend: profitLoss >= 0 ? 'UP' : 'DOWN',
        },
        stats: {
          highestValue: `$${highestValue.toFixed(2)}`,
          lowestValue: `$${lowestValue.toFixed(2)}`,
          snapshots: filteredSnapshots.length,
          firstSnapshot: new Date(firstSnapshot.timestamp).toISOString(),
          lastSnapshot: new Date(lastSnapshot.timestamp).toISOString(),
        },
        recentSnapshots: filteredSnapshots.slice(-10).map((s) => ({
          timestamp: new Date(s.timestamp).toISOString(),
          totalValueUSD: s.totalValueUSD.toFixed(2),
        })),
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  // Clear portfolio history
  server.tool(
    'clear_portfolio_history',
    'Clear all portfolio history snapshots (use with caution)',
    {},
    async (): Promise<ToolResponse> => {
      await saveHistory({ snapshots: [] });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                message: '✅ Portfolio history cleared',
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
