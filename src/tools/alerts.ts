import { z } from 'zod';
import { promises as fs } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ExchangeManager } from '../exchanges/manager.js';
import type { ToolResponse } from '../types/index.js';

const ALERTS_DIR = join(homedir(), '.omnitrade');
const ALERTS_FILE = join(ALERTS_DIR, 'alerts.json');

interface PriceAlert {
  id: string;
  symbol: string;
  exchange?: string; // Optional: specific exchange or check all
  condition: 'above' | 'below';
  targetPrice: number;
  createdAt: number;
  triggered?: boolean;
  triggeredAt?: number;
}

interface AlertsData {
  alerts: PriceAlert[];
}

/**
 * Ensure alerts directory and file exist
 */
async function ensureAlertsFile(): Promise<void> {
  try {
    await fs.mkdir(ALERTS_DIR, { recursive: true });
  } catch {
    // Directory exists
  }

  try {
    await fs.access(ALERTS_FILE);
  } catch {
    // File doesn't exist, create it
    await fs.writeFile(ALERTS_FILE, JSON.stringify({ alerts: [] }, null, 2));
  }
}

/**
 * Load alerts from disk
 */
async function loadAlerts(): Promise<AlertsData> {
  await ensureAlertsFile();
  const data = await fs.readFile(ALERTS_FILE, 'utf-8');
  return JSON.parse(data) as AlertsData;
}

/**
 * Save alerts to disk
 */
async function saveAlerts(data: AlertsData): Promise<void> {
  await ensureAlertsFile();
  await fs.writeFile(ALERTS_FILE, JSON.stringify(data, null, 2));
}

/**
 * Generate unique alert ID
 */
function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Check all active alerts and trigger if conditions met
 */
async function checkAlerts(
  exchangeManager: ExchangeManager
): Promise<PriceAlert[]> {
  const data = await loadAlerts();
  const triggered: PriceAlert[] = [];

  // Get active (non-triggered) alerts
  const activeAlerts = data.alerts.filter((a) => !a.triggered);

  if (activeAlerts.length === 0) {
    return [];
  }

  // Check each alert
  for (const alert of activeAlerts) {
    const exchangesToCheck = alert.exchange
      ? [[alert.exchange, exchangeManager.get(alert.exchange)] as const]
      : Array.from(exchangeManager.getAll().entries());

    for (const [exchangeName, exchange] of exchangesToCheck) {
      if (!exchange) continue;

      try {
        const ticker = await exchange.fetchTicker(alert.symbol);
        const currentPrice = ticker.last ?? 0;

        // Check condition
        const conditionMet =
          (alert.condition === 'below' && currentPrice <= alert.targetPrice) ||
          (alert.condition === 'above' && currentPrice >= alert.targetPrice);

        if (conditionMet) {
          // Mark as triggered
          alert.triggered = true;
          alert.triggeredAt = Date.now();
          alert.exchange = exchangeName; // Record which exchange triggered it
          triggered.push(alert);
          break; // Stop checking other exchanges for this alert
        }
      } catch {
        // Skip if ticker fetch fails
        continue;
      }
    }
  }

  // Save updated alerts
  if (triggered.length > 0) {
    await saveAlerts(data);
  }

  return triggered;
}

/**
 * Register alert-related MCP tools
 */
export function registerAlertTools(
  server: McpServer,
  exchangeManager: ExchangeManager
): void {
  // Set price alert
  server.tool(
    'set_price_alert',
    'Set a price alert that triggers when a cryptocurrency reaches a specific price. Example: "Alert me when BTC drops below $40000"',
    {
      symbol: z
        .string()
        .describe('Trading pair in format "BASE/QUOTE" (e.g., "BTC/USDT")'),
      condition: z
        .enum(['above', 'below'])
        .describe('"above" for price going up, "below" for price going down'),
      targetPrice: z.number().positive().describe('Target price to trigger alert'),
      exchange: z
        .string()
        .optional()
        .describe('Specific exchange to monitor (optional, monitors all if omitted)'),
    },
    async ({ symbol, condition, targetPrice, exchange }): Promise<ToolResponse> => {
      const normalizedSymbol = symbol.toUpperCase();

      // Validate exchange if provided
      if (exchange && !exchangeManager.get(exchange)) {
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

      // Create alert
      const alert: PriceAlert = {
        id: generateAlertId(),
        symbol: normalizedSymbol,
        exchange: exchange?.toLowerCase(),
        condition,
        targetPrice,
        createdAt: Date.now(),
      };

      // Save alert
      const data = await loadAlerts();
      data.alerts.push(alert);
      await saveAlerts(data);

      const exchangeMsg = exchange ? ` on ${exchange}` : ' on any exchange';
      const result = {
        message: `✅ Alert set: Notify when ${normalizedSymbol}${exchangeMsg} goes ${condition} $${targetPrice.toFixed(2)}`,
        alertId: alert.id,
        details: {
          symbol: normalizedSymbol,
          condition: `${condition} $${targetPrice.toFixed(2)}`,
          exchange: exchange || 'all exchanges',
          created: new Date(alert.createdAt).toISOString(),
        },
        note: 'Alert will be checked periodically. Use check_alerts to manually trigger a check.',
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

  // List active alerts
  server.tool(
    'list_alerts',
    'List all active price alerts',
    {},
    async (): Promise<ToolResponse> => {
      const data = await loadAlerts();
      const activeAlerts = data.alerts.filter((a) => !a.triggered);
      const triggeredAlerts = data.alerts.filter((a) => a.triggered);

      const result = {
        active: activeAlerts.length,
        triggered: triggeredAlerts.length,
        alerts: {
          active: activeAlerts.map((a) => ({
            id: a.id,
            symbol: a.symbol,
            condition: `${a.condition} $${a.targetPrice.toFixed(2)}`,
            exchange: a.exchange || 'all',
            created: new Date(a.createdAt).toISOString(),
          })),
          recentlyTriggered: triggeredAlerts
            .slice(-5)
            .reverse()
            .map((a) => ({
              id: a.id,
              symbol: a.symbol,
              condition: `${a.condition} $${a.targetPrice.toFixed(2)}`,
              exchange: a.exchange || 'all',
              triggeredAt: new Date(a.triggeredAt!).toISOString(),
            })),
        },
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

  // Check alerts manually
  server.tool(
    'check_alerts',
    'Manually check all active price alerts and return any that have been triggered',
    {},
    async (): Promise<ToolResponse> => {
      const triggered = await checkAlerts(exchangeManager);

      if (triggered.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  message: 'No alerts triggered',
                  note: 'All active alerts are still waiting for their price conditions to be met.',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const result = {
        message: `🚨 ${triggered.length} alert(s) triggered!`,
        triggered: triggered.map((a) => ({
          id: a.id,
          symbol: a.symbol,
          condition: `${a.condition} $${a.targetPrice.toFixed(2)}`,
          exchange: a.exchange,
          triggeredAt: new Date(a.triggeredAt!).toISOString(),
          alert: `${a.symbol} has gone ${a.condition} $${a.targetPrice.toFixed(2)} on ${a.exchange}!`,
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

  // Remove alert
  server.tool(
    'remove_alert',
    'Remove a specific price alert by ID',
    {
      alertId: z.string().describe('Alert ID to remove (get from list_alerts)'),
    },
    async ({ alertId }): Promise<ToolResponse> => {
      const data = await loadAlerts();
      const index = data.alerts.findIndex((a) => a.id === alertId);

      if (index === -1) {
        return {
          content: [
            {
              type: 'text',
              text: `Alert not found: ${alertId}`,
            },
          ],
          isError: true,
        };
      }

      const removed = data.alerts.splice(index, 1)[0]!;
      await saveAlerts(data);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                message: '✅ Alert removed',
                removed: {
                  id: removed.id,
                  symbol: removed.symbol,
                  condition: `${removed.condition} $${removed.targetPrice.toFixed(2)}`,
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

  // Clear all triggered alerts
  server.tool(
    'clear_triggered_alerts',
    'Clear all triggered alerts from history',
    {},
    async (): Promise<ToolResponse> => {
      const data = await loadAlerts();
      const triggeredCount = data.alerts.filter((a) => a.triggered).length;
      data.alerts = data.alerts.filter((a) => !a.triggered);
      await saveAlerts(data);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                message: `✅ Cleared ${triggeredCount} triggered alert(s)`,
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
