import { z } from 'zod';
import { promises as fs } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ExchangeManager } from '../exchanges/manager.js';
import type { Config } from '../types/index.js';
import type { ToolResponse } from '../types/index.js';

const DCA_DIR = join(homedir(), '.omnitrade');
const DCA_FILE = join(DCA_DIR, 'dca.json');

interface DCAConfig {
  id: string;
  symbol: string;
  exchange: string;
  amountUSD: number;
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  enabled: boolean;
  createdAt: number;
  lastExecuted?: number;
  totalExecutions: number;
  totalSpent: number;
}

interface DCAData {
  configs: DCAConfig[];
}

/**
 * Ensure DCA directory and file exist
 */
async function ensureDCAFile(): Promise<void> {
  try {
    await fs.mkdir(DCA_DIR, { recursive: true });
  } catch {
    // Directory exists
  }

  try {
    await fs.access(DCA_FILE);
  } catch {
    // File doesn't exist, create it
    await fs.writeFile(DCA_FILE, JSON.stringify({ configs: [] }, null, 2));
  }
}

/**
 * Load DCA configs from disk
 */
async function loadDCAConfigs(): Promise<DCAData> {
  await ensureDCAFile();
  const data = await fs.readFile(DCA_FILE, 'utf-8');
  return JSON.parse(data) as DCAData;
}

/**
 * Save DCA configs to disk
 */
async function saveDCAConfigs(data: DCAData): Promise<void> {
  await ensureDCAFile();
  await fs.writeFile(DCA_FILE, JSON.stringify(data, null, 2));
}

/**
 * Generate unique DCA ID
 */
function generateDCAId(): string {
  return `dca_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Get frequency interval in milliseconds
 */
function getFrequencyMs(frequency: DCAConfig['frequency']): number {
  const intervals: Record<DCAConfig['frequency'], number> = {
    hourly: 60 * 60 * 1000,
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
  };
  return intervals[frequency];
}

/**
 * Check if DCA should execute
 */
function shouldExecute(config: DCAConfig, now: number): boolean {
  if (!config.enabled) return false;
  if (!config.lastExecuted) return true; // Never executed

  const timeSinceLastExecution = now - config.lastExecuted;
  const frequencyMs = getFrequencyMs(config.frequency);

  return timeSinceLastExecution >= frequencyMs;
}

/**
 * Execute a single DCA order
 */
async function executeDCAOrder(
  config: DCAConfig,
  exchange: any,
  securityConfig?: Config['security']
): Promise<{ success: boolean; orderId?: string; error?: string; spent?: number }> {
  try {
    // Get current price to calculate amount
    const ticker = await exchange.fetchTicker(config.symbol);
    const price = ticker.last ?? 0;

    if (price <= 0) {
      return { success: false, error: 'Invalid price' };
    }

    // Calculate amount to buy
    const amount = config.amountUSD / price;

    // Security check
    if (securityConfig?.maxOrderSize && config.amountUSD > securityConfig.maxOrderSize) {
      return {
        success: false,
        error: `Order size $${config.amountUSD} exceeds max order size $${securityConfig.maxOrderSize}`,
      };
    }

    // Execute market buy order
    const order = await exchange.createMarketBuyOrder(config.symbol, amount);

    return {
      success: true,
      orderId: order.id,
      spent: order.cost ?? config.amountUSD,
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Register DCA MCP tools
 */
export function registerDCATools(
  server: McpServer,
  exchangeManager: ExchangeManager,
  config: Config
): void {
  // Setup DCA
  server.tool(
    'setup_dca',
    'Setup Dollar Cost Averaging (DCA) to buy crypto at regular intervals. Example: "Buy $10 of BTC every day"',
    {
      symbol: z
        .string()
        .describe('Trading pair in format "BASE/QUOTE" (e.g., "BTC/USDT")'),
      amountUSD: z
        .number()
        .positive()
        .describe('USD amount to invest each interval (e.g., 10 for $10)'),
      frequency: z
        .enum(['hourly', 'daily', 'weekly', 'monthly'])
        .describe('How often to execute the DCA order'),
      exchange: z
        .string()
        .optional()
        .describe('Exchange to use (default: first configured exchange)'),
    },
    async ({ symbol, amountUSD, frequency, exchange }): Promise<ToolResponse> => {
      const normalizedSymbol = symbol.toUpperCase();

      // Select exchange
      let exchangeName: string;
      if (exchange) {
        const ex = exchangeManager.get(exchange);
        if (!ex) {
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
        exchangeName = exchange.toLowerCase();
      } else {
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
        exchangeName = firstEntry[0];
      }

      // Create DCA config
      const dcaConfig: DCAConfig = {
        id: generateDCAId(),
        symbol: normalizedSymbol,
        exchange: exchangeName,
        amountUSD,
        frequency,
        enabled: true,
        createdAt: Date.now(),
        totalExecutions: 0,
        totalSpent: 0,
      };

      // Save config
      const data = await loadDCAConfigs();
      data.configs.push(dcaConfig);
      await saveDCAConfigs(data);

      const result = {
        message: '✅ DCA strategy created',
        dcaId: dcaConfig.id,
        details: {
          symbol: normalizedSymbol,
          amountUSD: `$${amountUSD}`,
          frequency,
          exchange: exchangeName,
          status: 'enabled',
          created: new Date(dcaConfig.createdAt).toISOString(),
        },
        note: 'Run execute_dca_orders periodically to process pending DCA orders. Consider setting up an external scheduler (cron) to run this automatically.',
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

  // List DCA configs
  server.tool(
    'list_dca_configs',
    'List all DCA (Dollar Cost Averaging) configurations',
    {},
    async (): Promise<ToolResponse> => {
      const data = await loadDCAConfigs();

      if (data.configs.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  message: 'No DCA strategies configured',
                  note: 'Use setup_dca to create a Dollar Cost Averaging strategy.',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const result = {
        total: data.configs.length,
        enabled: data.configs.filter((c) => c.enabled).length,
        disabled: data.configs.filter((c) => !c.enabled).length,
        configs: data.configs.map((c) => ({
          id: c.id,
          symbol: c.symbol,
          exchange: c.exchange,
          amountUSD: `$${c.amountUSD}`,
          frequency: c.frequency,
          status: c.enabled ? 'enabled' : 'disabled',
          totalExecutions: c.totalExecutions,
          totalSpent: `$${c.totalSpent.toFixed(2)}`,
          lastExecuted: c.lastExecuted
            ? new Date(c.lastExecuted).toISOString()
            : 'never',
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

  // Execute pending DCA orders
  server.tool(
    'execute_dca_orders',
    'Execute any pending DCA orders based on their schedules. Run this periodically (e.g., via cron).',
    {},
    async (): Promise<ToolResponse> => {
      const data = await loadDCAConfigs();
      const now = Date.now();

      const toExecute = data.configs.filter((c) => shouldExecute(c, now));

      if (toExecute.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  message: 'No DCA orders ready to execute',
                  note: 'All DCA orders are either disabled or not due yet.',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const results = [];

      for (const dcaConfig of toExecute) {
        const exchange = exchangeManager.get(dcaConfig.exchange);

        if (!exchange) {
          results.push({
            dcaId: dcaConfig.id,
            symbol: dcaConfig.symbol,
            success: false,
            error: `Exchange ${dcaConfig.exchange} not configured`,
          });
          continue;
        }

        const result = await executeDCAOrder(dcaConfig, exchange, config.security);

        if (result.success) {
          // Update config
          dcaConfig.lastExecuted = now;
          dcaConfig.totalExecutions += 1;
          dcaConfig.totalSpent += result.spent ?? dcaConfig.amountUSD;

          results.push({
            dcaId: dcaConfig.id,
            symbol: dcaConfig.symbol,
            success: true,
            orderId: result.orderId,
            spent: `$${(result.spent ?? dcaConfig.amountUSD).toFixed(2)}`,
          });
        } else {
          results.push({
            dcaId: dcaConfig.id,
            symbol: dcaConfig.symbol,
            success: false,
            error: result.error,
          });
        }
      }

      // Save updated configs
      await saveDCAConfigs(data);

      const successCount = results.filter((r) => r.success).length;
      const failedCount = results.filter((r) => !r.success).length;

      const response = {
        message: `DCA execution complete: ${successCount} succeeded, ${failedCount} failed`,
        executed: successCount,
        failed: failedCount,
        results,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    }
  );

  // Toggle DCA config
  server.tool(
    'toggle_dca',
    'Enable or disable a DCA configuration',
    {
      dcaId: z.string().describe('DCA ID (get from list_dca_configs)'),
      enabled: z.boolean().describe('true to enable, false to disable'),
    },
    async ({ dcaId, enabled }): Promise<ToolResponse> => {
      const data = await loadDCAConfigs();
      const config = data.configs.find((c) => c.id === dcaId);

      if (!config) {
        return {
          content: [
            {
              type: 'text',
              text: `DCA config not found: ${dcaId}`,
            },
          ],
          isError: true,
        };
      }

      config.enabled = enabled;
      await saveDCAConfigs(data);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                message: `✅ DCA ${enabled ? 'enabled' : 'disabled'}`,
                dcaId: config.id,
                symbol: config.symbol,
                status: enabled ? 'enabled' : 'disabled',
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // Remove DCA config
  server.tool(
    'remove_dca',
    'Remove a DCA configuration',
    {
      dcaId: z.string().describe('DCA ID (get from list_dca_configs)'),
    },
    async ({ dcaId }): Promise<ToolResponse> => {
      const data = await loadDCAConfigs();
      const index = data.configs.findIndex((c) => c.id === dcaId);

      if (index === -1) {
        return {
          content: [
            {
              type: 'text',
              text: `DCA config not found: ${dcaId}`,
            },
          ],
          isError: true,
        };
      }

      const removed = data.configs.splice(index, 1)[0]!;
      await saveDCAConfigs(data);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                message: '✅ DCA configuration removed',
                removed: {
                  id: removed.id,
                  symbol: removed.symbol,
                  amountUSD: `$${removed.amountUSD}`,
                  frequency: removed.frequency,
                },
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
