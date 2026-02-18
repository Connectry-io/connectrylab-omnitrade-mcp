#!/usr/bin/env node
/**
 * OmniTrade MCP Server
 * 
 * Multi-exchange AI trading via Model Context Protocol.
 * Connects Claude to 107+ cryptocurrency exchanges through CCXT.
 * 
 * @author Connectry Labs
 * @license MIT
 * @see https://github.com/Connectry-io/omnitrade-mcp
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config/loader.js';
import { ExchangeManager } from './exchanges/manager.js';
import { registerBalanceTools } from './tools/balances.js';
import { registerPriceTools } from './tools/prices.js';
import { registerOrderTools } from './tools/orders.js';
import { registerArbitrageTools } from './tools/arbitrage.js';
import { registerAlertTools } from './tools/alerts.js';
import { registerChartTools } from './tools/charts.js';
import { registerPortfolioHistoryTools } from './tools/portfolio-history.js';
import { registerRebalanceTools } from './tools/rebalance.js';
import { registerDCATools } from './tools/dca.js';
import { registerConditionalOrderTools } from './tools/conditional-orders.js';
import { createRequire } from 'module';

const _require = createRequire(import.meta.url);
const _pkg = _require('../package.json') as { version: string };
const VERSION = _pkg.version;

/**
 * Display startup banner
 */
function showBanner(): void {
  const purple = '\x1b[35m';
  const reset = '\x1b[0m';
  console.error(`
  ${purple}██████╗ ${reset}███╗   ███╗███╗   ██╗██╗████████╗██████╗  █████╗ ██████╗ ███████╗
  ${purple}██╔══██╗${reset}████╗ ████║████╗  ██║██║╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗██╔════╝
  ${purple}██║  ██║${reset}██╔████╔██║██╔██╗ ██║██║   ██║   ██████╔╝███████║██║  ██║█████╗
  ${purple}██║  ██║${reset}██║╚██╔╝██║██║╚██╗██║██║   ██║   ██╔══██╗██╔══██║██║  ██║██╔══╝
  ${purple}██████╔╝${reset}██║ ╚═╝ ██║██║ ╚████║██║   ██║   ██║  ██║██║  ██║██████╔╝███████╗
  ${purple}╚═════╝ ${reset}╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚══════╝

  MCP Server v${VERSION}  •  One AI. 107 Exchanges. Natural language trading.
  by Connectry Labs  •  https://connectry.io
  ${'─'.repeat(75)}
`);
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  // Show banner
  showBanner();

  // Load configuration
  console.error('Loading configuration...');
  let config;
  try {
    config = loadConfig();
  } catch (error) {
    console.error(`\n❌ ${(error as Error).message}`);
    process.exit(1);
  }

  // Initialize exchange manager
  console.error('\nInitializing exchanges...');
  let exchangeManager;
  try {
    exchangeManager = new ExchangeManager(config);
  } catch (error) {
    console.error(`\n❌ ${(error as Error).message}`);
    process.exit(1);
  }

  // Create MCP server
  console.error('\nStarting MCP server...');
  const server = new McpServer({
    name: 'omnitrade-mcp',
    version: VERSION,
  });

  // Register all tools
  registerBalanceTools(server, exchangeManager);
  registerPriceTools(server, exchangeManager);
  registerOrderTools(server, exchangeManager, config);
  registerArbitrageTools(server, exchangeManager, config);
  registerAlertTools(server, exchangeManager);
  registerChartTools(server, exchangeManager);
  registerPortfolioHistoryTools(server, exchangeManager);
  registerRebalanceTools(server, exchangeManager, config);
  registerDCATools(server, exchangeManager, config);
  registerConditionalOrderTools(server, exchangeManager, config);

  console.error('✓ Core tools: get_balances, get_portfolio, get_prices, compare_prices, place_order, get_orders, cancel_order');
  console.error('✓ Advanced tools: get_arbitrage, execute_arbitrage, check_spread');
  console.error('✓ Alerts: set_price_alert, list_alerts, check_alerts, remove_alert, clear_triggered_alerts');
  console.error('✓ Charts: get_chart');
  console.error('✓ Portfolio: record_portfolio_snapshot, get_portfolio_history, clear_portfolio_history');
  console.error('✓ Rebalance: rebalance_portfolio');
  console.error('✓ DCA: setup_dca, list_dca_configs, execute_dca_orders, toggle_dca, remove_dca');
  console.error('✓ Conditional: set_conditional_order, list_conditional_orders, check_conditional_orders, remove_conditional_order');

  // Security reminders
  if (config.security?.testnetOnly) {
    console.error('\n🔒 TESTNET-ONLY MODE: All exchanges forced to testnet');
  }
  
  if (config.security?.maxOrderSize) {
    console.error(`🔒 Order size limit: $${config.security.maxOrderSize} max per trade`);
  }

  if (config.security?.allowedPairs?.length) {
    console.error(`🔒 Trading pairs whitelist: ${config.security.allowedPairs.join(', ')}`);
  }

  // Connect transport (stdio for MCP)
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('\n✅ OmniTrade MCP server is ready!');
  console.error('   Waiting for Claude to connect via MCP...\n');
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});

// Run
main().catch((error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
