#!/usr/bin/env node
/**
 * OmniTrade MCP CLI
 * Beautiful command-line interface with guided setup
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, openSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import * as readline from 'readline';
import { spawn } from 'child_process';
import {
  readPid,
  removePid,
  isProcessRunning,
  getDaemonUptime,
  formatUptime,
  PID_FILE,
} from './daemon/pid.js';

const VERSION = '0.9.4';
const CONFIG_PATH = join(homedir(), '.omnitrade', 'config.json');

// ============================================
// COLORS
// ============================================

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  
  white: '\x1b[97m',
  gray: '\x1b[90m',
  blue: '\x1b[38;5;39m',
  cyan: '\x1b[38;5;51m',
  green: '\x1b[38;5;46m',
  yellow: '\x1b[38;5;226m',
  purple: '\x1b[38;5;165m',
  orange: '\x1b[38;5;208m',
  red: '\x1b[38;5;196m',
};

// ============================================
// LOGO
// ============================================

// Box width: 58 characters inside (60 total with borders)
const W = 58;

function pad(text: string, width: number): string {
  const visibleLength = text.replace(/\x1b\[[0-9;]*m/g, '').length;
  const padding = width - visibleLength;
  return text + ' '.repeat(Math.max(0, padding));
}

function center(text: string, width: number): string {
  const visibleLength = text.replace(/\x1b\[[0-9;]*m/g, '').length;
  const totalPadding = width - visibleLength;
  const leftPad = Math.floor(totalPadding / 2);
  const rightPad = totalPadding - leftPad;
  return ' '.repeat(Math.max(0, leftPad)) + text + ' '.repeat(Math.max(0, rightPad));
}

function printLogo(): void {
  const line = '-'.repeat(W);
  console.log(`
${c.cyan}+${line}+${c.reset}
${c.cyan}|${c.reset}${' '.repeat(W)}${c.cyan}|${c.reset}
${c.cyan}|${c.reset}${center(`${c.cyan}o${c.gray}--${c.purple}o${c.reset}`, W)}${c.cyan}|${c.reset}
${c.cyan}|${c.reset}${' '.repeat(W)}${c.cyan}|${c.reset}
${c.cyan}|${c.reset}${center(`${c.white}${c.bold}O M N I T R A D E${c.reset}`, W)}${c.cyan}|${c.reset}
${c.cyan}|${c.reset}${center(`${c.gray}v${VERSION}${c.reset}`, W)}${c.cyan}|${c.reset}
${c.cyan}|${c.reset}${' '.repeat(W)}${c.cyan}|${c.reset}
${c.cyan}|${c.reset}${center(`${c.dim}Talk to your crypto with Claude${c.reset}`, W)}${c.cyan}|${c.reset}
${c.cyan}|${c.reset}${center(`${c.dim}107 exchanges  •  Natural language  •  Local & secure${c.reset}`, W)}${c.cyan}|${c.reset}
${c.cyan}|${c.reset}${' '.repeat(W)}${c.cyan}|${c.reset}
${c.cyan}|${c.reset}${center(`${c.cyan}Connectry${c.reset}`, W)}${c.cyan}|${c.reset}
${c.cyan}|${c.reset}${' '.repeat(W)}${c.cyan}|${c.reset}
${c.cyan}+${line}+${c.reset}
`);
}

function printBanner(): void {
  console.log(`
  ${c.purple}██████╗ ${c.reset}███╗   ███╗███╗   ██╗██╗████████╗██████╗  █████╗ ██████╗ ███████╗
  ${c.purple}██╔══██╗${c.reset}████╗ ████║████╗  ██║██║╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗██╔════╝
  ${c.purple}██║  ██║${c.reset}██╔████╔██║██╔██╗ ██║██║   ██║   ██████╔╝███████║██║  ██║█████╗
  ${c.purple}██║  ██║${c.reset}██║╚██╔╝██║██║╚██╗██║██║   ██║   ██╔══██╗██╔══██║██║  ██║██╔══╝
  ${c.purple}██████╔╝${c.reset}██║ ╚═╝ ██║██║ ╚████║██║   ██║   ██║  ██║██║  ██║██████╔╝███████╗
  ${c.purple}╚═════╝ ${c.reset}╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚══════╝

  ${c.gray}v${VERSION}  •  One AI. 107 Exchanges. Natural language trading.${c.reset}
  ${c.gray}by Connectry Labs  •  https://connectry.io${c.reset}
  ${c.gray}${'─'.repeat(75)}${c.reset}
`);
}

function printCompactLogo(): void {
  console.log(`
${c.cyan}o${c.gray}-${c.purple}o${c.reset} ${c.white}${c.bold}OmniTrade${c.reset} ${c.gray}v${VERSION}${c.reset} ${c.dim}• Connectry${c.reset}
`);
}

// ============================================
// EXCHANGE INFO
// ============================================

interface ExchangeInfo {
  name: string;
  description: string;
  apiUrl: string;
  testnetUrl?: string;
  docsUrl: string;
  supportsOAuth: boolean;
  needsPassphrase: boolean;
  steps: string[];
}

const EXCHANGE_INFO: Record<string, ExchangeInfo> = {
  binance: {
    name: 'Binance',
    description: 'Largest global exchange by volume',
    apiUrl: 'https://www.binance.com/en/my/settings/api-management',
    testnetUrl: 'https://testnet.binance.vision',
    docsUrl: 'https://www.binance.com/en/support/faq/how-to-create-api-keys-360002502072',
    supportsOAuth: false,
    needsPassphrase: false,
    steps: [
      'Log into Binance and go to API Management',
      'Click "Create API" and choose "System generated"',
      'Complete 2FA verification',
      'Enable permissions: ✓ Read  ✓ Spot Trading  ✗ Withdrawals',
      'Copy your API Key and Secret Key',
    ],
  },
  coinbase: {
    name: 'Coinbase',
    description: 'US-based, beginner friendly',
    apiUrl: 'https://www.coinbase.com/settings/api',
    docsUrl: 'https://docs.cdp.coinbase.com/exchange/docs/authorization-and-authentication',
    supportsOAuth: true,
    needsPassphrase: true,
    steps: [
      'Go to Coinbase Settings → API',
      'Click "New API Key"',
      'Select permissions: ✓ View  ✓ Trade  ✗ Transfer',
      'Complete 2FA verification',
      'Copy API Key, Secret, and Passphrase',
    ],
  },
  kraken: {
    name: 'Kraken',
    description: 'Security-focused, great for privacy',
    apiUrl: 'https://www.kraken.com/u/security/api',
    docsUrl: 'https://support.kraken.com/hc/en-us/articles/360000919966',
    supportsOAuth: false,
    needsPassphrase: false,
    steps: [
      'Go to Security → API',
      'Click "Add key"',
      'Name your key (e.g., "OmniTrade")',
      'Enable: ✓ Query Funds  ✓ Query Orders  ✓ Create Orders',
      'Generate and copy your keys',
    ],
  },
  bybit: {
    name: 'Bybit',
    description: 'Derivatives and spot trading',
    apiUrl: 'https://www.bybit.com/app/user/api-management',
    testnetUrl: 'https://testnet.bybit.com',
    docsUrl: 'https://www.bybit.com/en-US/help-center/article/How-to-create-your-API-key',
    supportsOAuth: false,
    needsPassphrase: false,
    steps: [
      'Go to Account → API Management',
      'Click "Create New Key"',
      'Choose "System-generated API Keys"',
      'Set permissions: ✓ Read  ✓ Trade  ✗ Withdraw',
      'Complete verification and copy keys',
    ],
  },
  okx: {
    name: 'OKX',
    description: 'Full-featured trading platform',
    apiUrl: 'https://www.okx.com/account/my-api',
    docsUrl: 'https://www.okx.com/help-center/how-to-create-your-api-key',
    supportsOAuth: false,
    needsPassphrase: true,
    steps: [
      'Go to Profile → API',
      'Click "Create API key"',
      'Set a passphrase (you\'ll need this later)',
      'Permissions: ✓ Read  ✓ Trade  ✗ Withdraw',
      'Copy API Key, Secret, and Passphrase',
    ],
  },
  kucoin: {
    name: 'KuCoin',
    description: 'Great altcoin variety',
    apiUrl: 'https://www.kucoin.com/account/api',
    docsUrl: 'https://www.kucoin.com/support/360015102174',
    supportsOAuth: false,
    needsPassphrase: true,
    steps: [
      'Go to Account Security → API Management',
      'Click "Create API"',
      'Set a passphrase (required for API calls)',
      'Permissions: ✓ General  ✓ Trade  ✗ Transfer',
      'Copy API Key, Secret, and Passphrase',
    ],
  },
  gate: {
    name: 'Gate.io',
    description: 'Wide selection of altcoins',
    apiUrl: 'https://www.gate.io/myaccount/api_key_manage',
    docsUrl: 'https://www.gate.io/help/api/general/17337',
    supportsOAuth: false,
    needsPassphrase: false,
    steps: [
      'Go to My Account → API Management',
      'Click "Create API Key"',
      'Permissions: ✓ Spot Trade  ✓ Read  ✗ Withdraw',
      'Copy API Key and Secret',
    ],
  },
  bitget: {
    name: 'Bitget',
    description: 'Copy trading platform',
    apiUrl: 'https://www.bitget.com/account/api',
    docsUrl: 'https://www.bitget.com/academy/api-trading-guide',
    supportsOAuth: false,
    needsPassphrase: true,
    steps: [
      'Go to Account → API Management',
      'Click "Create API"',
      'Set a passphrase',
      'Permissions: ✓ Read  ✓ Trade  ✗ Transfer',
      'Copy API Key, Secret, and Passphrase',
    ],
  },
  htx: {
    name: 'HTX (Huobi)',
    description: 'Major Asian exchange',
    apiUrl: 'https://www.htx.com/en-us/apikey/',
    docsUrl: 'https://www.htx.com/support/en-us/detail/900000203206',
    supportsOAuth: false,
    needsPassphrase: false,
    steps: [
      'Go to API Management',
      'Click "Create API Key"',
      'Permissions: ✓ Read  ✓ Trade  ✗ Withdraw',
      'Copy API Key and Secret',
    ],
  },
  mexc: {
    name: 'MEXC',
    description: 'High liquidity, many pairs',
    apiUrl: 'https://www.mexc.com/user/openapi',
    docsUrl: 'https://www.mexc.com/support/articles/360030903032',
    supportsOAuth: false,
    needsPassphrase: false,
    steps: [
      'Go to API Management',
      'Click "Create API"',
      'Permissions: ✓ Read  ✓ Trade  ✗ Withdraw',
      'Copy API Key and Secret',
    ],
  },
  cryptocom: {
    name: 'Crypto.com',
    description: 'Popular mobile-first exchange',
    apiUrl: 'https://crypto.com/exchange/user/settings/api-management',
    docsUrl: 'https://help.crypto.com/en/articles/3511424',
    supportsOAuth: false,
    needsPassphrase: false,
    steps: [
      'Go to Settings → API Management',
      'Click "Create New API Key"',
      'Permissions: ✓ Read  ✓ Trade  ✗ Withdraw',
      'Copy API Key and Secret',
    ],
  },
  gemini: {
    name: 'Gemini',
    description: 'US regulated, institutional',
    apiUrl: 'https://exchange.gemini.com/settings/api',
    docsUrl: 'https://support.gemini.com/hc/en-us/articles/360031080191',
    supportsOAuth: false,
    needsPassphrase: false,
    steps: [
      'Go to Settings → API',
      'Click "Create a New API Key"',
      'Scope: ✓ Trading  ✗ Fund Management',
      'Copy API Key and Secret',
    ],
  },
};

// ============================================
// HELP
// ============================================

function printHelp(): void {
  printBanner();
  
  console.log(`
  ${c.white}${c.bold}QUICK START${c.reset}
  ${c.gray}─────────────────────────────────────────────────────────${c.reset}

    ${c.yellow}$${c.reset} ${c.green}${c.bold}omnitrade setup${c.reset}     ${c.dim}← 2-minute guided wizard${c.reset}

  ${c.white}${c.bold}COMMANDS${c.reset}
  ${c.gray}─────────────────────────────────────────────────────────${c.reset}

    ${c.green}setup${c.reset}                Interactive setup wizard
    ${c.cyan}start${c.reset}                Launch MCP server for Claude Desktop

    ${c.purple}daemon start${c.reset}         Start background daemon (polls alerts)
    ${c.purple}daemon stop${c.reset}          Stop the daemon
    ${c.purple}daemon status${c.reset}        Check daemon status + uptime

    ${c.yellow}watch${c.reset} ${c.dim}BTC ETH SOL${c.reset}     Live price ticker in terminal
    ${c.yellow}dashboard${c.reset}            Full-screen TUI dashboard (Bloomberg Terminal)

    ${c.orange}paper buy BTC 0.01${c.reset}  Paper trade — buy 0.01 BTC at market price
    ${c.orange}paper sell ETH 0.5${c.reset}  Paper trade — sell 0.5 ETH
    ${c.orange}paper portfolio${c.reset}     Paper portfolio: holdings + P&L
    ${c.orange}paper history${c.reset}       Paper trade log

    ${c.cyan}test${c.reset}                 Verify your exchange connections work
    ${c.cyan}config${c.reset}               View saved API configuration
    ${c.cyan}exchanges${c.reset}            Browse all 107 supported exchanges
    ${c.cyan}help${c.reset}                 Show this help

  ${c.white}${c.bold}WHAT YOU CAN DO${c.reset} ${c.dim}(once connected)${c.reset}
  ${c.gray}─────────────────────────────────────────────────────────${c.reset}

    ${c.cyan}Portfolio${c.reset}    "What's my portfolio worth in USD?"
                 "Show all my holdings across exchanges"
                 "What % of my portfolio is in ETH?"

    ${c.cyan}Prices${c.reset}       "What's the current BTC price?"
                 "Compare ETH prices across all my exchanges"
                 "Alert me when SOL drops below $100"

    ${c.cyan}Trading${c.reset}      "Buy 0.1 ETH at market price"
                 "Place a limit order for BTC at $40,000"
                 "What are my open orders?"

    ${c.cyan}Analysis${c.reset}     "Find arbitrage opportunities for BTC"
                 "Which exchange has the lowest fees?"
                 "Show my trade history for this week"

  ${c.white}${c.bold}SECURITY${c.reset}
  ${c.gray}─────────────────────────────────────────────────────────${c.reset}

    ${c.green}✓${c.reset} Keys stored locally at ${c.dim}~/.omnitrade/config.json${c.reset}
    ${c.green}✓${c.reset} Never transmitted anywhere — runs 100% on your machine
    ${c.green}✓${c.reset} We recommend: ${c.white}read + trade only${c.reset}, ${c.red}never withdrawals${c.reset}

  ${c.white}${c.bold}LINKS${c.reset}
  ${c.gray}─────────────────────────────────────────────────────────${c.reset}

    ${c.blue}Docs${c.reset}     github.com/Connectry-io/omnitrade-mcp
    ${c.blue}Claude${c.reset}   claude.ai/download
    ${c.blue}Support${c.reset}  discord.gg/connectry

`);
}

// ============================================
// GUIDED SETUP WIZARD
// ============================================

async function runSetupWizard(): Promise<void> {
  printBanner();
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  const question = (q: string): Promise<string> => 
    new Promise(resolve => rl.question(q, resolve));

  // Welcome
  console.log(`
  ${c.white}${c.bold}SETUP WIZARD${c.reset}
  ${c.gray}─────────────────────────────────────────────────────────${c.reset}

  Let's connect your exchanges to Claude.

  ${c.white}${c.bold}HOW IT WORKS${c.reset}

    ${c.cyan}1.${c.reset}  Select which exchanges you use
    ${c.cyan}2.${c.reset}  Create API keys on each ${c.dim}(read/trade only, never withdraw)${c.reset}
    ${c.cyan}3.${c.reset}  Enter your keys — stored locally on your machine
    ${c.cyan}4.${c.reset}  Chat naturally: ${c.dim}"What's my total portfolio worth?"${c.reset}

  ${c.orange}⚠${c.reset}  Your keys ${c.bold}never leave your computer${c.reset}. 100% local.

`);

  await question(`  ${c.dim}Press Enter to continue...${c.reset}`);
  
  // Choose Exchanges (multi-select)
  console.log(`
  ${c.white}${c.bold}STEP 1 — SELECT EXCHANGES${c.reset}
  ${c.gray}─────────────────────────────────────────────────────────${c.reset}

  ${c.dim}Enter numbers separated by commas (e.g., 1,3,5) or just one:${c.reset}
`);

  const exchangeKeys = Object.keys(EXCHANGE_INFO);
  exchangeKeys.forEach((key, i) => {
    const info = EXCHANGE_INFO[key]!;
    const num = `[${i + 1}]`.padEnd(5);
    console.log(`    ${c.cyan}${num}${c.reset}${info.name.padEnd(14)} ${c.dim}${info.description}${c.reset}`);
  });
  
  const otherNum = exchangeKeys.length + 1;
  const listNum = exchangeKeys.length + 2;
  console.log(`    ${c.cyan}[${otherNum}]${c.reset}  Other          ${c.dim}Enter name manually (any of 107 exchanges)${c.reset}`);
  console.log(`    ${c.cyan}[${listNum}]${c.reset}  List all       ${c.dim}See all 107 supported exchanges${c.reset}`);
  console.log('');

  const exchangeChoice = await question(`  ${c.yellow}?${c.reset} Select: `);
  
  // Handle "list all" option
  if (exchangeChoice.trim() === String(listNum)) {
    console.log(`
  ${c.white}${c.bold}ALL 107 SUPPORTED EXCHANGES${c.reset}
  ${c.gray}─────────────────────────────────────────────────────────${c.reset}

  OmniTrade uses ${c.cyan}CCXT${c.reset} (CryptoCurrency eXchange Trading Library),
  which supports ${c.white}107 exchanges${c.reset} including:

  ${c.cyan}Major:${c.reset}    binance, coinbase, kraken, bybit, okx, kucoin,
            gate, bitget, htx, mexc, cryptocom, gemini

  ${c.cyan}Popular:${c.reset}  bitstamp, bitfinex, poloniex, bittrex, upbit,
            bithumb, lbank, phemex, woo, ascendex

  ${c.cyan}Futures:${c.reset}  binanceusdm, binancecoinm, bybit, okx, deribit,
            bitmex, bitget, phemex, woo

  ${c.cyan}DEX:${c.reset}      uniswap, sushiswap ${c.dim}(limited support)${c.reset}

  ${c.dim}Full list: Run ${c.cyan}omnitrade exchanges${c.reset}${c.dim} or visit:${c.reset}
  ${c.blue}github.com/ccxt/ccxt/wiki/Exchange-Markets${c.reset}

  ${c.white}${c.bold}TO SET UP ANY EXCHANGE:${c.reset}

    1. Select ${c.cyan}[${otherNum}] Other${c.reset} and type the exchange name
    2. Go to that exchange's API settings
    3. Create API key with ${c.green}Read + Trade${c.reset} permissions
    4. Enter your API key and secret

`);
    await question(`  ${c.dim}Press Enter to go back to selection...${c.reset}`);
    rl.close();
    return runSetupWizard(); // Restart wizard
  }

  // Parse selections
  const selections = exchangeChoice.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
  const selectedExchanges: { id: string; info?: ExchangeInfo }[] = [];

  for (const num of selections) {
    if (num >= 1 && num <= exchangeKeys.length) {
      const id = exchangeKeys[num - 1]!;
      selectedExchanges.push({ id, info: EXCHANGE_INFO[id] });
    } else if (num === otherNum) {
      const name = await question(`  ${c.yellow}?${c.reset} Exchange name: `);
      selectedExchanges.push({ id: name.toLowerCase().trim() });
    }
  }

  if (selectedExchanges.length === 0) {
    console.log(`  ${c.red}No valid exchanges selected. Please try again.${c.reset}`);
    rl.close();
    return;
  }

  console.log(`
  ${c.green}✓${c.reset} Selected: ${selectedExchanges.map(e => e.info?.name || e.id).join(', ')}
`);

  // Collect keys for each exchange
  const config: Record<string, unknown> = {
    exchanges: {},
    security: {
      maxOrderSize: 100,
      confirmTrades: true,
    },
  };

  for (let i = 0; i < selectedExchanges.length; i++) {
    const { id: exchange, info: exchangeInfo } = selectedExchanges[i]!;
    const displayName = exchangeInfo?.name || exchange.toUpperCase();
    const stepNum = i + 2;
    const totalSteps = selectedExchanges.length + 2; // +1 for selection, +1 for Claude config
    
    // API Key Instructions
    console.log(`
  ${c.white}${c.bold}STEP ${stepNum}/${totalSteps} — ${displayName} API KEYS${c.reset}
  ${c.gray}─────────────────────────────────────────────────────────${c.reset}
`);

    if (exchangeInfo) {
      console.log(`  ${c.dim}Create API keys at:${c.reset} ${c.blue}${exchangeInfo.apiUrl}${c.reset}\n`);
      exchangeInfo.steps.forEach((step, j) => {
        console.log(`    ${c.cyan}${j + 1}.${c.reset} ${step}`);
      });
      console.log('');
      if (exchangeInfo.docsUrl) {
        console.log(`  ${c.dim}Need help?${c.reset} ${c.blue}${exchangeInfo.docsUrl}${c.reset}`);
      }
    } else {
      console.log(`  ${c.dim}Go to ${exchange}'s API settings and create a new API key.${c.reset}`);
      console.log(`  ${c.dim}Enable: ${c.green}✓ Read${c.reset}${c.dim}  ${c.green}✓ Trade${c.reset}${c.dim}  ${c.red}✗ Withdraw${c.reset}`);
    }

    console.log(`
  ${c.orange}╔══════════════════════════════════════════════════════╗${c.reset}
  ${c.orange}║${c.reset}  ${c.orange}⚠  SECURITY:${c.reset} Never enable withdrawal permissions   ${c.orange}║${c.reset}
  ${c.orange}╚══════════════════════════════════════════════════════╝${c.reset}
`);

    await question(`  ${c.dim}Press Enter when you have your keys...${c.reset}`);

    // Enter Keys
    console.log(`
  ${c.dim}Paste your ${displayName} credentials:${c.reset}
`);

    const apiKey = await question(`  ${c.cyan}API Key:${c.reset}    `);
    const secret = await question(`  ${c.cyan}Secret:${c.reset}     `);
    
    let password = '';
    const needsPassphrase = exchangeInfo?.needsPassphrase || ['coinbase', 'kucoin', 'okx', 'bitget'].includes(exchange);
    if (needsPassphrase) {
      password = await question(`  ${c.cyan}Passphrase:${c.reset} `);
    }
    
    // Testnet option
    let testnet = false;
    const hasTestnet = exchangeInfo?.testnetUrl || ['binance', 'bybit'].includes(exchange);
    if (hasTestnet) {
      const testnetAnswer = await question(`  ${c.yellow}?${c.reset} Use testnet? ${c.dim}(y/N)${c.reset}: `);
      testnet = testnetAnswer.toLowerCase() === 'y';
    }

    // Add to config (only if keys provided)
    if (apiKey.trim() && secret.trim()) {
      (config.exchanges as Record<string, unknown>)[exchange] = {
        apiKey: apiKey.trim(),
        secret: secret.trim(),
        ...(password.trim() ? { password: password.trim() } : {}),
        testnet,
      };
      console.log(`  ${c.green}✓${c.reset} ${displayName} configured!`);
    } else {
      console.log(`  ${c.yellow}⚠${c.reset} ${displayName} skipped (no keys provided)`);
    }
  }

  rl.close();

  // ── Notifications setup ────────────────────────────────────
  const rlNotif = readline.createInterface({ input: process.stdin, output: process.stdout });
  const questionNotif = (q: string): Promise<string> => new Promise(resolve => rlNotif.question(q, resolve));
  const notificationsConfig = await setupNotifications(questionNotif);
  rlNotif.close();

  // Load existing config and merge
  let existingConfig: Record<string, unknown> = {};
  if (existsSync(CONFIG_PATH)) {
    try {
      existingConfig = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
    } catch {}
  }
  
  // Merge exchanges and filter out any with empty keys
  const allExchanges = {
    ...((existingConfig.exchanges as Record<string, unknown>) || {}),
    ...((config.exchanges as Record<string, unknown>) || {}),
  };
  
  // Remove exchanges with empty apiKey or secret
  const validExchanges: Record<string, unknown> = {};
  for (const [name, cfg] of Object.entries(allExchanges)) {
    const exchCfg = cfg as { apiKey?: string; secret?: string };
    if (exchCfg.apiKey?.trim() && exchCfg.secret?.trim()) {
      validExchanges[name] = cfg;
    }
  }
  
  const mergedConfig: Record<string, unknown> = {
    ...existingConfig,
    ...config,
    exchanges: validExchanges,
  };

  // Merge notifications (only include if user configured something)
  if (Object.keys(notificationsConfig).length > 0) {
    mergedConfig.notifications = {
      ...((existingConfig.notifications as Record<string, unknown>) || {}),
      ...notificationsConfig,
    };
  }

  // Save config
  const configDir = join(homedir(), '.omnitrade');
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  writeFileSync(CONFIG_PATH, JSON.stringify(mergedConfig, null, 2));

  try {
    const { chmodSync } = await import('fs');
    chmodSync(CONFIG_PATH, 0o600);
  } catch {}

  const exchangeCount = Object.keys(mergedConfig.exchanges as Record<string, unknown>).length;

  // Claude Setup - Auto-configure
  const finalStepNum = selectedExchanges.length + 2;
  console.log(`
  ${c.green}${c.bold}✓ ${exchangeCount} EXCHANGE${exchangeCount > 1 ? 'S' : ''} CONFIGURED${c.reset}

  ${c.white}${c.bold}STEP ${finalStepNum}/${finalStepNum} — CONNECT TO CLAUDE${c.reset}
  ${c.gray}─────────────────────────────────────────────────────────${c.reset}
`);

  const rl2 = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  const question2 = (q: string): Promise<string> => 
    new Promise(resolve => rl2.question(q, resolve));

  // Detect Claude Desktop config path
  const platform = process.platform;
  let claudeConfigPath: string;
  
  if (platform === 'darwin') {
    claudeConfigPath = join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  } else if (platform === 'win32') {
    claudeConfigPath = join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json');
  } else {
    claudeConfigPath = join(homedir(), '.config', 'Claude', 'claude_desktop_config.json');
  }

  const configureAuto = await question2(`  ${c.yellow}?${c.reset} Auto-configure Claude Desktop? ${c.dim}(Y/n)${c.reset}: `);
  
  if (configureAuto.toLowerCase() !== 'n') {
    try {
      // Read existing config or create new
      let claudeConfig: Record<string, unknown> = {};
      const claudeConfigDir = join(claudeConfigPath, '..');
      
      if (existsSync(claudeConfigPath)) {
        claudeConfig = JSON.parse(readFileSync(claudeConfigPath, 'utf-8'));
        console.log(`  ${c.dim}Found existing config${c.reset}`);
      } else {
        if (!existsSync(claudeConfigDir)) {
          mkdirSync(claudeConfigDir, { recursive: true });
        }
        console.log(`  ${c.dim}Creating new config${c.reset}`);
      }

      // Merge MCP server config
      if (!claudeConfig.mcpServers) {
        claudeConfig.mcpServers = {};
      }
      (claudeConfig.mcpServers as Record<string, unknown>).omnitrade = {
        command: 'omnitrade',
        args: ['start'],
      };

      // Write config
      writeFileSync(claudeConfigPath, JSON.stringify(claudeConfig, null, 2));
      
      console.log(`
  ${c.green}${c.bold}✓ Claude Desktop configured!${c.reset}
  ${c.dim}${claudeConfigPath}${c.reset}
`);

      // Offer to restart Claude Desktop (macOS only for now)
      if (platform === 'darwin') {
        const restart = await question2(`  ${c.yellow}?${c.reset} Restart Claude Desktop now? ${c.dim}(Y/n)${c.reset}: `);
        
        if (restart.toLowerCase() !== 'n') {
          const { execSync } = await import('child_process');
          try {
            execSync('osascript -e \'quit app "Claude"\'', { stdio: 'ignore' });
            await new Promise(r => setTimeout(r, 1000));
            execSync('open -a "Claude"', { stdio: 'ignore' });
            console.log(`  ${c.green}✓ Claude Desktop restarted${c.reset}`);
          } catch {
            console.log(`  ${c.yellow}! Please restart Claude Desktop manually${c.reset}`);
          }
        }
      } else {
        console.log(`  ${c.yellow}!${c.reset} Please restart Claude Desktop to apply changes`);
      }

    } catch (error) {
      console.log(`  ${c.red}✗ Auto-config failed:${c.reset} ${(error as Error).message}`);
      console.log(`
  ${c.dim}Manual setup:${c.reset}
  1. Open: ${c.blue}${claudeConfigPath}${c.reset}
  2. Add omnitrade to mcpServers
  3. Restart Claude Desktop
`);
    }
  } else {
    // Manual instructions
    console.log(`
  ${c.cyan}1.${c.reset} Open Claude Desktop config:
     ${c.blue}${claudeConfigPath}${c.reset}

  ${c.cyan}2.${c.reset} Add this to mcpServers:
     ${c.gray}"omnitrade": { "command": "omnitrade", "args": ["start"] }${c.reset}

  ${c.cyan}3.${c.reset} Restart Claude Desktop
`);
  }

  // Also configure Claude Code (terminal)
  const claudeCodePath = join(homedir(), '.claude', 'settings.json');
  const configureCode = await question2(`  ${c.yellow}?${c.reset} Also configure Claude Code (terminal)? ${c.dim}(Y/n)${c.reset}: `);
  
  if (configureCode.toLowerCase() !== 'n') {
    try {
      let claudeCodeConfig: Record<string, unknown> = {};
      const claudeCodeDir = join(homedir(), '.claude');
      
      if (existsSync(claudeCodePath)) {
        claudeCodeConfig = JSON.parse(readFileSync(claudeCodePath, 'utf-8'));
      } else {
        if (!existsSync(claudeCodeDir)) {
          mkdirSync(claudeCodeDir, { recursive: true });
        }
      }

      if (!claudeCodeConfig.mcpServers) {
        claudeCodeConfig.mcpServers = {};
      }
      (claudeCodeConfig.mcpServers as Record<string, unknown>).omnitrade = {
        command: 'omnitrade',
        args: ['start'],
      };

      writeFileSync(claudeCodePath, JSON.stringify(claudeCodeConfig, null, 2));
      console.log(`  ${c.green}✓${c.reset} Claude Code configured! ${c.dim}${claudeCodePath}${c.reset}`);
    } catch (error) {
      console.log(`  ${c.yellow}!${c.reset} Could not configure Claude Code: ${(error as Error).message}`);
    }
  }

  rl2.close();

  const configuredExchanges = Object.keys(mergedConfig.exchanges as Record<string, unknown>);
  const firstExchange = configuredExchanges[0] || 'binance';
  
  console.log(`
  ${c.gray}─────────────────────────────────────────────────────────────${c.reset}

  ${c.white}${c.bold}TRY IT${c.reset}

    ${c.dim}"What's my portfolio worth?"${c.reset}
    ${c.dim}"Show my ${firstExchange} balance"${c.reset}
    ${c.dim}"Compare BTC prices across my exchanges"${c.reset}

  ${c.white}${c.bold}USEFUL COMMANDS${c.reset}

    ${c.cyan}omnitrade test${c.reset}      Test your connections
    ${c.cyan}omnitrade config${c.reset}    View configuration
    ${c.cyan}omnitrade setup${c.reset}     Add more exchanges

  ${c.green}${c.bold}✓ Setup complete!${c.reset}
  ${c.dim}Configured: ${configuredExchanges.join(', ')}${c.reset}

`);
}

// ============================================
// OTHER COMMANDS
// ============================================

async function showExchanges(): Promise<void> {
  printCompactLogo();
  
  const ccxt = await import('ccxt');
  const exchanges = ccxt.default.exchanges;
  
  console.log(`  ${c.white}${c.bold}SUPPORTED EXCHANGES${c.reset} ${c.dim}(${exchanges.length})${c.reset}\n`);
  
  const tier1 = ['binance', 'bybit', 'okx', 'gate', 'kucoin', 'bitget', 'htx', 'mexc', 'cryptocom', 'bitmex'];
  const tier2 = ['coinbase', 'kraken', 'bitstamp', 'gemini', 'bitfinex', 'poloniex', 'deribit', 'upbit', 'bithumb', 'bitvavo'];
  
  console.log(`  ${c.green}★ TIER 1${c.reset} ${c.dim}${tier1.join(', ')}${c.reset}`);
  console.log(`  ${c.yellow}★ TIER 2${c.reset} ${c.dim}${tier2.join(', ')}${c.reset}`);
  
  const others = exchanges.filter(e => !tier1.includes(e) && !tier2.includes(e));
  console.log(`  ${c.gray}+ ${others.length} more...${c.reset}\n`);
}

async function showConfig(): Promise<void> {
  printCompactLogo();
  
  if (!existsSync(CONFIG_PATH)) {
    console.log(`  ${c.red}✗ No configuration${c.reset}\n  Run ${c.cyan}omnitrade setup${c.reset}\n`);
    return;
  }
  
  try {
    const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
    console.log(`  ${c.green}✓ Config loaded${c.reset} ${c.dim}${CONFIG_PATH}${c.reset}\n`);
    
    for (const [ex, cfg] of Object.entries(config.exchanges || {})) {
      const mode = (cfg as any).testnet ? `${c.yellow}testnet${c.reset}` : `${c.green}live${c.reset}`;
      console.log(`  ${c.cyan}•${c.reset} ${ex} (${mode})`);
    }
    console.log('');
  } catch (error) {
    console.log(`  ${c.red}✗ Error:${c.reset} ${(error as Error).message}\n`);
  }
}

async function testConnections(): Promise<void> {
  printCompactLogo();
  
  if (!existsSync(CONFIG_PATH)) {
    console.log(`  ${c.red}✗ No configuration${c.reset}\n  Run ${c.cyan}omnitrade setup${c.reset}\n`);
    return;
  }
  
  console.log(`  ${c.white}${c.bold}TESTING${c.reset}\n`);
  
  const ccxt = await import('ccxt');
  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  
  for (const [name, cfg] of Object.entries(config.exchanges || {})) {
    process.stdout.write(`  ${c.cyan}${name}${c.reset} ... `);
    
    try {
      const ExchangeClass = (ccxt.default as any)[name];
      const ex = new ExchangeClass({
        apiKey: (cfg as any).apiKey,
        secret: (cfg as any).secret,
        password: (cfg as any).password,
        enableRateLimit: true,
      });
      
      if ((cfg as any).testnet) ex.setSandboxMode(true);
      
      const balance = await ex.fetchBalance();
      const assets = Object.entries(balance.total)
        .filter(([_, v]) => (v as number) > 0)
        .slice(0, 3)
        .map(([k, v]) => `${k}:${v}`)
        .join(' ');
      
      console.log(`${c.green}✓${c.reset} ${c.dim}${assets || 'connected'}${c.reset}`);
    } catch (error) {
      console.log(`${c.red}✗${c.reset} ${c.dim}${(error as Error).message.slice(0, 40)}${c.reset}`);
    }
  }
  console.log('');
}

// ============================================
// DAEMON COMMANDS
// ============================================

async function daemonStart(): Promise<void> {
  printCompactLogo();

  // Check if already running
  const existingPid = readPid();
  if (existingPid && isProcessRunning(existingPid)) {
    console.log(`  ${c.yellow}⚠${c.reset} Daemon already running (PID ${existingPid})`);
    console.log(`  ${c.dim}Run ${c.cyan}omnitrade daemon status${c.dim} for details${c.reset}\n`);
    return;
  }

  // Clean up stale PID file if present
  if (existingPid) {
    removePid();
  }

  // Check config exists
  if (!existsSync(CONFIG_PATH)) {
    console.log(`  ${c.red}✗ No configuration${c.reset}`);
    console.log(`  Run ${c.cyan}omnitrade setup${c.reset} first\n`);
    return;
  }

  const omnitradeDir = join(homedir(), '.omnitrade');
  if (!existsSync(omnitradeDir)) mkdirSync(omnitradeDir, { recursive: true });

  const logPath = join(omnitradeDir, 'daemon.log');
  const logFd = openSync(logPath, 'a');

  // Spawn daemon as detached child process
  const nodePath = process.execPath;
  const scriptPath = process.argv[1]!;

  const child = spawn(nodePath, [scriptPath, 'daemon', 'run'], {
    detached: true,
    stdio: ['ignore', logFd, logFd],
    env: process.env,
  });

  child.unref(); // Allow parent to exit without waiting

  // Wait briefly to confirm it started
  await new Promise<void>((resolve) => setTimeout(resolve, 800));

  const newPid = readPid();
  if (newPid && isProcessRunning(newPid)) {
    console.log(`  ${c.green}✓${c.reset} Daemon started (PID ${newPid})`);
    console.log(`  ${c.dim}Log: ${logPath}${c.reset}`);
    // Read poll interval from config (default: 60s)
    let pollIntervalDisplay = 60;
    try {
      const raw = readFileSync(CONFIG_PATH, 'utf-8');
      const cfg = JSON.parse(raw);
      if (typeof cfg?.daemon?.pollInterval === 'number') pollIntervalDisplay = cfg.daemon.pollInterval;
    } catch { /* fall back to 60s */ }
    console.log(`  ${c.dim}Polling alerts every ${pollIntervalDisplay}s${c.reset}\n`);
  } else {
    // Child may have written its own PID — check again
    const childPid = child.pid;
    if (childPid && isProcessRunning(childPid)) {
      console.log(`  ${c.green}✓${c.reset} Daemon started (PID ${childPid})`);
      console.log(`  ${c.dim}Log: ${logPath}${c.reset}\n`);
    } else {
      console.log(`  ${c.red}✗ Daemon may have failed to start${c.reset}`);
      console.log(`  ${c.dim}Check log: ${logPath}${c.reset}\n`);
    }
  }
}

async function daemonStop(): Promise<void> {
  printCompactLogo();

  const pid = readPid();
  if (!pid) {
    console.log(`  ${c.yellow}⚠${c.reset} Daemon is not running\n`);
    return;
  }

  if (!isProcessRunning(pid)) {
    console.log(`  ${c.yellow}⚠${c.reset} Daemon not running (stale PID ${pid} — cleaning up)`);
    removePid();
    console.log(`  ${c.green}✓${c.reset} PID file removed\n`);
    return;
  }

  // Send SIGTERM for graceful shutdown
  try {
    process.kill(pid, 'SIGTERM');
    console.log(`  ${c.green}✓${c.reset} Sent SIGTERM to PID ${pid}`);

    // Wait for process to exit
    let waited = 0;
    while (isProcessRunning(pid) && waited < 5000) {
      await new Promise<void>((resolve) => setTimeout(resolve, 200));
      waited += 200;
    }

    if (isProcessRunning(pid)) {
      // Force kill if still running
      process.kill(pid, 'SIGKILL');
      console.log(`  ${c.yellow}⚠${c.reset} Force-killed after 5s timeout`);
    } else {
      console.log(`  ${c.green}✓${c.reset} Daemon stopped cleanly`);
    }

    removePid();
  } catch (err) {
    console.log(`  ${c.red}✗${c.reset} Failed: ${(err as Error).message}`);
  }
  console.log('');
}

async function daemonStatus(): Promise<void> {
  printCompactLogo();

  const pid = readPid();

  if (!pid) {
    console.log(`  ${c.gray}●${c.reset} Daemon: ${c.red}stopped${c.reset}\n`);
    console.log(`  ${c.dim}Run ${c.cyan}omnitrade daemon start${c.dim} to begin${c.reset}\n`);
    return;
  }

  if (!isProcessRunning(pid)) {
    console.log(`  ${c.yellow}●${c.reset} Daemon: ${c.yellow}stopped${c.reset} ${c.dim}(stale PID ${pid})${c.reset}`);
    console.log(`  ${c.dim}Run ${c.cyan}omnitrade daemon start${c.dim} to restart${c.reset}\n`);
    removePid();
    return;
  }

  const uptime = getDaemonUptime();
  const uptimeStr = uptime !== null ? formatUptime(uptime) : 'unknown';

  console.log(`  ${c.green}●${c.reset} Daemon: ${c.green}running${c.reset}`);
  console.log(`  ${c.dim}PID:    ${pid}${c.reset}`);
  console.log(`  ${c.dim}Uptime: ${uptimeStr}${c.reset}`);

  // Show log tail
  const logPath = join(homedir(), '.omnitrade', 'daemon.log');
  if (existsSync(logPath)) {
    const log = readFileSync(logPath, 'utf-8').trim();
    const lines = log.split('\n');
    const tail = lines.slice(-5).join('\n');
    console.log(`\n  ${c.white}${c.bold}Recent activity:${c.reset}`);
    console.log(`  ${c.dim}${tail}${c.reset}`);
  }
  console.log('');
}

async function daemonRun(): Promise<void> {
  // This is the actual daemon process — called by daemonStart() as a detached child
  const { startDaemon } = await import('./daemon/core.js');
  await startDaemon();
}

// ============================================
// WATCH COMMAND — Live Terminal Price Ticker
// ============================================

async function watchPrices(symbols: string[]): Promise<void> {
  if (symbols.length === 0) {
    console.log(`\n  ${c.red}✗${c.reset} No symbols specified`);
    console.log(`  ${c.dim}Usage: ${c.cyan}omnitrade watch BTC ETH SOL${c.reset}\n`);
    return;
  }

  // Normalize symbols: BTC → BTC/USDT, BTC/USDT → BTC/USDT
  const normalizedSymbols = symbols.map((s) => {
    const upper = s.toUpperCase();
    return upper.includes('/') ? upper : `${upper}/USDT`;
  });

  // Try to load config for exchange selection; fall back to public Binance
  let exchangeName = 'binance';
  let exchange: import('ccxt').Exchange;

  try {
    const { loadConfig } = await import('./config/loader.js');
    const config = loadConfig();
    const firstExchange = Object.keys(config.exchanges)[0];
    if (firstExchange) exchangeName = firstExchange;
  } catch {
    // No config — use public Binance (no credentials needed for price data)
  }

  const ccxt = await import('ccxt');
  const ExchangeClass = (ccxt.default as unknown as Record<string, new (opts: object) => import('ccxt').Exchange>)[exchangeName];
  if (!ExchangeClass) {
    console.log(`  ${c.red}✗${c.reset} Unknown exchange: ${exchangeName}\n`);
    return;
  }
  exchange = new ExchangeClass({ enableRateLimit: true });

  // Price tracking for direction (up/down)
  const prevPrices = new Map<string, number>();
  const POLL_INTERVAL = 5000; // 5 seconds
  const W = 56; // Display width inside borders

  const pad = (s: string, n: number) => {
    const visible = s.replace(/\x1b\[[0-9;]*m/g, '').length;
    return s + ' '.repeat(Math.max(0, n - visible));
  };

  const formatPrice = (price: number): string => {
    if (price >= 10000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (price >= 100) return `$${price.toFixed(2)}`;
    if (price >= 1) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  const render = (prices: Map<string, { last: number; change: number; changePct: number; error?: boolean }>) => {
    const now = new Date().toLocaleTimeString();
    const line = '─'.repeat(W);
    const hline = '═'.repeat(W);

    process.stdout.write('\x1b[2J\x1b[H'); // Clear screen, move to top

    console.log(`  ${c.cyan}╔${hline}╗${c.reset}`);
    console.log(`  ${c.cyan}║${c.reset}${pad(`  ${c.white}${c.bold}OmniTrade Watch${c.reset}  ${c.dim}•  ${exchangeName}  •  ${now}${c.reset}`, W)}${c.cyan}║${c.reset}`);
    console.log(`  ${c.cyan}╠${hline}╣${c.reset}`);

    if (prices.size === 0) {
      console.log(`  ${c.cyan}║${c.reset}  ${c.yellow}Loading prices...${c.reset}${' '.repeat(W - 19)}${c.cyan}║${c.reset}`);
    } else {
      for (const [symbol, data] of prices.entries()) {
        if (data.error) {
          // Symbol fetch failed — show a visually distinct error row
          const errLabel = '⚠ INVALID'.padStart(12);
          const errDetail = 'symbol not found on exchange';
          const rowVisible = `  ${symbol.padEnd(12)}  ${errLabel}  × ${errDetail}  `;
          const padding = ' '.repeat(Math.max(0, W - rowVisible.length + 2));
          console.log(
            `  ${c.cyan}║${c.reset}  ${c.red}${symbol.padEnd(12)}${c.reset}  ${c.red}${errLabel}${c.reset}  ${c.red}× ${errDetail}${c.reset}${padding}${c.cyan}║${c.reset}`
          );
          continue;
        }

        const isUp = data.change > 0;
        const isDown = data.change < 0;
        const arrow = isUp ? `${c.green}▲${c.reset}` : isDown ? `${c.red}▼${c.reset}` : `${c.gray}→${c.reset}`;
        const priceColor = isUp ? c.green : isDown ? c.red : c.white;

        // Build the row content, then pad to W characters (visible width)
        const priceFormatted = formatPrice(data.last).padStart(12);
        const changeFormatted = data.change !== 0
          ? `${isUp ? '+' : ''}${data.change.toFixed(data.last >= 100 ? 2 : 6)} (${isUp ? '+' : ''}${data.changePct.toFixed(2)}%)`
          : 'no change';
        const rowVisible = `  ${symbol.padEnd(12)}  ${priceFormatted}  _ ${changeFormatted}  `;
        const padding = ' '.repeat(Math.max(0, W - rowVisible.length + 2)); // +2 for the arrow char

        console.log(
          `  ${c.cyan}║${c.reset}  ${c.white}${symbol.padEnd(12)}${c.reset}  ${priceColor}${priceFormatted}${c.reset}  ${arrow} ${priceColor}${changeFormatted}${c.reset}${padding}${c.cyan}║${c.reset}`
        );
      }
    }

    console.log(`  ${c.cyan}╠${hline}╣${c.reset}`);
    console.log(`  ${c.cyan}║${c.reset}  ${c.dim}Ctrl+C to stop  •  Updates every ${POLL_INTERVAL / 1000}s${c.reset}${' '.repeat(W - 38)}${c.cyan}║${c.reset}`);
    console.log(`  ${c.cyan}╚${hline}╝${c.reset}`);
  };

  // Initial empty render
  render(new Map());

  // Poll loop
  let running = true;

  process.on('SIGINT', () => {
    running = false;
    process.stdout.write('\x1b[2J\x1b[H'); // Clear screen
    console.log(`\n  ${c.green}✓${c.reset} Watch stopped\n`);
    process.exit(0);
  });

  const poll = async () => {
    const prices = new Map<string, { last: number; change: number; changePct: number; error?: boolean }>();

    for (const symbol of normalizedSymbols) {
      try {
        const ticker = await exchange.fetchTicker(symbol);
        const last = ticker.last ?? 0;
        const prev = prevPrices.get(symbol) ?? last;
        const change = last - prev;
        const changePct = prev !== 0 ? (change / prev) * 100 : 0;

        prices.set(symbol, { last, change, changePct });
        prevPrices.set(symbol, last);
      } catch (err) {
        // Mark the symbol as invalid/errored — do NOT show $0 as it misleads the user
        prices.set(symbol, { last: 0, change: 0, changePct: 0, error: true });
      }
    }

    render(prices);
  };

  // First poll
  await poll();

  // Schedule subsequent polls
  while (running) {
    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL));
    if (running) await poll();
  }
}

// ============================================
// NOTIFICATION SETUP WIZARD
// ============================================

async function setupNotifications(
  question: (q: string) => Promise<string>
): Promise<Record<string, unknown>> {
  const notifications: Record<string, unknown> = {};

  console.log(`
  ${c.white}${c.bold}NOTIFICATIONS${c.reset}
  ${c.gray}─────────────────────────────────────────────────────────${c.reset}

  Get alerted when your price targets are hit — even when Claude isn't open.
  The background daemon fires these when alerts trigger.

  ${c.dim}Choose your notification channels:${c.reset}

    ${c.cyan}[1]${c.reset}  Native OS     ${c.dim}Zero setup • macOS, Windows, Linux${c.reset}
    ${c.cyan}[2]${c.reset}  Telegram      ${c.dim}Free • 5 min setup via @BotFather${c.reset}
    ${c.cyan}[3]${c.reset}  Discord       ${c.dim}Free • 5 min webhook setup${c.reset}
    ${c.cyan}[0]${c.reset}  Skip          ${c.dim}Set up later with 'omnitrade setup'${c.reset}
`);

  const choice = await question(`  ${c.yellow}?${c.reset} Select (e.g. 1 or 1,2): `);
  const picks = choice.split(',').map((s) => s.trim());

  // Native OS
  if (picks.includes('1')) {
    notifications.native = { enabled: true };
    console.log(`  ${c.green}✓${c.reset} Native OS notifications enabled`);
  }

  // Telegram
  if (picks.includes('2')) {
    console.log(`
  ${c.white}${c.bold}TELEGRAM SETUP${c.reset}
  ${c.gray}─────────────────────────────────────────────────────────${c.reset}

  ${c.cyan}1.${c.reset} Open Telegram and message ${c.white}@BotFather${c.reset}
  ${c.cyan}2.${c.reset} Send: ${c.white}/newbot${c.reset}
  ${c.cyan}3.${c.reset} Follow prompts to create your bot
  ${c.cyan}4.${c.reset} Copy the ${c.white}HTTP API token${c.reset} BotFather gives you
  ${c.cyan}5.${c.reset} Send ${c.white}/start${c.reset} to your new bot
  ${c.cyan}6.${c.reset} Visit: ${c.blue}https://api.telegram.org/bot<TOKEN>/getUpdates${c.reset}
     Copy the ${c.white}chat.id${c.reset} number from the response

`);
    const botToken = await question(`  ${c.cyan}Bot token:${c.reset}  `);
    const chatId = await question(`  ${c.cyan}Chat ID:${c.reset}    `);

    if (botToken.trim() && chatId.trim()) {
      // Test the token
      process.stdout.write(`  Verifying... `);
      try {
        const { verifyTelegram } = await import('./notifications/telegram.js');
        const botName = await verifyTelegram({ botToken: botToken.trim(), chatId: chatId.trim() });
        console.log(`${c.green}✓${c.reset} @${botName}`);
        notifications.telegram = {
          enabled: true,
          botToken: botToken.trim(),
          chatId: chatId.trim(),
        };
      } catch (err) {
        console.log(`${c.yellow}⚠${c.reset} Could not verify: ${(err as Error).message}`);
        const saveAnyway = await question(`  Save anyway? (y/N): `);
        if (saveAnyway.toLowerCase() === 'y') {
          notifications.telegram = {
            enabled: true,
            botToken: botToken.trim(),
            chatId: chatId.trim(),
          };
          console.log(`  ${c.yellow}⚠${c.reset} Telegram saved (unverified)`);
        }
      }
    } else {
      console.log(`  ${c.yellow}⚠${c.reset} Telegram skipped (no credentials entered)`);
    }
  }

  // Discord
  if (picks.includes('3')) {
    console.log(`
  ${c.white}${c.bold}DISCORD SETUP${c.reset}
  ${c.gray}─────────────────────────────────────────────────────────${c.reset}

  ${c.cyan}1.${c.reset} Open Discord → your server → channel settings (⚙)
  ${c.cyan}2.${c.reset} Go to ${c.white}Integrations → Webhooks → New Webhook${c.reset}
  ${c.cyan}3.${c.reset} Name it "OmniTrade" and copy the Webhook URL

`);
    const webhookUrl = await question(`  ${c.cyan}Webhook URL:${c.reset} `);

    if (webhookUrl.trim()) {
      process.stdout.write(`  Verifying... `);
      try {
        const { verifyDiscord } = await import('./notifications/discord.js');
        await verifyDiscord({ webhookUrl: webhookUrl.trim() });
        console.log(`${c.green}✓${c.reset} webhook valid`);
        notifications.discord = {
          enabled: true,
          webhookUrl: webhookUrl.trim(),
        };
      } catch (err) {
        console.log(`${c.yellow}⚠${c.reset} Could not verify: ${(err as Error).message}`);
        const saveAnyway = await question(`  Save anyway? (y/N): `);
        if (saveAnyway.toLowerCase() === 'y') {
          notifications.discord = {
            enabled: true,
            webhookUrl: webhookUrl.trim(),
          };
          console.log(`  ${c.yellow}⚠${c.reset} Discord saved (unverified)`);
        }
      }
    } else {
      console.log(`  ${c.yellow}⚠${c.reset} Discord skipped (no URL entered)`);
    }
  }

  return notifications;
}

// ============================================
// MAIN
// ============================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  switch (command) {
    case 'setup':
    case 'init':
      await runSetupWizard();
      break;
    case 'help':
    case '--help':
    case '-h':
      printHelp();
      break;
    case 'version':
    case '--version':
    case '-v':
      console.log(`omnitrade v${VERSION}`);
      break;
    case 'exchanges':
    case 'list':
      await showExchanges();
      break;
    case 'config':
      await showConfig();
      break;
    case 'test':
      await testConnections();
      break;
    case 'start':
    case 'serve':
      await import('./index.js');
      break;

    // ── Daemon commands ─────────────────────────────────────
    case 'daemon': {
      const sub = args[1] || 'status';
      switch (sub) {
        case 'start':
          await daemonStart();
          break;
        case 'stop':
          await daemonStop();
          break;
        case 'status':
          await daemonStatus();
          break;
        case 'run':
          // Internal: called by daemonStart as a detached child
          await daemonRun();
          break;
        default:
          console.log(`${c.red}Unknown daemon subcommand: ${sub}${c.reset}`);
          console.log(`Usage: ${c.cyan}omnitrade daemon${c.reset} ${c.dim}start|stop|status${c.reset}\n`);
          process.exit(1);
      }
      break;
    }

    // ── Watch command ────────────────────────────────────────
    case 'watch': {
      const symbols = args.slice(1).filter((a) => !a.startsWith('--'));
      await watchPrices(symbols);
      break;
    }

    // ── Dashboard command ─────────────────────────────────────
    case 'dashboard':
    case 'dash': {
      await runDashboard(args.slice(1));
      break;
    }

    // ── Paper trading commands ────────────────────────────────
    case 'paper': {
      const sub = args[1] || 'help';
      await runPaperCommand(sub, args.slice(2));
      break;
    }

    default:
      console.log(`${c.red}Unknown: ${command}${c.reset}\nRun ${c.cyan}omnitrade help${c.reset}\n`);
      process.exit(1);
  }
}

main().catch((error) => {
  console.error(`${c.red}Error:${c.reset}`, error.message);
  process.exit(1);
});

// ============================================
// DASHBOARD COMMAND
// ============================================

async function runDashboard(args: string[]): Promise<void> {
  // Optional: --symbol BTC to override chart symbol
  const symbolIdx = args.indexOf('--symbol');
  const chartSymbol = symbolIdx !== -1 ? (args[symbolIdx + 1] ?? 'BTC').toUpperCase() : 'BTC';

  // Optional: --refresh 5 to change poll interval (seconds)
  const refreshIdx = args.indexOf('--refresh');
  const refreshSec = refreshIdx !== -1 ? parseInt(args[refreshIdx + 1] ?? '8', 10) : 8;

  console.log(`${c.cyan}Starting OmniTrade Dashboard...${c.reset}`);
  console.log(`${c.dim}Chart: ${chartSymbol}/USDT  │  Refresh: ${refreshSec}s  │  Press q to quit${c.reset}\n`);

  try {
    const { startDashboard } = await import('./dashboard/index.js');
    await startDashboard({
      chartSymbol,
      refreshMs: refreshSec * 1000,
    });
  } catch (err) {
    console.error(`${c.red}Dashboard error:${c.reset}`, (err as Error).message);
    console.error(`${c.dim}Make sure you're running in a real terminal (not piped output).${c.reset}`);
    process.exit(1);
  }
}

// ============================================
// PAPER TRADING COMMANDS
// ============================================

async function runPaperCommand(sub: string, args: string[]): Promise<void> {
  const {
    loadWallet,
    executeBuy,
    executeSell,
    getPortfolioSummary,
    formatPrice,
    formatPnl,
    formatTimestamp,
  } = await import('./paper/wallet.js');

  switch (sub) {
    // ── paper buy <ASSET> <AMOUNT> ────────────────────────────
    case 'buy': {
      const asset = args[0];
      const amount = parseFloat(args[1] ?? '');

      if (!asset || isNaN(amount) || amount <= 0) {
        console.log(`${c.red}Usage:${c.reset} omnitrade paper buy ${c.cyan}<ASSET> <AMOUNT>${c.reset}`);
        console.log(`${c.dim}Example: omnitrade paper buy BTC 0.01${c.reset}\n`);
        return;
      }

      console.log(`\n${c.cyan}Fetching ${asset.toUpperCase()} price...${c.reset}`);
      try {
        const wallet = loadWallet();
        const { trade } = await executeBuy(wallet, asset, amount);

        console.log(`
${c.green}${c.bold}✓ BUY EXECUTED${c.reset}
${c.gray}─────────────────────────────────────────────────${c.reset}
  ${c.cyan}Asset:${c.reset}     ${trade.asset}
  ${c.cyan}Amount:${c.reset}    ${trade.amount}
  ${c.cyan}Price:${c.reset}     ${formatPrice(trade.price)}
  ${c.cyan}Cost:${c.reset}      $${trade.usdtValue.toFixed(2)} + $${trade.fee.toFixed(2)} fee
  ${c.cyan}Balance:${c.reset}   $${trade.balanceAfter.toFixed(2)} USDT remaining
  ${c.gray}ID: ${trade.id}${c.reset}
`);
      } catch (err) {
        console.log(`\n${c.red}✗ Buy failed:${c.reset} ${(err as Error).message}\n`);
      }
      break;
    }

    // ── paper sell <ASSET> <AMOUNT> ───────────────────────────
    case 'sell': {
      const asset = args[0];
      const amount = parseFloat(args[1] ?? '');

      if (!asset || isNaN(amount) || amount <= 0) {
        console.log(`${c.red}Usage:${c.reset} omnitrade paper sell ${c.cyan}<ASSET> <AMOUNT>${c.reset}`);
        console.log(`${c.dim}Example: omnitrade paper sell ETH 0.5${c.reset}\n`);
        return;
      }

      console.log(`\n${c.cyan}Fetching ${asset.toUpperCase()} price...${c.reset}`);
      try {
        const wallet = loadWallet();
        const { trade } = await executeSell(wallet, asset, amount);

        console.log(`
${c.green}${c.bold}✓ SELL EXECUTED${c.reset}
${c.gray}─────────────────────────────────────────────────${c.reset}
  ${c.cyan}Asset:${c.reset}     ${trade.asset}
  ${c.cyan}Amount:${c.reset}    ${trade.amount}
  ${c.cyan}Price:${c.reset}     ${formatPrice(trade.price)}
  ${c.cyan}Received:${c.reset}  $${trade.usdtValue.toFixed(2)} - $${trade.fee.toFixed(2)} fee = $${(trade.usdtValue - trade.fee).toFixed(2)}
  ${c.cyan}Balance:${c.reset}   $${trade.balanceAfter.toFixed(2)} USDT
  ${c.gray}ID: ${trade.id}${c.reset}
`);
      } catch (err) {
        console.log(`\n${c.red}✗ Sell failed:${c.reset} ${(err as Error).message}\n`);
      }
      break;
    }

    // ── paper portfolio ───────────────────────────────────────
    case 'portfolio':
    case 'port':
    case 'p': {
      console.log(`\n${c.cyan}Fetching live prices...${c.reset}`);
      try {
        const wallet = loadWallet();
        const summary = await getPortfolioSummary(wallet);

        const pnlColor = summary.totalPnl >= 0 ? c.green : c.red;
        const pnlStr = formatPnl(summary.totalPnl, summary.totalPnlPct);

        console.log(`
${c.white}${c.bold}PAPER PORTFOLIO${c.reset}
${c.gray}═════════════════════════════════════════════════════${c.reset}
  ${c.white}Total Value:${c.reset}  ${c.bold}$${summary.totalValue.toFixed(2)}${c.reset}
  ${c.white}P&L:${c.reset}          ${pnlColor}${pnlStr}${c.reset}
  ${c.white}USDT:${c.reset}         $${summary.usdtBalance.toFixed(2)}
  ${c.white}Started with:${c.reset} $${summary.initialValue.toLocaleString()}
${c.gray}─────────────────────────────────────────────────────${c.reset}`);

        if (summary.holdings.length === 0) {
          console.log(`  ${c.dim}No holdings — use ${c.cyan}omnitrade paper buy BTC 0.01${c.dim} to start${c.reset}`);
        } else {
          const headerRow = `  ${'Asset'.padEnd(8)} ${'Amount'.padEnd(14)} ${'Price'.padEnd(12)} ${'Value'.padEnd(12)} ${'Avg Buy'.padEnd(12)} ${'P&L'.padEnd(16)} ${'Alloc'}`;
          console.log(`${c.gray}${headerRow}${c.reset}`);
          console.log(`${c.gray}  ${'─'.repeat(88)}${c.reset}`);

          for (const h of summary.holdings) {
            const pnlColor2 = h.pnl >= 0 ? c.green : c.red;
            const pnlStr2 = `${h.pnl >= 0 ? '+' : ''}$${h.pnl.toFixed(2)} (${h.pnl >= 0 ? '+' : ''}${h.pnlPct.toFixed(1)}%)`;
            const amtStr = h.amount >= 1 ? h.amount.toFixed(4) : h.amount.toFixed(6);
            console.log(
              `  ${c.cyan}${h.asset.padEnd(8)}${c.reset}` +
              `${amtStr.padEnd(14)}` +
              `${formatPrice(h.price).padEnd(12)}` +
              `$${h.value.toFixed(2)}`.padEnd(12) +
              `${formatPrice(h.avgBuyPrice).padEnd(12)}` +
              `${pnlColor2}${pnlStr2.padEnd(16)}${c.reset}` +
              `${h.allocation.toFixed(1)}%`
            );
          }
        }
        console.log(`${c.gray}═════════════════════════════════════════════════════${c.reset}\n`);
      } catch (err) {
        console.log(`\n${c.red}✗ Portfolio error:${c.reset} ${(err as Error).message}\n`);
      }
      break;
    }

    // ── paper history ─────────────────────────────────────────
    case 'history':
    case 'hist':
    case 'h': {
      try {
        const wallet = loadWallet();

        if (wallet.trades.length === 0) {
          console.log(`\n${c.dim}No trades yet. Use ${c.cyan}omnitrade paper buy BTC 0.01${c.dim} to start.${c.reset}\n`);
          return;
        }

        // Optional: --last N flag
        const lastIdx = args.indexOf('--last');
        const showLast = lastIdx !== -1 ? parseInt(args[lastIdx + 1] ?? '20', 10) : 20;
        const trades = wallet.trades.slice(-showLast).reverse();

        console.log(`\n${c.white}${c.bold}TRADE HISTORY${c.reset} ${c.dim}(last ${trades.length} of ${wallet.trades.length})${c.reset}`);
        console.log(`${c.gray}═══════════════════════════════════════════════════════════════════════${c.reset}`);

        const hdr = `  ${'Time'.padEnd(20)} ${'Side'.padEnd(6)} ${'Asset'.padEnd(8)} ${'Amount'.padEnd(14)} ${'Price'.padEnd(12)} ${'USDT Value'.padEnd(12)} Fee`;
        console.log(`${c.gray}${hdr}${c.reset}`);
        console.log(`${c.gray}  ${'─'.repeat(87)}${c.reset}`);

        for (const t of trades) {
          const sideColor = t.side === 'buy' ? c.green : c.red;
          const sideStr = t.side.toUpperCase();
          const amtStr = t.amount >= 1 ? t.amount.toFixed(4) : t.amount.toFixed(6);
          console.log(
            `  ${c.dim}${formatTimestamp(t.timestamp).padEnd(20)}${c.reset}` +
            `${sideColor}${sideStr.padEnd(6)}${c.reset}` +
            `${c.cyan}${t.asset.padEnd(8)}${c.reset}` +
            `${amtStr.padEnd(14)}` +
            `${formatPrice(t.price).padEnd(12)}` +
            `$${t.usdtValue.toFixed(2)}`.padEnd(12) +
            `$${t.fee.toFixed(4)}`
          );
        }

        console.log(`${c.gray}═══════════════════════════════════════════════════════════════════════${c.reset}`);
        console.log(`${c.dim}Total trades: ${wallet.trades.length}  │  Wallet: ~/.omnitrade/paper-wallet.json${c.reset}\n`);
      } catch (err) {
        console.log(`\n${c.red}✗ History error:${c.reset} ${(err as Error).message}\n`);
      }
      break;
    }

    // ── paper reset ───────────────────────────────────────────
    case 'reset': {
      const { existsSync, unlinkSync } = await import('fs');
      const { homedir } = await import('os');
      const { join } = await import('path');
      const walletPath = join(homedir(), '.omnitrade', 'paper-wallet.json');

      if (!existsSync(walletPath)) {
        console.log(`\n${c.yellow}⚠${c.reset} No paper wallet found.\n`);
        return;
      }

      const rl = (await import('readline')).createInterface({ input: process.stdin, output: process.stdout });
      const answer = await new Promise<string>((r) => rl.question(`\n${c.yellow}⚠ Reset paper wallet? This clears all trades and restarts with $10,000 (y/N): ${c.reset}`, r));
      rl.close();

      if (answer.toLowerCase() === 'y') {
        unlinkSync(walletPath);
        loadWallet(); // Creates a fresh wallet
        console.log(`\n${c.green}✓ Paper wallet reset to $10,000 USDT${c.reset}\n`);
      } else {
        console.log(`${c.dim}Reset cancelled.${c.reset}\n`);
      }
      break;
    }

    // ── paper help ────────────────────────────────────────────
    default: {
      console.log(`
${c.white}${c.bold}PAPER TRADING${c.reset}
${c.gray}─────────────────────────────────────────────────────────${c.reset}

  ${c.dim}Risk-free trading with $10,000 virtual USDT.
  Real prices from Binance public API. No keys needed.${c.reset}

  ${c.green}buy${c.reset}    ${c.cyan}omnitrade paper buy BTC 0.01${c.reset}      ${c.dim}Buy 0.01 BTC at market${c.reset}
  ${c.red}sell${c.reset}   ${c.cyan}omnitrade paper sell ETH 0.5${c.reset}      ${c.dim}Sell 0.5 ETH at market${c.reset}
  ${c.yellow}port${c.reset}   ${c.cyan}omnitrade paper portfolio${c.reset}         ${c.dim}Holdings + P&L${c.reset}
  ${c.yellow}hist${c.reset}   ${c.cyan}omnitrade paper history${c.reset}           ${c.dim}Trade log${c.reset}
  ${c.gray}reset${c.reset}  ${c.cyan}omnitrade paper reset${c.reset}             ${c.dim}Start fresh with $10,000${c.reset}

  ${c.dim}Wallet stored at:${c.reset} ~/.omnitrade/paper-wallet.json
  ${c.dim}Fees: 0.1% per trade (matches Binance spot taker fee)${c.reset}
`);
      break;
    }
  }
}
