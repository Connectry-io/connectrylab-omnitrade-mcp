import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ExchangeManager } from '../exchanges/manager.js';
import type { Config } from '../types/index.js';
import type { ToolResponse } from '../types/index.js';

interface AssetAllocation {
  asset: string;
  targetPercent: number;
  currentAmount: number;
  currentValueUSD: number;
  currentPercent: number;
  targetValueUSD: number;
  difference: number;
  action: 'buy' | 'sell' | 'hold';
  tradeAmount: number;
}

interface RebalancePlan {
  exchange: string;
  currentTotalUSD: number;
  targetAllocations: AssetAllocation[];
  trades: Array<{
    symbol: string;
    side: 'buy' | 'sell';
    amount: number;
    estimatedCost: number;
  }>;
  summary: {
    totalBuyValue: number;
    totalSellValue: number;
    assetsToRebalance: number;
  };
}

/**
 * Get current portfolio value and prices for an exchange
 */
async function getPortfolioData(
  exchange: any,
  exchangeName: string
): Promise<{
  balances: Record<string, number>;
  prices: Record<string, number>;
  totalUSD: number;
}> {
  const balance = await exchange.fetchBalance();
  const balances: Record<string, number> = {};
  const prices: Record<string, number> = {};
  let totalUSD = 0;

  // Get balances
  for (const [asset, assetBalance] of Object.entries(balance)) {
    if (asset === 'free' || asset === 'used' || asset === 'total') continue;

    const total = (assetBalance as { total?: number }).total ?? 0;
    if (total <= 0) continue;

    balances[asset] = total;

    // Get USD price
    let usdPrice = 0;
    const pairs = [`${asset}/USDT`, `${asset}/USD`, `${asset}/BUSD`];

    for (const pair of pairs) {
      try {
        const ticker = await exchange.fetchTicker(pair);
        usdPrice = ticker.last ?? 0;
        if (usdPrice > 0) break;
      } catch {
        continue;
      }
    }

    // Stablecoins are 1:1 with USD
    if (usdPrice === 0 && ['USDT', 'USD', 'USDC', 'BUSD', 'DAI'].includes(asset)) {
      usdPrice = 1;
    }

    if (usdPrice > 0) {
      prices[asset] = usdPrice;
      totalUSD += total * usdPrice;
    }
  }

  return { balances, prices, totalUSD };
}

/**
 * Create rebalance plan
 */
function createRebalancePlan(
  exchangeName: string,
  targetPercentages: Record<string, number>,
  balances: Record<string, number>,
  prices: Record<string, number>,
  totalUSD: number
): RebalancePlan {
  const allocations: AssetAllocation[] = [];
  const trades: RebalancePlan['trades'] = [];

  // Validate percentages sum to 100
  const totalPercent = Object.values(targetPercentages).reduce((a, b) => a + b, 0);
  if (Math.abs(totalPercent - 100) > 0.1) {
    throw new Error(`Target percentages must sum to 100% (got ${totalPercent.toFixed(2)}%)`);
  }

  // Calculate allocations
  for (const [asset, targetPercent] of Object.entries(targetPercentages)) {
    const currentAmount = balances[asset] ?? 0;
    const price = prices[asset];

    if (!price || price <= 0) {
      throw new Error(
        `Cannot get price for ${asset}. Ensure the asset is tradeable on ${exchangeName}.`
      );
    }

    const currentValueUSD = currentAmount * price;
    const currentPercent = totalUSD > 0 ? (currentValueUSD / totalUSD) * 100 : 0;
    const targetValueUSD = (totalUSD * targetPercent) / 100;
    const difference = targetValueUSD - currentValueUSD;

    // Determine action (with 1% threshold to avoid tiny trades)
    let action: AssetAllocation['action'] = 'hold';
    let tradeAmount = 0;

    if (Math.abs(difference) > totalUSD * 0.01) {
      // 1% threshold
      if (difference > 0) {
        action = 'buy';
        tradeAmount = difference / price;
      } else {
        action = 'sell';
        tradeAmount = Math.abs(difference) / price;
      }
    }

    allocations.push({
      asset,
      targetPercent,
      currentAmount,
      currentValueUSD,
      currentPercent,
      targetValueUSD,
      difference,
      action,
      tradeAmount,
    });

    // Add to trades list if action required
    if (action !== 'hold') {
      // Find trading pair (prefer USDT)
      const quoteCurrencies = ['USDT', 'USD', 'BUSD'];
      let tradingPair = '';

      for (const quote of quoteCurrencies) {
        if (prices[quote]) {
          tradingPair = `${asset}/${quote}`;
          break;
        }
      }

      if (!tradingPair) {
        tradingPair = `${asset}/USDT`; // Fallback
      }

      trades.push({
        symbol: tradingPair,
        side: action,
        amount: tradeAmount,
        estimatedCost: Math.abs(difference),
      });
    }
  }

  const totalBuyValue = trades
    .filter((t) => t.side === 'buy')
    .reduce((sum, t) => sum + t.estimatedCost, 0);

  const totalSellValue = trades
    .filter((t) => t.side === 'sell')
    .reduce((sum, t) => sum + t.estimatedCost, 0);

  return {
    exchange: exchangeName,
    currentTotalUSD: totalUSD,
    targetAllocations: allocations,
    trades,
    summary: {
      totalBuyValue,
      totalSellValue,
      assetsToRebalance: trades.length,
    },
  };
}

/**
 * Register rebalance MCP tools
 */
export function registerRebalanceTools(
  server: McpServer,
  exchangeManager: ExchangeManager,
  config: Config
): void {
  // Preview rebalance
  server.tool(
    'rebalance_portfolio',
    'Create a portfolio rebalancing plan based on target percentages. Example: "Rebalance to 50% BTC, 30% ETH, 20% SOL"',
    {
      allocations: z
        .record(z.string(), z.number().min(0).max(100))
        .describe(
          'Target allocation percentages. Example: {"BTC": 50, "ETH": 30, "SOL": 20}. Must sum to 100.'
        ),
      exchange: z
        .string()
        .optional()
        .describe('Exchange to rebalance on (default: first configured exchange)'),
      execute: z
        .boolean()
        .default(false)
        .describe(
          'Execute trades immediately (default: false, just show preview). USE WITH CAUTION!'
        ),
    },
    async ({ allocations, exchange, execute }): Promise<ToolResponse> => {
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

      try {
        // Get portfolio data
        const { balances, prices, totalUSD } = await getPortfolioData(
          selectedExchange,
          exchangeName
        );

        if (totalUSD <= 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No portfolio value found on ${exchangeName}. Cannot rebalance empty portfolio.`,
              },
            ],
            isError: true,
          };
        }

        // Create rebalance plan
        const plan = createRebalancePlan(
          exchangeName,
          allocations,
          balances,
          prices,
          totalUSD
        );

        // If execute mode, perform trades
        if (execute) {
          // Security check
          if (config.security?.confirmTrades !== false) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Auto-execution requires security.confirmTrades to be set to false in config. For safety, execute=true is blocked by default. Review the plan and execute trades manually using place_order.',
                },
              ],
              isError: true,
            };
          }

          const executedTrades = [];
          const failedTrades = [];

          for (const trade of plan.trades) {
            try {
              const order = await selectedExchange.createMarketOrder(
                trade.symbol,
                trade.side,
                trade.amount
              );

              executedTrades.push({
                symbol: trade.symbol,
                side: trade.side,
                amount: trade.amount,
                orderId: order.id,
                status: order.status,
              });
            } catch (error) {
              failedTrades.push({
                symbol: trade.symbol,
                side: trade.side,
                error: (error as Error).message,
              });
            }
          }

          const result = {
            message: '⚠️ Rebalance executed',
            exchange: exchangeName,
            executed: executedTrades.length,
            failed: failedTrades.length,
            executedTrades,
            failedTrades: failedTrades.length > 0 ? failedTrades : undefined,
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

        // Preview mode (default)
        const result = {
          message: '📊 Rebalance Plan (Preview)',
          note: 'This is a preview. Set execute=true to perform trades (USE WITH CAUTION!).',
          plan: {
            exchange: plan.exchange,
            currentPortfolioValueUSD: plan.currentTotalUSD.toFixed(2),
            targetAllocations: plan.targetAllocations.map((a) => ({
              asset: a.asset,
              current: `${a.currentPercent.toFixed(2)}% ($${a.currentValueUSD.toFixed(2)})`,
              target: `${a.targetPercent}% ($${a.targetValueUSD.toFixed(2)})`,
              action: a.action,
              tradeAmount: a.tradeAmount > 0 ? a.tradeAmount.toFixed(8) : undefined,
            })),
            trades: plan.trades.map((t) => ({
              symbol: t.symbol,
              side: t.side.toUpperCase(),
              amount: t.amount.toFixed(8),
              estimatedCost: `$${t.estimatedCost.toFixed(2)}`,
            })),
            summary: {
              totalBuyValue: `$${plan.summary.totalBuyValue.toFixed(2)}`,
              totalSellValue: `$${plan.summary.totalSellValue.toFixed(2)}`,
              assetsToRebalance: plan.summary.assetsToRebalance,
            },
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
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Rebalance failed: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
