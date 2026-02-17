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

const VERSION = '0.7.4';

/**
 * Display startup banner
 */
function showBanner(): void {
  console.error(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ██████╗ ███╗   ███╗███╗   ██╗██╗████████╗██████╗  █████╗   ║
║  ██╔═══██╗████╗ ████║████╗  ██║██║╚══██╔══╝██╔══██╗██╔══██╗  ║
║  ██║   ██║██╔████╔██║██╔██╗ ██║██║   ██║   ██████╔╝███████║  ║
║  ██║   ██║██║╚██╔╝██║██║╚██╗██║██║   ██║   ██╔══██╗██╔══██║  ║
║  ╚██████╔╝██║ ╚═╝ ██║██║ ╚████║██║   ██║   ██║  ██║██║  ██║  ║
║   ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝  ║
║                                                               ║
║   MCP Server v${VERSION}                                          ║
║   One AI. 107 Exchanges. Natural language trading.           ║
║                                                               ║
║   by Connectry Labs • https://connectry.io                    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
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
  registerArbitrageTools(server, exchangeManager);

  console.error('✓ Tools registered: get_balances, get_portfolio, get_prices, compare_prices, place_order, get_orders, cancel_order, get_arbitrage, check_spread');

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
