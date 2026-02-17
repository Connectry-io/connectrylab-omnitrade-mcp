#!/usr/bin/env node
/**
 * OmniTrade MCP CLI
 * Beautiful command-line interface with guided setup
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import * as readline from 'readline';

const VERSION = '0.5.0';
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

    ${c.green}setup${c.reset}        Interactive setup wizard
    ${c.cyan}start${c.reset}        Launch MCP server for Claude Desktop
    ${c.cyan}test${c.reset}         Verify your exchange connections work
    ${c.cyan}config${c.reset}       View saved API configuration
    ${c.cyan}exchanges${c.reset}    Browse all 107 supported exchanges
    ${c.cyan}help${c.reset}         Show this help

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
  ${c.gray}─────────────────────────────────────────────────────${c.reset}

  Let's connect your exchange to Claude in ${c.green}2 minutes${c.reset}.

  ${c.white}${c.bold}HOW IT WORKS${c.reset}

    ${c.cyan}1.${c.reset}  You create API keys on your exchange ${c.dim}(read/trade only)${c.reset}
    ${c.cyan}2.${c.reset}  We store them locally on your machine
    ${c.cyan}3.${c.reset}  Claude Desktop uses them via MCP protocol
    ${c.cyan}4.${c.reset}  You chat naturally: ${c.dim}"What's my BTC balance?"${c.reset}

  ${c.orange}⚠${c.reset}  Your keys ${c.bold}never leave your computer${c.reset}.
     OmniTrade runs 100% locally.

`);

  await question(`  ${c.dim}Press Enter to continue...${c.reset}`);
  
  // Choose Exchange
  console.log(`
  ${c.white}${c.bold}STEP 1 — CHOOSE EXCHANGE${c.reset}
  ${c.gray}─────────────────────────────────────────────────────${c.reset}
`);

  const exchangeKeys = Object.keys(EXCHANGE_INFO);
  exchangeKeys.forEach((key, i) => {
    const info = EXCHANGE_INFO[key]!;
    const num = `[${i + 1}]`;
    const oauth = info.supportsOAuth ? `${c.green}OAuth${c.reset}` : '';
    console.log(`    ${c.cyan}${num.padEnd(4)}${c.reset} ${info.name.padEnd(12)} ${c.dim}${info.description}${c.reset} ${oauth}`);
  });
  console.log(`    ${c.cyan}[${exchangeKeys.length + 1}]${c.reset}  Other        ${c.dim}Enter exchange name manually${c.reset}`);
  console.log('');

  const exchangeChoice = await question(`  ${c.yellow}?${c.reset} Select [1-${exchangeKeys.length + 1}]: `);
  
  const choiceNum = parseInt(exchangeChoice.trim(), 10);
  let exchange: string;
  let exchangeInfo: ExchangeInfo | undefined;
  
  if (choiceNum >= 1 && choiceNum <= exchangeKeys.length) {
    exchange = exchangeKeys[choiceNum - 1]!;
    exchangeInfo = EXCHANGE_INFO[exchange];
  } else {
    exchange = await question(`  ${c.yellow}?${c.reset} Exchange name: `);
    exchange = exchange.toLowerCase().trim();
  }
  
  // API Key Instructions with detailed guidance
  console.log(`
  ${c.white}${c.bold}STEP 2 — CREATE API KEYS${c.reset}
  ${c.gray}─────────────────────────────────────────────────────${c.reset}
`);

  if (exchangeInfo) {
    console.log(`  ${c.white}${c.bold}${exchangeInfo.name}${c.reset} API Setup:\n`);
    
    // Show steps
    exchangeInfo.steps.forEach((step, i) => {
      console.log(`    ${c.cyan}${i + 1}.${c.reset} ${step}`);
    });
    
    console.log('');
    console.log(`  ${c.blue}API Page:${c.reset}  ${exchangeInfo.apiUrl}`);
    if (exchangeInfo.testnetUrl) {
      console.log(`  ${c.blue}Testnet:${c.reset}   ${exchangeInfo.testnetUrl}`);
    }
    console.log(`  ${c.blue}Help:${c.reset}      ${exchangeInfo.docsUrl}`);
  } else {
    console.log(`  ${c.white}${c.bold}${exchange.toUpperCase()}${c.reset} API Setup:\n`);
    console.log(`    ${c.cyan}1.${c.reset} Log into ${exchange} and find API settings`);
    console.log(`    ${c.cyan}2.${c.reset} Create a new API key`);
    console.log(`    ${c.cyan}3.${c.reset} Enable: ${c.green}✓ Read${c.reset}  ${c.green}✓ Trade${c.reset}  ${c.red}✗ Withdraw${c.reset}`);
    console.log(`    ${c.cyan}4.${c.reset} Copy your API Key and Secret`);
  }

  console.log(`
  ${c.orange}╔════════════════════════════════════════════════════╗${c.reset}
  ${c.orange}║${c.reset}  ${c.orange}⚠  SECURITY:${c.reset} Never enable withdrawal permissions  ${c.orange}║${c.reset}
  ${c.orange}║${c.reset}     OmniTrade only needs read + trade access        ${c.orange}║${c.reset}
  ${c.orange}╚════════════════════════════════════════════════════╝${c.reset}
`);

  await question(`  ${c.dim}Press Enter when you have your keys...${c.reset}`);

  // Enter Keys
  console.log(`
  ${c.white}${c.bold}STEP 3 — ENTER YOUR KEYS${c.reset}
  ${c.gray}─────────────────────────────────────────────────────${c.reset}

  ${c.dim}Paste your API credentials below.${c.reset}
  ${c.dim}Stored at: ~/.omnitrade/config.json (local only)${c.reset}

`);

  const apiKey = await question(`  ${c.cyan}API Key:${c.reset}    `);
  const secret = await question(`  ${c.cyan}Secret:${c.reset}     `);
  
  let password = '';
  const needsPassphrase = exchangeInfo?.needsPassphrase || ['coinbase', 'kucoin', 'okx'].includes(exchange);
  if (needsPassphrase) {
    password = await question(`  ${c.cyan}Passphrase:${c.reset} `);
  }
  
  // Testnet option
  console.log('');
  const hasTestnet = exchangeInfo?.testnetUrl || ['binance', 'bybit'].includes(exchange);
  let testnet = false;
  if (hasTestnet) {
    console.log(`  ${c.dim}Testnet available — practice with fake money first${c.reset}`);
    const testnetAnswer = await question(`  ${c.yellow}?${c.reset} Use testnet mode? ${c.dim}(Y/n)${c.reset}: `);
    testnet = testnetAnswer.toLowerCase() !== 'n';
  } else {
    console.log(`  ${c.dim}Note: ${exchange} doesn't have a public testnet${c.reset}`);
    console.log(`  ${c.dim}Your API will connect to the live exchange${c.reset}`);
    await question(`  ${c.dim}Press Enter to continue...${c.reset}`);
  }

  rl.close();

  // Save
  const config: Record<string, unknown> = {
    exchanges: {
      [exchange]: {
        apiKey: apiKey.trim(),
        secret: secret.trim(),
        ...(password.trim() ? { password: password.trim() } : {}),
        testnet,
      },
    },
    security: {
      maxOrderSize: 100,
      confirmTrades: true,
    },
  };

  const configDir = join(homedir(), '.omnitrade');
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

  try {
    const { chmodSync } = await import('fs');
    chmodSync(CONFIG_PATH, 0o600);
  } catch {}

  // Claude Setup - Auto-configure
  console.log(`
  ${c.green}${c.bold}✓ SAVED${c.reset}

  ${c.white}${c.bold}STEP 4 — CONNECT TO CLAUDE${c.reset}
  ${c.gray}─────────────────────────────────────────────────────${c.reset}
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

  rl2.close();

  console.log(`
  ${c.gray}─────────────────────────────────────────────────────────────${c.reset}

  ${c.white}${c.bold}TRY IT${c.reset}

    Ask Claude: ${c.dim}"What's my balance on ${exchange}?"${c.reset}

  ${c.white}${c.bold}USEFUL COMMANDS${c.reset}

    ${c.cyan}omnitrade test${c.reset}      Test your connection
    ${c.cyan}omnitrade config${c.reset}    View configuration
    ${c.cyan}omnitrade setup${c.reset}     Add another exchange

  ${c.green}${c.bold}✓ Setup complete!${c.reset}

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
    default:
      console.log(`${c.red}Unknown: ${command}${c.reset}\nRun ${c.cyan}omnitrade help${c.reset}\n`);
      process.exit(1);
  }
}

main().catch((error) => {
  console.error(`${c.red}Error:${c.reset}`, error.message);
  process.exit(1);
});
