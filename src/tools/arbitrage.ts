import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ExchangeManager } from '../exchanges/manager.js';
import type { Config } from '../types/index.js';
import type { ArbitrageOpportunity, ArbitrageResult, ToolResponse } from '../types/index.js';

// Common trading pairs to check for arbitrage
const DEFAULT_SYMBOLS = [
  'BTC/USDT',
  'ETH/USDT',
  'BNB/USDT',
  'SOL/USDT',
  'XRP/USDT',
  'ADA/USDT',
  'DOGE/USDT',
  'DOT/USDT',
  'MATIC/USDT',
  'LTC/USDT',
];

/**
 * Register arbitrage-related MCP tools
 */
export function registerArbitrageTools(
  server: McpServer,
  exchangeManager: ExchangeManager,
  config?: Config
): void {
  server.tool(
    'get_arbitrage',
    'Find arbitrage opportunities by comparing prices across exchanges. Identifies pairs where you can buy low on one exchange and sell high on another.',
    {
      symbols: z
        .array(z.string())
        .optional()
        .describe(
          'Trading pairs to check (e.g., ["BTC/USDT", "ETH/USDT"]). Defaults to top 10 pairs.'
        ),
      minSpread: z
        .number()
        .min(0)
        .max(100)
        .default(0.5)
        .describe('Minimum spread percentage to report (default: 0.5%)'),
    },
    async ({ symbols, minSpread }): Promise<ToolResponse> => {
      const checkSymbols = symbols ?? DEFAULT_SYMBOLS;
      const opportunities: ArbitrageOpportunity[] = [];
      const exchangeNames = exchangeManager.getNames();

      if (exchangeNames.length < 2) {
        return {
          content: [
            {
              type: 'text',
              text: 'Arbitrage requires at least 2 exchanges configured. Currently have: ' +
                exchangeNames.length,
            },
          ],
          isError: true,
        };
      }

      // Check each symbol
      for (const symbol of checkSymbols) {
        const normalizedSymbol = symbol.toUpperCase();
        const prices: Array<{ exchange: string; bid: number; ask: number }> = [];

        // Fetch prices from all exchanges
        for (const [name, ex] of exchangeManager.getAll()) {
          try {
            const ticker = await ex.fetchTicker(normalizedSymbol);

            if (ticker.bid && ticker.ask && ticker.bid > 0 && ticker.ask > 0) {
              prices.push({
                exchange: name,
                bid: ticker.bid,
                ask: ticker.ask,
              });
            }
          } catch {
            // Symbol might not exist on this exchange
            continue;
          }
        }

        // Need at least 2 exchanges with this pair
        if (prices.length < 2) continue;

        // Find best buy (lowest ask) and best sell (highest bid)
        const bestBuy = prices.reduce((a, b) => (a.ask < b.ask ? a : b));
        const bestSell = prices.reduce((a, b) => (a.bid > b.bid ? a : b));

        // Check if arbitrage exists (can buy for less than sell price)
        if (bestSell.bid > bestBuy.ask) {
          const spread = bestSell.bid - bestBuy.ask;
          const spreadPercent = (spread / bestBuy.ask) * 100;

          // Only report if spread meets minimum threshold
          if (spreadPercent >= minSpread) {
            opportunities.push({
              symbol: normalizedSymbol,
              buyExchange: bestBuy.exchange,
              buyPrice: bestBuy.ask,
              sellExchange: bestSell.exchange,
              sellPrice: bestSell.bid,
              spreadPercent: parseFloat(spreadPercent.toFixed(3)),
              potentialProfit: parseFloat(spread.toFixed(8)),
            });
          }
        }
      }

      // Sort by spread percentage (best opportunities first)
      opportunities.sort((a, b) => b.spreadPercent - a.spreadPercent);

      const result: ArbitrageResult = {
        found: opportunities.length,
        opportunities,
        note:
          'Spreads shown BEFORE trading fees. Always account for:\n' +
          '• Trading fees on both exchanges (typically 0.1-0.2% each)\n' +
          '• Transfer fees if moving funds between exchanges\n' +
          '• Slippage on larger orders\n' +
          '• Price movement during execution',
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

  // Quick spread check for a single pair
  server.tool(
    'check_spread',
    'Check the price spread for a single trading pair across all exchanges.',
    {
      symbol: z.string().describe('Trading pair to check (e.g., "BTC/USDT")'),
    },
    async ({ symbol }): Promise<ToolResponse> => {
      const normalizedSymbol = symbol.toUpperCase();
      const prices: Array<{
        exchange: string;
        bid: number;
        ask: number;
        spread: number;
        spreadPercent: number;
      }> = [];

      for (const [name, ex] of exchangeManager.getAll()) {
        try {
          const ticker = await ex.fetchTicker(normalizedSymbol);

          if (ticker.bid && ticker.ask) {
            const spread = ticker.ask - ticker.bid;
            const spreadPercent = (spread / ticker.bid) * 100;

            prices.push({
              exchange: name,
              bid: ticker.bid,
              ask: ticker.ask,
              spread: parseFloat(spread.toFixed(8)),
              spreadPercent: parseFloat(spreadPercent.toFixed(3)),
            });
          }
        } catch {
          continue;
        }
      }

      if (prices.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No prices found for ${normalizedSymbol} on any exchange.`,
            },
          ],
          isError: true,
        };
      }

      // Sort by ask price (best buy price first)
      prices.sort((a, b) => a.ask - b.ask);

      // Calculate cross-exchange arbitrage if possible
      let arbitrage = null;
      if (prices.length >= 2) {
        const bestBuy = prices[0]!; // Lowest ask
        const bestSell = prices.reduce((a, b) => (a.bid > b.bid ? a : b)); // Highest bid

        if (bestSell.bid > bestBuy.ask && bestSell.exchange !== bestBuy.exchange) {
          const profit = bestSell.bid - bestBuy.ask;
          const profitPercent = (profit / bestBuy.ask) * 100;

          arbitrage = {
            exists: true,
            buyOn: bestBuy.exchange,
            buyAt: bestBuy.ask,
            sellOn: bestSell.exchange,
            sellAt: bestSell.bid,
            profit: parseFloat(profit.toFixed(8)),
            profitPercent: parseFloat(profitPercent.toFixed(3)) + '%',
          };
        } else {
          arbitrage = {
            exists: false,
            reason: 'Best bid is not higher than best ask across exchanges',
          };
        }
      }

      const result = {
        symbol: normalizedSymbol,
        exchanges: prices.length,
        prices,
        arbitrage,
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

  // Execute arbitrage trade
  server.tool(
    'execute_arbitrage',
    'Execute an arbitrage trade: buy on one exchange and sell on another. Shows expected profit after fees. USE WITH CAUTION!',
    {
      symbol: z.string().describe('Trading pair (e.g., "BTC/USDT")'),
      amount: z.number().positive().describe('Amount of base currency to trade'),
      buyExchange: z.string().describe('Exchange to buy from (lower price)'),
      sellExchange: z.string().describe('Exchange to sell on (higher price)'),
      preview: z
        .boolean()
        .default(true)
        .describe('Preview only (default: true). Set to false to execute.'),
    },
    async ({ symbol, amount, buyExchange, sellExchange, preview }): Promise<ToolResponse> => {
      const normalizedSymbol = symbol.toUpperCase();

      // Get exchanges
      const buyEx = exchangeManager.get(buyExchange);
      const sellEx = exchangeManager.get(sellExchange);

      if (!buyEx) {
        return {
          content: [
            {
              type: 'text',
              text: `Buy exchange not configured: ${buyExchange}`,
            },
          ],
          isError: true,
        };
      }

      if (!sellEx) {
        return {
          content: [
            {
              type: 'text',
              text: `Sell exchange not configured: ${sellExchange}`,
            },
          ],
          isError: true,
        };
      }

      try {
        // Fetch current prices
        const buyTicker = await buyEx.fetchTicker(normalizedSymbol);
        const sellTicker = await sellEx.fetchTicker(normalizedSymbol);

        const buyPrice = buyTicker.ask ?? 0;
        const sellPrice = sellTicker.bid ?? 0;

        if (buyPrice <= 0 || sellPrice <= 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'Invalid prices fetched. Cannot proceed.',
              },
            ],
            isError: true,
          };
        }

        // Calculate costs and profit
        const buyCost = amount * buyPrice;
        const sellRevenue = amount * sellPrice;
        const grossProfit = sellRevenue - buyCost;
        const grossProfitPercent = (grossProfit / buyCost) * 100;

        // Estimate fees (assume 0.1% per trade, typical for makers)
        const buyFee = buyCost * 0.001;
        const sellFee = sellRevenue * 0.001;
        const totalFees = buyFee + sellFee;
        const netProfit = grossProfit - totalFees;
        const netProfitPercent = (netProfit / buyCost) * 100;

        // Check if profitable
        if (netProfit <= 0) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    warning: '⚠️ This arbitrage is NOT profitable after fees',
                    details: {
                      symbol: normalizedSymbol,
                      amount,
                      buyExchange,
                      buyPrice: buyPrice.toFixed(8),
                      buyCost: buyCost.toFixed(2),
                      sellExchange,
                      sellPrice: sellPrice.toFixed(8),
                      sellRevenue: sellRevenue.toFixed(2),
                      grossProfit: grossProfit.toFixed(2),
                      estimatedFees: totalFees.toFixed(2),
                      netProfit: netProfit.toFixed(2),
                      netProfitPercent: netProfitPercent.toFixed(3) + '%',
                    },
                    note: 'Fees make this trade unprofitable. Consider a different opportunity.',
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        // Preview mode
        if (preview) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    message: '📊 Arbitrage Preview',
                    note: 'Set preview=false to execute this trade (USE WITH CAUTION!)',
                    plan: {
                      symbol: normalizedSymbol,
                      amount,
                      step1: {
                        action: 'BUY',
                        exchange: buyExchange,
                        price: buyPrice.toFixed(8),
                        cost: `$${buyCost.toFixed(2)}`,
                        estimatedFee: `$${buyFee.toFixed(2)}`,
                      },
                      step2: {
                        action: 'SELL',
                        exchange: sellExchange,
                        price: sellPrice.toFixed(8),
                        revenue: `$${sellRevenue.toFixed(2)}`,
                        estimatedFee: `$${sellFee.toFixed(2)}`,
                      },
                      profit: {
                        gross: `$${grossProfit.toFixed(2)} (${grossProfitPercent.toFixed(3)}%)`,
                        fees: `$${totalFees.toFixed(2)}`,
                        net: `$${netProfit.toFixed(2)} (${netProfitPercent.toFixed(3)}%)`,
                      },
                    },
                    warnings: [
                      'Fees are estimated (0.1% per trade). Actual fees may vary.',
                      'Prices may change between preview and execution.',
                      'Large orders may experience slippage.',
                      'Ensure sufficient balance on both exchanges.',
                    ],
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        // Execute mode
        if (config?.security?.confirmTrades !== false) {
          return {
            content: [
              {
                type: 'text',
                text: 'Auto-execution requires security.confirmTrades to be false in config. For safety, execute mode is blocked by default.',
              },
            ],
            isError: true,
          };
        }

        // Execute buy order
        let buyOrder;
        try {
          buyOrder = await buyEx.createMarketBuyOrder(normalizedSymbol, amount);
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Buy order failed on ${buyExchange}: ${(error as Error).message}`,
              },
            ],
            isError: true,
          };
        }

        // Execute sell order
        let sellOrder;
        try {
          sellOrder = await sellEx.createMarketSellOrder(normalizedSymbol, amount);
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error: `Sell order failed on ${sellExchange}: ${(error as Error).message}`,
                    warning:
                      '⚠️ BUY ORDER WAS EXECUTED! You now hold the asset on the buy exchange.',
                    buyOrder: {
                      exchange: buyExchange,
                      orderId: buyOrder.id,
                      status: buyOrder.status,
                    },
                    action: 'Manually sell the asset or retry the sell order.',
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        // Both orders successful
        const result = {
          message: '✅ Arbitrage executed successfully!',
          executed: {
            symbol: normalizedSymbol,
            amount,
            buyOrder: {
              exchange: buyExchange,
              orderId: buyOrder.id,
              status: buyOrder.status,
              cost: buyOrder.cost ?? buyCost,
            },
            sellOrder: {
              exchange: sellExchange,
              orderId: sellOrder.id,
              status: sellOrder.status,
              revenue: sellOrder.cost ?? sellRevenue,
            },
            estimatedProfit: {
              net: `$${netProfit.toFixed(2)}`,
              netPercent: `${netProfitPercent.toFixed(3)}%`,
            },
          },
          note: 'Check order status with get_orders to confirm execution and actual profit.',
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
              text: `Arbitrage execution failed: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
