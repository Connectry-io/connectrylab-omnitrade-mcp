import { z } from 'zod';
import { promises as fs } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ExchangeManager } from '../exchanges/manager.js';
import type { Config } from '../types/index.js';
import type { ToolResponse } from '../types/index.js';

const CONDITIONAL_DIR = join(homedir(), '.omnitrade');
const CONDITIONAL_FILE = join(CONDITIONAL_DIR, 'conditional-orders.json');

interface ConditionalOrder {
  id: string;
  symbol: string;
  exchange: string;
  condition: {
    type: 'price_above' | 'price_below' | 'price_change_percent';
    targetPrice?: number;
    percentChange?: number;
    direction?: 'up' | 'down';
    basePrice?: number;
  };
  order: {
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    amount: number;
    price?: number;
  };
  enabled: boolean;
  createdAt: number;
  triggered?: boolean;
  triggeredAt?: number;
  orderId?: string;
}

interface ConditionalOrdersData {
  orders: ConditionalOrder[];
}

/**
 * Ensure conditional orders directory and file exist
 */
async function ensureConditionalFile(): Promise<void> {
  try {
    await fs.mkdir(CONDITIONAL_DIR, { recursive: true });
  } catch {
    // Directory exists
  }

  try {
    await fs.access(CONDITIONAL_FILE);
  } catch {
    // File doesn't exist, create it
    await fs.writeFile(
      CONDITIONAL_FILE,
      JSON.stringify({ orders: [] }, null, 2)
    );
  }
}

/**
 * Load conditional orders from disk
 */
async function loadConditionalOrders(): Promise<ConditionalOrdersData> {
  await ensureConditionalFile();
  const data = await fs.readFile(CONDITIONAL_FILE, 'utf-8');
  return JSON.parse(data) as ConditionalOrdersData;
}

/**
 * Save conditional orders to disk
 */
async function saveConditionalOrders(
  data: ConditionalOrdersData
): Promise<void> {
  await ensureConditionalFile();
  await fs.writeFile(CONDITIONAL_FILE, JSON.stringify(data, null, 2));
}

/**
 * Generate unique conditional order ID
 */
function generateOrderId(): string {
  return `cond_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Check if condition is met
 */
function checkCondition(
  order: ConditionalOrder,
  currentPrice: number
): boolean {
  const { condition } = order;

  switch (condition.type) {
    case 'price_above':
      return currentPrice >= (condition.targetPrice ?? Infinity);

    case 'price_below':
      return currentPrice <= (condition.targetPrice ?? 0);

    case 'price_change_percent':
      if (!condition.basePrice || !condition.percentChange) return false;
      const changePercent =
        ((currentPrice - condition.basePrice) / condition.basePrice) * 100;

      if (condition.direction === 'up') {
        return changePercent >= condition.percentChange;
      } else if (condition.direction === 'down') {
        return changePercent <= -condition.percentChange;
      }
      return false;

    default:
      return false;
  }
}

/**
 * Execute conditional order
 */
async function executeConditionalOrder(
  order: ConditionalOrder,
  exchange: any,
  securityConfig?: Config['security']
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  try {
    // Security checks
    if (securityConfig?.confirmTrades !== false) {
      return {
        success: false,
        error:
          'Auto-execution requires security.confirmTrades to be false in config',
      };
    }

    // Execute order
    let result;
    if (order.order.type === 'market') {
      if (order.order.side === 'buy') {
        result = await exchange.createMarketBuyOrder(
          order.symbol,
          order.order.amount
        );
      } else {
        result = await exchange.createMarketSellOrder(
          order.symbol,
          order.order.amount
        );
      }
    } else {
      // Limit order
      result = await exchange.createLimitOrder(
        order.symbol,
        order.order.side,
        order.order.amount,
        order.order.price
      );
    }

    return {
      success: true,
      orderId: result.id,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Check and execute pending conditional orders
 */
async function checkConditionalOrders(
  exchangeManager: ExchangeManager,
  config: Config
): Promise<ConditionalOrder[]> {
  const data = await loadConditionalOrders();
  const triggered: ConditionalOrder[] = [];

  const activeOrders = data.orders.filter((o) => o.enabled && !o.triggered);

  for (const order of activeOrders) {
    const exchange = exchangeManager.get(order.exchange);
    if (!exchange) continue;

    try {
      // Get current price
      const ticker = await exchange.fetchTicker(order.symbol);
      const currentPrice = ticker.last ?? 0;

      if (currentPrice <= 0) continue;

      // Check condition
      if (checkCondition(order, currentPrice)) {
        // Execute order
        const result = await executeConditionalOrder(
          order,
          exchange,
          config.security
        );

        // Mark as triggered
        order.triggered = true;
        order.triggeredAt = Date.now();
        if (result.success) {
          order.orderId = result.orderId;
        }

        triggered.push(order);
      }
    } catch {
      // Skip if error
      continue;
    }
  }

  // Save updated orders
  if (triggered.length > 0) {
    await saveConditionalOrders(data);
  }

  return triggered;
}

/**
 * Register conditional order MCP tools
 */
export function registerConditionalOrderTools(
  server: McpServer,
  exchangeManager: ExchangeManager,
  config: Config
): void {
  // Set conditional order
  server.tool(
    'set_conditional_order',
    'Create a conditional order that executes when a price condition is met. Example: "Buy BTC if it drops 5%"',
    {
      symbol: z
        .string()
        .describe('Trading pair in format "BASE/QUOTE" (e.g., "BTC/USDT")'),
      conditionType: z
        .enum(['price_above', 'price_below', 'price_change_percent'])
        .describe(
          'Condition type: price_above, price_below, or price_change_percent'
        ),
      targetPrice: z
        .number()
        .optional()
        .describe('Target price (for price_above/price_below)'),
      percentChange: z
        .number()
        .optional()
        .describe('Percent change (for price_change_percent, e.g., 5 for 5%)'),
      direction: z
        .enum(['up', 'down'])
        .optional()
        .describe('Direction for price_change_percent (up or down)'),
      orderSide: z.enum(['buy', 'sell']).describe('Order side: buy or sell'),
      orderType: z
        .enum(['market', 'limit'])
        .default('market')
        .describe('Order type: market or limit'),
      amount: z.number().positive().describe('Amount to trade'),
      limitPrice: z
        .number()
        .optional()
        .describe('Limit price (required if orderType is limit)'),
      exchange: z
        .string()
        .optional()
        .describe('Exchange to use (default: first configured exchange)'),
    },
    async ({
      symbol,
      conditionType,
      targetPrice,
      percentChange,
      direction,
      orderSide,
      orderType,
      amount,
      limitPrice,
      exchange,
    }): Promise<ToolResponse> => {
      const normalizedSymbol = symbol.toUpperCase();

      // Validate inputs
      if (
        (conditionType === 'price_above' || conditionType === 'price_below') &&
        !targetPrice
      ) {
        return {
          content: [
            {
              type: 'text',
              text: `targetPrice is required for ${conditionType}`,
            },
          ],
          isError: true,
        };
      }

      if (
        conditionType === 'price_change_percent' &&
        (!percentChange || !direction)
      ) {
        return {
          content: [
            {
              type: 'text',
              text: 'percentChange and direction are required for price_change_percent',
            },
          ],
          isError: true,
        };
      }

      if (orderType === 'limit' && !limitPrice) {
        return {
          content: [
            {
              type: 'text',
              text: 'limitPrice is required for limit orders',
            },
          ],
          isError: true,
        };
      }

      // Select exchange
      let exchangeName: string;
      let selectedExchange;

      if (exchange) {
        selectedExchange = exchangeManager.get(exchange);
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
        [exchangeName, selectedExchange] = firstEntry;
      }

      // Get current price for price_change_percent
      let basePrice: number | undefined;
      if (conditionType === 'price_change_percent') {
        try {
          const ticker = await selectedExchange.fetchTicker(normalizedSymbol);
          basePrice = ticker.last ?? 0;
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Failed to get current price: ${(error as Error).message}`,
              },
            ],
            isError: true,
          };
        }
      }

      // Create conditional order
      const conditionalOrder: ConditionalOrder = {
        id: generateOrderId(),
        symbol: normalizedSymbol,
        exchange: exchangeName,
        condition: {
          type: conditionType,
          targetPrice,
          percentChange,
          direction,
          basePrice,
        },
        order: {
          side: orderSide,
          type: orderType,
          amount,
          price: limitPrice,
        },
        enabled: true,
        createdAt: Date.now(),
      };

      // Save
      const data = await loadConditionalOrders();
      data.orders.push(conditionalOrder);
      await saveConditionalOrders(data);

      // Build condition description
      let conditionDesc = '';
      if (conditionType === 'price_above') {
        conditionDesc = `price goes above $${targetPrice}`;
      } else if (conditionType === 'price_below') {
        conditionDesc = `price goes below $${targetPrice}`;
      } else if (conditionType === 'price_change_percent') {
        conditionDesc = `price ${direction === 'up' ? 'increases' : 'decreases'} by ${percentChange}% (base: $${basePrice?.toFixed(2)})`;
      }

      const result = {
        message: '✅ Conditional order created',
        orderId: conditionalOrder.id,
        details: {
          symbol: normalizedSymbol,
          condition: conditionDesc,
          willExecute: `${orderType.toUpperCase()} ${orderSide.toUpperCase()} ${amount} ${normalizedSymbol.split('/')[0]}${limitPrice ? ` at $${limitPrice}` : ''}`,
          exchange: exchangeName,
          status: 'enabled',
          created: new Date(conditionalOrder.createdAt).toISOString(),
        },
        note: 'Run check_conditional_orders periodically to monitor and execute orders.',
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

  // List conditional orders
  server.tool(
    'list_conditional_orders',
    'List all conditional orders',
    {},
    async (): Promise<ToolResponse> => {
      const data = await loadConditionalOrders();

      if (data.orders.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  message: 'No conditional orders',
                  note: 'Use set_conditional_order to create conditional orders.',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const result = {
        total: data.orders.length,
        active: data.orders.filter((o) => o.enabled && !o.triggered).length,
        triggered: data.orders.filter((o) => o.triggered).length,
        orders: data.orders.map((o) => ({
          id: o.id,
          symbol: o.symbol,
          exchange: o.exchange,
          condition: o.condition,
          order: o.order,
          status: o.triggered
            ? 'triggered'
            : o.enabled
              ? 'active'
              : 'disabled',
          createdAt: new Date(o.createdAt).toISOString(),
          triggeredAt: o.triggeredAt
            ? new Date(o.triggeredAt).toISOString()
            : undefined,
          orderId: o.orderId,
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

  // Check conditional orders
  server.tool(
    'check_conditional_orders',
    'Check all active conditional orders and execute any that meet their conditions',
    {},
    async (): Promise<ToolResponse> => {
      const triggered = await checkConditionalOrders(exchangeManager, config);

      if (triggered.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  message: 'No conditional orders triggered',
                  note: 'All active orders are still waiting for their conditions to be met.',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const result = {
        message: `🚨 ${triggered.length} conditional order(s) triggered!`,
        triggered: triggered.map((o) => ({
          id: o.id,
          symbol: o.symbol,
          exchange: o.exchange,
          condition: o.condition,
          orderExecuted: !!o.orderId,
          orderId: o.orderId,
          triggeredAt: new Date(o.triggeredAt!).toISOString(),
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

  // Remove conditional order
  server.tool(
    'remove_conditional_order',
    'Remove a conditional order',
    {
      orderId: z
        .string()
        .describe('Order ID (get from list_conditional_orders)'),
    },
    async ({ orderId }): Promise<ToolResponse> => {
      const data = await loadConditionalOrders();
      const index = data.orders.findIndex((o) => o.id === orderId);

      if (index === -1) {
        return {
          content: [
            {
              type: 'text',
              text: `Conditional order not found: ${orderId}`,
            },
          ],
          isError: true,
        };
      }

      const removed = data.orders.splice(index, 1)[0]!;
      await saveConditionalOrders(data);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                message: '✅ Conditional order removed',
                removed: {
                  id: removed.id,
                  symbol: removed.symbol,
                  condition: removed.condition,
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
