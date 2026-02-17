<p align="center">
  <br />
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Connectry-io/omnitrade-mcp/main/.github/assets/logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/Connectry-io/omnitrade-mcp/main/.github/assets/logo-light.svg">
    <img alt="OmniTrade" src="https://raw.githubusercontent.com/Connectry-io/omnitrade-mcp/main/.github/assets/logo-dark.svg" width="350">
  </picture>
  <br />
</p>

<h3 align="center">
  Trade crypto with natural language
</h3>

<p align="center">
  Connect Claude to 107+ exchanges through the Model Context Protocol.<br />
  Buy, sell, track, and analyze — all by just asking.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/omnitrade-mcp"><img src="https://img.shields.io/npm/v/omnitrade-mcp?style=flat&colorA=18181B&colorB=28CF8D" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/omnitrade-mcp"><img src="https://img.shields.io/npm/dm/omnitrade-mcp?style=flat&colorA=18181B&colorB=28CF8D" alt="npm downloads"></a>
  <a href="https://github.com/Connectry-io/omnitrade-mcp"><img src="https://img.shields.io/github/stars/Connectry-io/omnitrade-mcp?style=flat&colorA=18181B&colorB=28CF8D" alt="GitHub stars"></a>
  <a href="https://github.com/Connectry-io/omnitrade-mcp/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Connectry-io/omnitrade-mcp?style=flat&colorA=18181B&colorB=28CF8D" alt="License"></a>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-features">Features</a> •
  <a href="#-examples">Examples</a> •
  <a href="#-tools">Tools</a> •
  <a href="#-security">Security</a>
</p>

---

> ⚠️ **Disclaimer:** OmniTrade is a developer tool and does not constitute financial advice. Cryptocurrency trading involves substantial risk. Connectry Labs is not a licensed financial advisor. Always do your own research and consult a qualified financial advisor before making investment decisions. [Use at your own risk.](https://github.com/Connectry-io/omnitrade-mcp/blob/main/LICENSE)

## 💬 What is OmniTrade?

OmniTrade is an [MCP](https://modelcontextprotocol.io/) server that lets you trade cryptocurrency using natural language through Claude. No more juggling exchange dashboards — just tell Claude what you want:

```
You: "What's my portfolio worth?"
Claude: Your portfolio across 2 exchanges is worth $12,456.78
        
        Binance: $8,234.56
        └── 0.15 BTC ($6,322.50)
        └── 2.5 ETH ($1,912.06)
        
        Coinbase: $4,222.22
        └── 100 SOL ($4,222.22)
```

```
You: "Buy $100 of ETH on the cheapest exchange"  
Claude: I found the best price for ETH:
        • Kraken: $765.20 (cheapest)
        • Binance: $765.89 (+0.09%)
        • Coinbase: $766.12 (+0.12%)
        
        ✅ Bought 0.1306 ETH on Kraken for $100.00
```

<br />

## ✨ Features

<table>
<tr>
<td width="50%">

### 🔗 107+ Exchanges
Connect to Binance, Coinbase, Kraken, and 104 more exchanges through [CCXT](https://github.com/ccxt/ccxt). One config, all exchanges.

### 💬 Natural Language
No commands to memorize. Just ask Claude in plain English. "Buy ETH", "Show my balance", "Find arbitrage opportunities".

### 📊 Portfolio Intelligence
Unified view of all holdings across exchanges. Track P&L over time, record snapshots, and see performance trends.

### 🔔 Price Alerts
Set alerts for any trading pair. Get notified when prices hit your targets. Works across all connected exchanges.

</td>
<td width="50%">

### 📈 DCA & Conditional Orders
Dollar-cost averaging with natural language: "Buy $10 of BTC every day". Conditional orders: "Buy ETH if it drops 5%".

### ⚡ Auto-Rebalancing
"Rebalance to 50% BTC, 30% ETH, 20% SOL" — Claude calculates and executes the trades to hit your targets.

### 📉 ASCII Price Charts
View price charts right in your conversation. 1h, 4h, 24h, 7d timeframes. No need to switch apps.

### 🔒 100% Local & Secure
Your API keys never leave your machine. No cloud, no telemetry, fully open source. Audit every line.

</td>
</tr>
</table>

<br />

## 🚀 Quick Start

### 1. Install

```bash
npm install -g omnitrade-mcp
```

### 2. Run the Setup Wizard

```bash
omnitrade setup
```

The interactive wizard walks you through everything in ~2 minutes:

- 🔑 Add your exchange API keys (Binance, Coinbase, Kraken, and more)
- 🔒 Configure security settings (order size limits, allowed pairs, testnet mode)
- 🖥️ Auto-configure **Claude Desktop** — writes to your config file automatically
- 💻 Optionally auto-configure **Claude Code** (terminal) — writes to `~/.claude/settings.json`

That's it. No manual JSON editing required.

### 3. Start Trading

Restart Claude Desktop (or reload Claude Code) and start chatting:

- *"What's my balance on Binance?"*
- *"Show me ETH prices across all exchanges"*
- *"Buy $50 of BTC on the cheapest exchange"*
- *"Are there any arbitrage opportunities?"*

<br />

## ⚙️ Manual Configuration

Prefer to configure manually? Add OmniTrade to your Claude config:

### Claude Desktop

<details>
<summary><b>macOS</b> — <code>~/Library/Application Support/Claude/claude_desktop_config.json</code></summary>

```json
{
  "mcpServers": {
    "omnitrade": {
      "command": "omnitrade",
      "args": ["start"]
    }
  }
}
```

</details>

<details>
<summary><b>Windows</b> — <code>%APPDATA%\Claude\claude_desktop_config.json</code></summary>

```json
{
  "mcpServers": {
    "omnitrade": {
      "command": "omnitrade",
      "args": ["start"]
    }
  }
}
```

</details>

### Claude Code (Terminal)

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "omnitrade": {
      "command": "omnitrade",
      "args": ["start"]
    }
  }
}
```

Then run `claude` in your terminal and OmniTrade will be available.

<br />

## 💡 Examples

### Portfolio Overview

```
You: "Show me my portfolio"

Claude: 📊 Portfolio Summary
        Total Value: $24,567.89
        
        ┌─────────────────────────────────────────┐
        │ Asset  │ Amount    │ Value      │ %     │
        ├─────────────────────────────────────────┤
        │ BTC    │ 0.3521    │ $14,821.42 │ 60.3% │
        │ ETH    │ 4.2100    │ $6,847.28  │ 27.9% │
        │ SOL    │ 28.5000   │ $2,899.19  │ 11.8% │
        └─────────────────────────────────────────┘
```

### Price Alerts

```
You: "Alert me when BTC drops below $40,000"

Claude: ✅ Price alert created
        
        📍 BTC/USDT on Binance
        🎯 Trigger: Below $40,000
        📊 Current: $42,156.78
        
        I'll let you know when it triggers!
```

### ASCII Charts

```
You: "Show me a 24h chart for ETH"

Claude: ETH/USDT — 24h Chart (Binance)
        
        $3,312 ┤                              ╭──
        $3,290 ┤                        ╭─────╯    
        $3,268 ┤              ╭────────╯           
        $3,245 ┤    ╭────────╯                      
        $3,223 ┼────╯                               
               └────────────────────────────────────
               00:00        12:00           23:59
        
        Open: $3,245.20 → Close: $3,312.50
        Change: ↑ +$67.30 (+2.07%)
```

### DCA Setup

```
You: "Set up DCA to buy $25 of BTC every week"

Claude: ✅ DCA Strategy Created
        
        📈 Asset: BTC/USDT
        💰 Amount: $25.00
        📅 Frequency: Weekly (every Monday)
        🏦 Exchange: Binance
        
        Next execution: Monday, Feb 24, 2025
```

### Auto-Rebalance

```
You: "Rebalance my portfolio to 50% BTC, 30% ETH, 20% SOL"

Claude: 📊 Rebalance Preview
        
        Current → Target:
        • BTC: 60.3% → 50.0% (sell $2,528.54)
        • ETH: 27.9% → 30.0% (buy $516.17)  
        • SOL: 11.8% → 20.0% (buy $2,012.37)
        
        Trades required:
        1. SELL 0.0601 BTC → $2,528.54
        2. BUY 0.3171 ETH ← $516.17
        3. BUY 19.79 SOL ← $2,012.37
        
        Shall I execute these trades?
```

### Arbitrage Detection

```
You: "Find arbitrage opportunities for BTC"

Claude: 🔍 Arbitrage Scan: BTC/USDT
        
        ✅ Opportunity Found!
        
        Buy on Kraken:   $42,150.00
        Sell on Binance: $42,298.00
        
        Spread: 0.35% ($148.00)
        After fees (~0.2%): ~$63.00 profit per BTC
        
        Want me to execute this?
```

<br />

## 🛠 Tools

OmniTrade provides **35 tools** organized by category:

<details>
<summary><b>Core Trading</b> — Balances, prices, orders</summary>

| Tool | Description |
|------|-------------|
| `get_balances` | Get balances from one or all exchanges |
| `get_portfolio` | Unified portfolio view with totals |
| `get_prices` | Current price for any trading pair |
| `compare_prices` | Find best price across all exchanges |
| `place_order` | Execute market or limit orders |
| `get_orders` | View open and recent orders |
| `cancel_order` | Cancel an open order |

</details>

<details>
<summary><b>Arbitrage</b> — Cross-exchange opportunities</summary>

| Tool | Description |
|------|-------------|
| `get_arbitrage` | Scan for arbitrage opportunities |
| `execute_arbitrage` | Execute arbitrage trades |
| `check_spread` | Check bid/ask spread on a pair |

</details>

<details>
<summary><b>Price Alerts</b> — Notifications & triggers</summary>

| Tool | Description |
|------|-------------|
| `set_price_alert` | Create price alerts (above/below) |
| `list_alerts` | View all alerts and their status |
| `check_alerts` | Check if any alerts triggered |
| `remove_alert` | Delete a specific alert |
| `clear_triggered_alerts` | Clear triggered alert history |

</details>

<details>
<summary><b>Charts & Analytics</b> — Visualization & tracking</summary>

| Tool | Description |
|------|-------------|
| `get_chart` | ASCII price charts (1h/4h/24h/7d) |
| `record_portfolio_snapshot` | Save current portfolio value |
| `get_portfolio_history` | View P&L over time |
| `clear_portfolio_history` | Reset portfolio history |

</details>

<details>
<summary><b>Portfolio Management</b> — Rebalancing</summary>

| Tool | Description |
|------|-------------|
| `rebalance_portfolio` | Calculate and execute rebalance |

</details>

<details>
<summary><b>DCA (Dollar Cost Averaging)</b> — Recurring buys</summary>

| Tool | Description |
|------|-------------|
| `setup_dca` | Create DCA strategy |
| `list_dca_configs` | View all DCA configurations |
| `execute_dca_orders` | Run pending DCA orders |
| `toggle_dca` | Enable/disable DCA configs |
| `remove_dca` | Delete DCA configuration |

</details>

<details>
<summary><b>Conditional Orders</b> — Price-triggered trades</summary>

| Tool | Description |
|------|-------------|
| `set_conditional_order` | Create conditional order |
| `list_conditional_orders` | View all conditional orders |
| `check_conditional_orders` | Check and execute conditions |
| `remove_conditional_order` | Delete conditional order |

</details>

<br />

## 🔒 Security

### Local-Only Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    YOUR MACHINE                          │
│                                                          │
│   ┌──────────┐         ┌─────────────────┐              │
│   │  Claude  │ ◄─────► │  OmniTrade MCP  │              │
│   └──────────┘   MCP   └────────┬────────┘              │
│                                 │                        │
│                        ~/.omnitrade/config.json          │
│                         (your keys, chmod 600)           │
│                                 │                        │
└─────────────────────────────────│────────────────────────┘
                                  │ HTTPS
                                  ▼
                    ┌─────────────────────────┐
                    │   Exchange APIs         │
                    │   (Binance, Coinbase,   │
                    │    Kraken, etc.)        │
                    └─────────────────────────┘
```

- ✅ **API keys stay on your machine** — Never sent anywhere else
- ✅ **No cloud storage** — Everything local
- ✅ **No telemetry** — Zero data collection
- ✅ **Open source** — [Audit the code yourself](https://github.com/Connectry-io/omnitrade-mcp)

### API Key Best Practices

<table>
<tr>
<td>

**✅ Always**
- Enable only View + Trade permissions
- Use IP restrictions when available
- Use testnet for testing first
- Set `chmod 600` on config file

</td>
<td>

**❌ Never**
- Enable withdrawal permissions
- Share your config file
- Commit config to git
- Skip testnet testing

</td>
</tr>
</table>

### Safety Settings

Configure trading limits in `~/.omnitrade/config.json`:

```json
{
  "security": {
    "maxOrderSize": 100,
    "allowedPairs": ["BTC/USDT", "ETH/USDT"],
    "testnetOnly": true,
    "confirmTrades": true
  }
}
```

<br />

## 🏦 Supported Exchanges

OmniTrade supports **107 exchanges** through [CCXT](https://github.com/ccxt/ccxt):

**Tier 1 (Certified)**
> Binance • Bybit • OKX • Gate.io • KuCoin • Bitget • HTX • Crypto.com • MEXC • WOO X • Hyperliquid

**Tier 2**
> Coinbase • Kraken • Bitstamp • Gemini • Bitfinex • Poloniex • Deribit • Upbit • Bithumb • Bitvavo

**+ 87 more** via [CCXT](https://github.com/ccxt/ccxt/wiki/Exchange-Markets)

<br />

## 🤝 Contributing

We love contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

```bash
# Clone the repo
git clone https://github.com/Connectry-io/omnitrade-mcp.git
cd omnitrade-mcp

# Install dependencies
npm install

# Build
npm run build

# Run locally
node dist/cli.js setup
```

<br />

## 📄 License

MIT © [Connectry Labs](https://connectry.io/labs)

<br />

## 🙏 Credits

- [CCXT](https://github.com/ccxt/ccxt) — Unified exchange library
- [Anthropic](https://anthropic.com) — Claude & MCP
- [Model Context Protocol](https://modelcontextprotocol.io/) — The protocol that makes this possible

<br />

---

## ⚠️ Disclaimer

OmniTrade is an experimental developer tool provided under the MIT License. It does not constitute financial advice, investment advice, or any other form of advice. **Connectry Labs is not a licensed financial advisor.** Cryptocurrency trading involves substantial risk of loss and is not appropriate for all investors.

- Past performance is not indicative of future results
- You are solely responsible for your trading decisions
- Always conduct your own research
- Consult a qualified financial advisor before investing
- Never trade more than you can afford to lose

OmniTrade is a project by [Connectry Labs](https://connectry.io/labs) — the innovation lab of [Connectry](https://connectry.io).

<br />

<p align="center">
  <sub>Built with ⚡ by <a href="https://connectry.io/labs">Connectry Labs</a></sub>
</p>

<p align="center">
  <a href="https://github.com/Connectry-io/omnitrade-mcp">GitHub</a> •
  <a href="https://www.npmjs.com/package/omnitrade-mcp">npm</a> •
  <a href="https://connectry.io/labs/omnitrade">Website</a>
</p>
