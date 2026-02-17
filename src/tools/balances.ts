import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ExchangeManager } from '../exchanges/manager.js';
import type { Balance, BalanceError, ToolResponse } from '../types/index.js';

/**
 * Register balance-related MCP tools
 */
export function registerBalanceTools(
  server: McpServer,
  exchangeManager: ExchangeManager
): void {
  // Get balances across exchanges
  server.tool(
    'get_balances',
    'Get portfolio balances across all connected exchanges. Returns asset holdings with free (available) and locked (in orders) amounts.',
    {
      exchange: z
        .string()
        .optional()
        .describe('Specific exchange name (e.g., "binance"). Omit to query all exchanges.'),
      asset: z
        .string()
        .optional()
        .describe('Filter by specific asset (e.g., "BTC", "ETH"). Omit for all assets.'),
      hideZero: z
        .boolean()
        .default(true)
        .describe('Hide assets with zero balance (default: true)'),
    },
    async ({ exchange, asset, hideZero }): Promise<ToolResponse> => {
      const balances: (Balance | BalanceError)[] = [];

      // Determine which exchanges to query
      const exchangesToQuery = exchange
        ? [[exchange.toLowerCase(), exchangeManager.get(exchange)] as const].filter(
            ([, ex]) => ex !== undefined
          )
        : Array.from(exchangeManager.getAll().entries());

      if (exchangesToQuery.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: exchange
                ? `Exchange not configured: ${exchange}. Available: ${exchangeManager.getNames().join(', ')}`
                : 'No exchanges configured.',
            },
          ],
          isError: true,
        };
      }

      // Query each exchange
      for (const [name, ex] of exchangesToQuery) {
        if (!ex) continue;

        try {
          const balance = await ex.fetchBalance();

          // Process each asset
          for (const [symbol, total] of Object.entries(balance.total)) {
            const totalAmount = total as number;

            // Skip zero balances if requested
            if (hideZero && totalAmount === 0) continue;

            // Filter by asset if specified
            if (asset && symbol.toUpperCase() !== asset.toUpperCase()) continue;

            const free = (balance.free[symbol] as number) || 0;
            const locked = (balance.used[symbol] as number) || 0;

            balances.push({
              exchange: name,
              asset: symbol,
              free,
              locked,
              total: totalAmount,
            });
          }
        } catch (error) {
          // Include error info rather than failing entirely
          balances.push({
            exchange: name,
            asset: 'ERROR',
            free: 0,
            locked: 0,
            total: 0,
            error: (error as Error).message,
          });
        }
      }

      // Sort by total value descending
      balances.sort((a, b) => b.total - a.total);

      // Format response
      const summary = {
        exchanges: exchangeManager.getNames().length,
        assetsFound: balances.filter((b) => !('error' in b)).length,
        balances,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(summary, null, 2),
          },
        ],
      };
    }
  );

  // Get portfolio summary with USD values
  server.tool(
    'get_portfolio',
    'Get a unified portfolio summary with USD values. Shows total portfolio worth and individual holdings.',
    {
      minValue: z
        .number()
        .default(1)
        .describe('Minimum USD value to display (default: $1). Set to 0 to show all.'),
      showAll: z
        .boolean()
        .default(false)
        .describe('Show all assets including dust (overrides minValue)'),
    },
    async ({ minValue, showAll }): Promise<ToolResponse> => {
      const assetTotals: Record<string, { total: number; byExchange: Record<string, number> }> = {};
      const errors: string[] = [];

      // Step 1: Collect all balances
      for (const [name, ex] of exchangeManager.getAll()) {
        try {
          const balance = await ex.fetchBalance();

          for (const [symbol, total] of Object.entries(balance.total)) {
            const amount = total as number;
            if (amount === 0) continue;

            if (!assetTotals[symbol]) {
              assetTotals[symbol] = { total: 0, byExchange: {} };
            }

            assetTotals[symbol]!.total += amount;
            assetTotals[symbol]!.byExchange[name] = amount;
          }
        } catch (error) {
          errors.push(`${name}: ${(error as Error).message}`);
        }
      }

      // Step 2: Fetch USD prices (only for major coins to avoid timeout)
      const priceCache: Record<string, number> = {};
      const stablecoins = ['USDT', 'USDC', 'BUSD', 'DAI', 'USD', 'TUSD', 'USDP', 'FDUSD'];
      const majorCoins = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'DOT', 'MATIC', 'LINK', 
                         'AVAX', 'ATOM', 'UNI', 'LTC', 'NEAR', 'APT', 'ARB', 'OP', 'FIL', 'INJ'];
      
      // Get first available exchange for price queries
      const priceExchange = exchangeManager.getAll().values().next().value;
      
      // Only fetch prices if we have <= 50 assets, otherwise only major coins
      const assetList = Object.keys(assetTotals);
      const assetsToPrice = assetList.length > 50 
        ? assetList.filter(s => majorCoins.includes(s.toUpperCase()) || stablecoins.includes(s.toUpperCase()))
        : assetList;
      
      if (priceExchange) {
        for (const symbol of assetsToPrice) {
          // Stablecoins are worth $1
          if (stablecoins.includes(symbol.toUpperCase())) {
            priceCache[symbol] = 1;
            continue;
          }

          // Try to fetch price against USDT (with timeout)
          try {
            const ticker = await Promise.race([
              priceExchange.fetchTicker(`${symbol}/USDT`),
              new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
            ]) as { last?: number };
            if (ticker.last) {
              priceCache[symbol] = ticker.last;
            }
          } catch {
            // Skip - no price available
            priceCache[symbol] = 0;
          }
        }
      }

      // Step 3: Calculate USD values and build response
      const assets = Object.entries(assetTotals)
        .map(([asset, data]) => {
          const price = priceCache[asset] ?? 0;
          const usdValue = data.total * price;
          return {
            asset,
            quantity: data.total,
            price: price,
            usdValue: parseFloat(usdValue.toFixed(2)),
            distribution: data.byExchange,
          };
        })
        .filter((a) => showAll || a.usdValue >= minValue)
        .sort((a, b) => b.usdValue - a.usdValue);

      // Calculate totals
      const totalUsdValue = assets.reduce((sum, a) => sum + a.usdValue, 0);
      const hiddenCount = Object.keys(assetTotals).length - assets.length;

      const portfolio = {
        summary: {
          totalValue: `$${totalUsdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          totalAssets: assets.length,
          hiddenAssets: hiddenCount > 0 ? `${hiddenCount} assets below $${minValue}` : undefined,
          exchanges: exchangeManager.getNames(),
        },
        holdings: assets.map((a) => ({
          asset: a.asset,
          quantity: a.quantity,
          price: a.price > 0 ? `$${a.price.toLocaleString('en-US')}` : 'N/A',
          value: `$${a.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          percent: totalUsdValue > 0 ? `${((a.usdValue / totalUsdValue) * 100).toFixed(1)}%` : '0%',
        })),
        errors: errors.length > 0 ? errors : undefined,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(portfolio, null, 2),
          },
        ],
      };
    }
  );
}
