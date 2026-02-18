import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ExchangeManager } from '../exchanges/manager.js';
import type { Config, OrderResult, ToolResponse } from '../types/index.js';

/**
 * Register order-related MCP tools
 */
export function registerOrderTools(
  server: McpServer,
  exchangeManager: ExchangeManager,
  config: Config
): void {
  // Place an order
  server.tool(
    'place_order',
    'Execute a buy or sell order on an exchange. Supports market and limit orders with safety checks.',
    {
      exchange: z.string().describe('Exchange to trade on (e.g., "binance", "coinbase")'),
      symbol: z.string().describe('Trading pair (e.g., "BTC/USDT", "ETH/USD")'),
      side: z.enum(['buy', 'sell']).describe('Order side: "buy" or "sell"'),
      type: z
        .enum(['market', 'limit'])
        .default('market')
        .describe('Order type: "market" (immediate) or "limit" (at specified price)'),
      amount: z.number().positive().describe('Amount of base currency to trade'),
      price: z
        .number()
        .positive()
        .optional()
        .describe('Limit price (required for limit orders, ignored for market orders)'),
    },
    async ({ exchange, symbol, side, type, amount, price }): Promise<ToolResponse> => {
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

      const normalizedSymbol = symbol.toUpperCase();
      const security = config.security;

      // ====== SECURITY CHECKS ======

      // Check allowed pairs whitelist
      if (security?.allowedPairs && security.allowedPairs.length > 0) {
        const allowed = security.allowedPairs.map((p) => p.toUpperCase());
        if (!allowed.includes(normalizedSymbol)) {
          return {
            content: [
              {
                type: 'text',
                text: `Trading pair not in allowlist: ${normalizedSymbol}\nAllowed pairs: ${allowed.join(', ')}`,
              },
            ],
            isError: true,
          };
        }
      }

      // Check max order size (estimate USD value)
      if (security?.maxOrderSize) {
        try {
          const ticker = await ex.fetchTicker(normalizedSymbol);
          const estimatedUsdValue = amount * (ticker.last ?? 0);

          if (estimatedUsdValue > security.maxOrderSize) {
            return {
              content: [
                {
                  type: 'text',
                  text:
                    `Order exceeds maximum allowed size.\n` +
                    `Estimated value: $${estimatedUsdValue.toFixed(2)}\n` +
                    `Maximum allowed: $${security.maxOrderSize}\n` +
                    `Reduce amount or update security.maxOrderSize in config.`,
                },
              ],
              isError: true,
            };
          }
        } catch {
          // Can't fetch price to check, warn but continue
          console.error('Warning: Could not verify order size against limit');
        }
      }

      // Limit order requires price
      if (type === 'limit' && !price) {
        return {
          content: [
            {
              type: 'text',
              text: 'Limit orders require a price. Please specify the "price" parameter.',
            },
          ],
          isError: true,
        };
      }

      // ====== EXECUTE ORDER ======

      try {
        let order;

        if (type === 'market') {
          order = await ex.createMarketOrder(normalizedSymbol, side, amount);
        } else {
          order = await ex.createLimitOrder(normalizedSymbol, side, amount, price!);
        }

        const result: OrderResult = {
          success: true,
          orderId: order.id,
          exchange,
          symbol: normalizedSymbol,
          side,
          type,
          amount: order.amount,
          filled: order.filled,
          remaining: order.remaining,
          price: order.price ?? order.average,
          cost: order.cost,
          status: order.status ?? '',
          timestamp: order.timestamp ?? Date.now(),
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Order failed: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Get open/closed orders
  server.tool(
    'get_orders',
    'View open and recent orders. Can filter by exchange, trading pair, or status.',
    {
      exchange: z.string().optional().describe('Filter by exchange name'),
      symbol: z.string().optional().describe('Filter by trading pair'),
      status: z
        .enum(['open', 'closed', 'all'])
        .default('open')
        .describe('Order status filter: "open", "closed", or "all"'),
      limit: z.number().positive().max(100).default(20).describe('Maximum orders to return'),
    },
    async ({ exchange, symbol, status, limit }): Promise<ToolResponse> => {
      const orders: unknown[] = [];
      const errors: string[] = [];

      const normalizedSymbol = symbol?.toUpperCase();

      // Determine which exchanges to query
      const exchangesToQuery = exchange
        ? [[exchange.toLowerCase(), exchangeManager.get(exchange)] as const].filter(
            ([, ex]) => ex !== undefined
          )
        : Array.from(exchangeManager.getAll().entries());

      for (const [name, ex] of exchangesToQuery) {
        if (!ex) continue;

        try {
          let fetchedOrders: unknown[] = [];

          if (status === 'open' || status === 'all') {
            const open = await ex.fetchOpenOrders(normalizedSymbol);
            fetchedOrders.push(...open.map((o) => ({ ...o, exchange: name })));
          }

          if (status === 'closed' || status === 'all') {
            const closed = await ex.fetchClosedOrders(normalizedSymbol, undefined, limit);
            fetchedOrders.push(...closed.map((o) => ({ ...o, exchange: name })));
          }

          orders.push(...fetchedOrders);
        } catch (error) {
          errors.push(`${name}: ${(error as Error).message}`);
        }
      }

      // Sort by timestamp descending
      orders.sort((a, b) => {
        const aTime = (a as { timestamp?: number }).timestamp ?? 0;
        const bTime = (b as { timestamp?: number }).timestamp ?? 0;
        return bTime - aTime;
      });

      // Limit results
      const limited = orders.slice(0, limit);

      const result = {
        count: limited.length,
        status,
        orders: limited,
        errors: errors.length > 0 ? errors : undefined,
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

  // Cancel an order
  server.tool(
    'cancel_order',
    'Cancel an open order by its ID.',
    {
      exchange: z.string().describe('Exchange where the order was placed'),
      orderId: z.string().describe('Order ID to cancel'),
      symbol: z.string().describe('Trading pair of the order'),
    },
    async ({ exchange, orderId, symbol }): Promise<ToolResponse> => {
      const ex = exchangeManager.get(exchange);

      if (!ex) {
        return {
          content: [
            {
              type: 'text',
              text: `Exchange not configured: ${exchange}`,
            },
          ],
          isError: true,
        };
      }

      try {
        const result = await ex.cancelOrder(orderId, symbol.toUpperCase());

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  orderId,
                  exchange,
                  symbol: symbol.toUpperCase(),
                  status: 'cancelled',
                  result,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to cancel order: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
