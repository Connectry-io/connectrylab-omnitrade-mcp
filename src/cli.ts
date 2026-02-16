#!/usr/bin/env node
/**
 * OmniTrade MCP CLI
 * Beautiful command-line interface with guided setup
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import * as readline from 'readline';

const VERSION = '0.4.1';
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

function printLogo(): void {
  console.log(`
${c.cyan}
    ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
    █${c.reset}                                                           ${c.cyan}█
    █${c.reset}   ${c.white}${c.bold} ██████  ███    ███ ███    ██ ██${c.purple}████████${c.white}██████   █████  ██████  ███████ ${c.reset}${c.cyan} █
    █${c.reset}   ${c.white}${c.bold}██    ██ ████  ████ ████   ██ ██${c.purple}   ██   ${c.white}██   ██ ██   ██ ██   ██ ██      ${c.reset}${c.cyan} █
    █${c.reset}   ${c.white}${c.bold}██    ██ ██ ████ ██ ██ ██  ██ ██${c.purple}   ██   ${c.white}██████  ███████ ██   ██ █████   ${c.reset}${c.cyan} █
    █${c.reset}   ${c.white}${c.bold}██    ██ ██  ██  ██ ██  ██ ██ ██${c.purple}   ██   ${c.white}██   ██ ██   ██ ██   ██ ██      ${c.reset}${c.cyan} █
    █${c.reset}   ${c.white}${c.bold} ██████  ██      ██ ██   ████ ██${c.purple}   ██   ${c.white}██   ██ ██   ██ ██████  ███████ ${c.reset}${c.cyan} █
    █${c.reset}                                                           ${c.cyan}█
    █${c.gray}  ─────────────────────────────────────────────────────────${c.cyan}█
    █${c.reset}                                                           ${c.cyan}█
    █${c.reset}   ${c.white}One AI.  ${c.cyan}107 Exchanges.  ${c.purple}Natural Language Trading.${c.reset}     ${c.cyan}█
    █${c.reset}                                                           ${c.cyan}█
    █${c.reset}   ${c.gray}v${VERSION}${c.reset}                                  ${c.gray}by Connectry Labs${c.reset}   ${c.cyan}█
    █${c.reset}                                                           ${c.cyan}█
    ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
${c.reset}`);
}

function printCompactLogo(): void {
  console.log(`
${c.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}
  ${c.white}${c.bold}OMNITRADE${c.purple} MCP${c.reset}  ${c.gray}•  One AI. 107 Exchanges.${c.reset}
${c.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}
`);
}

// ============================================
// HELP
// ============================================

function printHelp(): void {
  printLogo();
  
  console.log(`
  ${c.white}${c.bold}COMMANDS${c.reset}
  ${c.gray}─────────────────────────────────────────────────────────────${c.reset}

    ${c.green}${c.bold}setup${c.reset}            Guided setup wizard ${c.dim}(start here!)${c.reset}
    ${c.cyan}start${c.reset}            Start MCP server for Claude Desktop
    ${c.cyan}test${c.reset}             Test your exchange connections
    ${c.cyan}config${c.reset}           View current configuration
    ${c.cyan}exchanges${c.reset}        List all 107 supported exchanges
    ${c.cyan}help${c.reset}             Show this help

  ${c.white}${c.bold}GET STARTED${c.reset}
  ${c.gray}─────────────────────────────────────────────────────────────${c.reset}

    ${c.yellow}$${c.reset} ${c.green}omnitrade setup${c.reset}

  ${c.white}${c.bold}DOCUMENTATION${c.reset}
  ${c.gray}─────────────────────────────────────────────────────────────${c.reset}

    ${c.blue}https://github.com/Connectry-io/omnitrade-mcp${c.reset}

`);
}

// ============================================
// GUIDED SETUP WIZARD
// ============================================

async function runSetupWizard(): Promise<void> {
  printLogo();
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  const question = (q: string): Promise<string> => 
    new Promise(resolve => rl.question(q, resolve));

  // Welcome
  console.log(`
  ${c.white}${c.bold}WELCOME TO OMNITRADE${c.reset}
  ${c.gray}─────────────────────────────────────────────────────────────${c.reset}

  Let's connect your first crypto exchange to Claude.
  This takes about ${c.green}2 minutes${c.reset}.

  ${c.white}${c.bold}WHAT YOU NEED${c.reset}

    ${c.cyan}1.${c.reset}  A crypto exchange account ${c.dim}(Binance, Coinbase, etc.)${c.reset}
    ${c.cyan}2.${c.reset}  API keys from that exchange
    ${c.cyan}3.${c.reset}  Claude Desktop installed

`);

  await question(`  ${c.dim}Press Enter to continue...${c.reset}`);
  
  // Choose Exchange
  console.log(`
  ${c.white}${c.bold}STEP 1/4 — CHOOSE EXCHANGE${c.reset}
  ${c.gray}─────────────────────────────────────────────────────────────${c.reset}

    ${c.cyan}[1]${c.reset}  Binance        ${c.dim}Largest global exchange${c.reset}
    ${c.cyan}[2]${c.reset}  Coinbase       ${c.dim}US-based, beginner friendly${c.reset}
    ${c.cyan}[3]${c.reset}  Kraken         ${c.dim}Security focused${c.reset}
    ${c.cyan}[4]${c.reset}  Bybit          ${c.dim}Derivatives trading${c.reset}
    ${c.cyan}[5]${c.reset}  OKX            ${c.dim}Full-featured${c.reset}
    ${c.cyan}[6]${c.reset}  KuCoin         ${c.dim}Altcoin variety${c.reset}
    ${c.cyan}[7]${c.reset}  Other          ${c.dim}Enter name manually${c.reset}

`);

  const exchangeChoice = await question(`  ${c.yellow}?${c.reset} Select [1-7]: `);
  
  const exchangeMap: Record<string, string> = {
    '1': 'binance', '2': 'coinbase', '3': 'kraken',
    '4': 'bybit', '5': 'okx', '6': 'kucoin',
  };
  
  let exchange = exchangeMap[exchangeChoice.trim()];
  
  if (!exchange) {
    exchange = await question(`  ${c.yellow}?${c.reset} Exchange name: `);
  }
  
  exchange = exchange.toLowerCase().trim();
  
  // API Key Instructions
  console.log(`
  ${c.white}${c.bold}STEP 2/4 — GET API KEYS${c.reset}
  ${c.gray}─────────────────────────────────────────────────────────────${c.reset}

  Create API keys on ${c.white}${c.bold}${exchange.toUpperCase()}${c.reset}:
`);

  if (exchange === 'binance') {
    console.log(`
    ${c.cyan}1.${c.reset} Go to ${c.blue}https://testnet.binance.vision${c.reset} ${c.dim}(testnet)${c.reset}
    ${c.cyan}2.${c.reset} Click ${c.white}"Generate HMAC_SHA256 Key"${c.reset}
    ${c.cyan}3.${c.reset} Permissions: ${c.green}✓ Read${c.reset}  ${c.green}✓ Trade${c.reset}  ${c.red}✗ Withdraw${c.reset}
    ${c.cyan}4.${c.reset} Copy ${c.white}API Key${c.reset} and ${c.white}Secret Key${c.reset}
`);
  } else if (exchange === 'coinbase') {
    console.log(`
    ${c.cyan}1.${c.reset} Go to ${c.blue}https://portal.cdp.coinbase.com${c.reset}
    ${c.cyan}2.${c.reset} Create a new project
    ${c.cyan}3.${c.reset} Generate API credentials
    ${c.cyan}4.${c.reset} Copy ${c.white}API Key${c.reset}, ${c.white}Secret${c.reset}, and ${c.white}Passphrase${c.reset}
`);
  } else {
    console.log(`
    ${c.cyan}1.${c.reset} Log into ${c.white}${exchange}${c.reset}
    ${c.cyan}2.${c.reset} Go to API settings
    ${c.cyan}3.${c.reset} Create new API key
    ${c.cyan}4.${c.reset} Enable: ${c.green}✓ Read${c.reset}  ${c.green}✓ Trade${c.reset}  ${c.red}✗ Withdraw${c.reset}
`);
  }

  console.log(`  ${c.orange}⚠  Never enable withdrawal permissions!${c.reset}
`);

  await question(`  ${c.dim}Press Enter when you have your keys...${c.reset}`);

  // Enter Keys
  console.log(`
  ${c.white}${c.bold}STEP 3/4 — ENTER API KEYS${c.reset}
  ${c.gray}─────────────────────────────────────────────────────────────${c.reset}

  ${c.dim}Keys are stored locally at ~/.omnitrade/config.json${c.reset}
  ${c.dim}They never leave your machine.${c.reset}

`);

  const apiKey = await question(`  ${c.yellow}?${c.reset} API Key: `);
  const secret = await question(`  ${c.yellow}?${c.reset} Secret: `);
  
  let password = '';
  if (['coinbase', 'kucoin', 'okx'].includes(exchange)) {
    password = await question(`  ${c.yellow}?${c.reset} Passphrase: `);
  }
  
  const testnetAnswer = await question(`  ${c.yellow}?${c.reset} Use testnet? ${c.dim}(Y/n)${c.reset}: `);
  const testnet = testnetAnswer.toLowerCase() !== 'n';

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

  // Claude Setup
  console.log(`
  ${c.green}${c.bold}✓ SAVED${c.reset}

  ${c.white}${c.bold}STEP 4/4 — CONNECT TO CLAUDE${c.reset}
  ${c.gray}─────────────────────────────────────────────────────────────${c.reset}

  ${c.cyan}1.${c.reset} Open Claude Desktop config:

     ${c.dim}macOS:${c.reset} ${c.blue}~/Library/Application Support/Claude/claude_desktop_config.json${c.reset}
     ${c.dim}Windows:${c.reset} ${c.blue}%APPDATA%\\Claude\\claude_desktop_config.json${c.reset}

  ${c.cyan}2.${c.reset} Add this:

     ${c.gray}{
       "mcpServers": {
         "omnitrade": {
           "command": "omnitrade",
           "args": ["start"]
         }
       }
     }${c.reset}

  ${c.cyan}3.${c.reset} ${c.white}Restart Claude Desktop${c.reset}

  ${c.cyan}4.${c.reset} Try asking Claude:
     ${c.dim}"What's my balance on ${exchange}?"${c.reset}

  ${c.gray}─────────────────────────────────────────────────────────────${c.reset}

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
