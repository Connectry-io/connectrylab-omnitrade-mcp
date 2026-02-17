# OmniTrade MCP

> **One AI. 107 Exchanges. Natural language trading.**

Connect Claude to Binance, Coinbase, Kraken, and 104 more cryptocurrency exchanges through the Model Context Protocol (MCP).

[![npm version](https://img.shields.io/npm/v/omnitrade-mcp)](https://www.npmjs.com/package/omnitrade-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🔗 **107 Exchanges** — Connect to any exchange supported by CCXT
- 🤖 **Natural Language** — Ask Claude to trade in plain English
- 🔒 **Local-Only** — API keys never leave your machine
- ⚡ **Arbitrage Detection** — Find price differences across exchanges
- 📊 **Unified Portfolio** — See all holdings in one view
- 🛡️ **Safety First** — Order limits, pair whitelists, testnet mode
- 🔔 **Price Alerts** — Get notified when crypto hits your target price
- 📈 **ASCII Charts** — View price history right in your terminal
- 📊 **Portfolio Tracking** — Track P&L over time with snapshots
- ⚖️ **Auto-Rebalance** — Automatically rebalance to target allocations
- 💰 **DCA (Dollar Cost Average)** — Set up recurring buys
- 🎯 **Conditional Orders** — Execute trades based on price conditions

## Quick Start

### 1. Install

```bash
npm install -g omnitrade-mcp
```

### 2. Configure

Create `~/.omnitrade/config.json`:

```json
{
  "exchanges": {
    "binance": {
      "apiKey": "YOUR_API_KEY",
      "secret": "YOUR_SECRET",
      "testnet": true
    },
    "coinbase": {
      "apiKey": "YOUR_API_KEY",
      "secret": "YOUR_SECRET",
      "password": "YOUR_PASSPHRASE",
      "testnet": true
    }
  },
  "security": {
    "maxOrderSize": 100,
    "confirmTrades": true
  }
}
```

Set proper permissions:

```bash
chmod 600 ~/.omnitrade/config.json
```

### 3. Add to Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "omnitrade": {
      "command": "omnitrade-mcp"
    }
  }
}
```

### 4. Trade

Restart Claude Desktop and start chatting:

- *"What's my balance on Binance?"*
- *"Show me ETH prices across all exchanges"*
- *"Buy $50 of BTC on the cheapest exchange"*
- *"Are there any arbitrage opportunities for SOL?"*
- *"Alert me when BTC drops below $40000"*
- *"Show me a 24h chart for ETH"*
- *"How has my portfolio performed this week?"*
- *"Rebalance my portfolio to 50% BTC, 30% ETH, 20% SOL"*
- *"Setup DCA to buy $10 of BTC daily"*
- *"Buy ETH if it drops 5%"*

## Available Tools

### Core Trading
| Tool | Description |
|------|-------------|
| `get_balances` | Get portfolio balances across exchanges |
| `get_portfolio` | Unified portfolio summary |
| `get_prices` | Current prices for a trading pair |
| `compare_prices` | Find best price across exchanges |
| `place_order` | Execute buy/sell orders |
| `get_orders` | View open and recent orders |
| `cancel_order` | Cancel an open order |

### Advanced Trading
| Tool | Description |
|------|-------------|
| `get_arbitrage` | Find arbitrage opportunities |
| `execute_arbitrage` | Execute arbitrage trades automatically |
| `check_spread` | Check spread for a specific pair |

### Alerts
| Tool | Description |
|------|-------------|
| `set_price_alert` | Set price alerts for any trading pair |
| `list_alerts` | View all active and triggered alerts |
| `check_alerts` | Manually check if alerts have triggered |
| `remove_alert` | Remove a specific alert |
| `clear_triggered_alerts` | Clear alert history |

### Charts & Analytics
| Tool | Description |
|------|-------------|
| `get_chart` | Display ASCII price charts (1h, 4h, 24h, 7d) |
| `record_portfolio_snapshot` | Record current portfolio value |
| `get_portfolio_history` | View portfolio P&L over time |
| `clear_portfolio_history` | Clear portfolio history |

### Portfolio Management
| Tool | Description |
|------|-------------|
| `rebalance_portfolio` | Auto-rebalance to target allocations |

### DCA (Dollar Cost Averaging)
| Tool | Description |
|------|-------------|
| `setup_dca` | Setup recurring buy orders |
| `list_dca_configs` | List all DCA configurations |
| `execute_dca_orders` | Execute pending DCA orders |
| `toggle_dca` | Enable/disable DCA configs |
| `remove_dca` | Remove DCA configuration |

### Conditional Orders
| Tool | Description |
|------|-------------|
| `set_conditional_order` | Create price-triggered orders |
| `list_conditional_orders` | View all conditional orders |
| `check_conditional_orders` | Check and execute conditions |
| `remove_conditional_order` | Remove conditional order |

## Usage Examples

### Price Alerts
```
You: "Alert me when BTC drops below $40000"
Claude: ✅ Alert set for BTC/USDT below $40000

You: "Check my alerts"
Claude: 🚨 1 alert triggered! BTC has gone below $40000 on binance
```

### ASCII Charts
```
You: "Show me a 24h chart for ETH"
Claude: 
╔════════════════════════════════════════════════════════════╗
║ ETH/USDT - 24h Chart                                       ║
╠════════════════════════════════════════════════════════════╣
     █                                                    
   ▄█                                                     
  ██▄                                                     
 ███▄                                                     
████▄                                                     
╚════════════════════════════════════════════════════════════╝
Start: $3245.20 | End: $3312.50 | Change: ↑ 2.07% ($67.30)
```

### Portfolio History & P&L
```
You: "Record my portfolio value"
Claude: ✅ Portfolio snapshot recorded: $12,345.67

You: "How has my portfolio performed this week?"
Claude: 
Performance (1w): 
  Start: $10,000.00
  End: $12,345.67
  Profit: ↑ $2,345.67 (23.46%)
  Trend: UP
```

### Auto-Rebalance
```
You: "Rebalance my portfolio to 50% BTC, 30% ETH, 20% SOL"
Claude: 
📊 Rebalance Plan:
  Current: BTC 40%, ETH 35%, SOL 25%
  Target: BTC 50%, ETH 30%, SOL 20%
  
  Trades required:
  - BUY 0.0523 BTC ($1,234.56)
  - SELL 0.1234 ETH ($456.78)
  - SELL 5.6789 SOL ($234.56)
```

### DCA (Dollar Cost Averaging)
```
You: "Setup DCA to buy $10 of BTC every day"
Claude: ✅ DCA strategy created for BTC/USDT: $10 daily

You: "Execute my DCA orders"
Claude: DCA execution complete: 1 succeeded, 0 failed
  - Bought 0.00024 BTC for $10.00
```

### Conditional Orders
```
You: "Buy ETH if it drops 5%"
Claude: ✅ Conditional order created
  When: ETH price decreases by 5% (from $3,245.20)
  Will execute: MARKET BUY 0.5 ETH

You: "Check conditional orders"
Claude: 🚨 1 conditional order triggered!
  ETH dropped to $3,082.94 (-5.0%)
  Executed: MARKET BUY 0.5 ETH (Order #12345)
```

### Arbitrage Execution
```
You: "Find arbitrage for BTC"
Claude: Found 1 opportunity:
  Buy BTC on Kraken: $42,150
  Sell BTC on Binance: $42,300
  Spread: 0.36% ($150)

You: "Execute arbitrage for 0.01 BTC between Kraken and Binance"
Claude: 
📊 Arbitrage Preview:
  Buy on Kraken: $421.50
  Sell on Binance: $423.00
  Gross profit: $1.50 (0.36%)
  Fees: $0.84
  Net profit: $0.66 (0.16%)
```

## Supported Exchanges

OmniTrade supports **107 exchanges** through [CCXT](https://github.com/ccxt/ccxt), including:

**Tier 1 (Certified):** Binance, Bybit, OKX, Gate.io, KuCoin, Bitget, HTX, Crypto.com, MEXC, WOO X, Hyperliquid

**Tier 2:** Coinbase, Kraken, Bitstamp, Gemini, Bitfinex, Poloniex, Deribit, Upbit, Bithumb, Bitvavo, and 80+ more

## Security

### Local-Only Architecture

```
┌─────────────────────────────────────┐
│       YOUR MACHINE                  │
│                                     │
│  Claude ←→ OmniTrade MCP           │
│              ↓                      │
│         config.json (your keys)    │
│              ↓                      │
│         Exchange APIs              │
└─────────────────────────────────────┘
          (HTTPS to exchanges)
```

- ✅ API keys stay on your machine
- ✅ No cloud storage
- ✅ No telemetry
- ✅ Open source — audit the code

### API Key Best Practices

**Always:**
- Enable only View + Trade permissions
- **Disable** withdrawal permissions
- Use IP restrictions when available
- Use testnet for testing

**Never:**
- Share your config file
- Commit config to git
- Enable withdrawal permissions

### Safety Features

```json
{
  "security": {
    "maxOrderSize": 100,        // Max $100 per order
    "allowedPairs": ["BTC/USDT", "ETH/USDT"],  // Whitelist
    "testnetOnly": true,        // Force testnet
    "confirmTrades": true       // Require confirmation
  }
}
```

## Configuration

### Full Config Example

```json
{
  "exchanges": {
    "binance": {
      "apiKey": "xxx",
      "secret": "xxx",
      "testnet": true
    },
    "coinbase": {
      "apiKey": "xxx",
      "secret": "xxx", 
      "password": "xxx",
      "testnet": true
    },
    "kraken": {
      "apiKey": "xxx",
      "secret": "xxx",
      "testnet": false
    }
  },
  "defaultExchange": "binance",
  "security": {
    "maxOrderSize": 100,
    "allowedPairs": ["BTC/USDT", "ETH/USDT", "SOL/USDT"],
    "testnetOnly": false,
    "confirmTrades": true
  }
}
```

### Config Locations

The config file is searched in order:

1. `~/.omnitrade/config.json` (recommended)
2. `./omnitrade.config.json`
3. `./.omnitrade.json`

## Testnet Setup

### Binance Testnet

1. Go to https://testnet.binance.vision/
2. Login with GitHub
3. Generate API keys
4. Get free testnet coins from faucet

### Coinbase Sandbox

1. Go to https://portal.cdp.coinbase.com/
2. Create new project
3. Enable sandbox mode
4. Generate API keys

## Disclaimer

```
⚠️ IMPORTANT

This software is provided "as is" without warranty of any kind.

Cryptocurrency trading involves substantial risk of loss. 
Past performance does not guarantee future results.

This software does NOT provide financial, investment, or trading advice.
You are solely responsible for your trading decisions.

Always test with testnet before using real funds.
Never trade more than you can afford to lose.
```

## License

MIT © [Connectry Labs](https://connectry.io)

## Links

- [GitHub](https://github.com/Connectry-io/omnitrade-mcp)
- [npm](https://www.npmjs.com/package/omnitrade-mcp)
- [CCXT Documentation](https://docs.ccxt.com/)
- [MCP Specification](https://modelcontextprotocol.io/)

---

Made with ⚡ by [Connectry Labs](https://connectry.io)
