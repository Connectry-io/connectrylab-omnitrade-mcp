<p align="center">
  <br />
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Connectry-io/connectrylab-omnitrade-mcp/main/.github/assets/logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/Connectry-io/connectrylab-omnitrade-mcp/main/.github/assets/logo-light.svg">
    <img alt="OmniTrade" src="https://raw.githubusercontent.com/Connectry-io/connectrylab-omnitrade-mcp/main/.github/assets/logo-dark.svg" width="350">
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
  <a href="https://github.com/Connectry-io/connectrylab-omnitrade-mcp"><img src="https://img.shields.io/github/stars/Connectry-io/connectrylab-omnitrade-mcp?style=flat&colorA=18181B&colorB=28CF8D" alt="GitHub stars"></a>
  <a href="https://github.com/Connectry-io/connectrylab-omnitrade-mcp/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Connectry-io/connectrylab-omnitrade-mcp?style=flat&colorA=18181B&colorB=28CF8D" alt="License"></a>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-features">Features</a> •
  <a href="#-desktop-app">Desktop App</a> •
  <a href="#-examples">Examples</a> •
  <a href="#-tui-dashboard">Dashboard</a> •
  <a href="#-paper-trading">Paper Trading</a> •
  <a href="#-tools">Tools</a> •
  <a href="#-security">Security</a>
</p>

---

> ⚠️ **Disclaimer:** OmniTrade is a developer tool and does not constitute financial advice. Cryptocurrency trading involves substantial risk. Connectry Labs is not a licensed financial advisor. Always do your own research and consult a qualified financial advisor before making investment decisions. [Use at your own risk.](https://github.com/Connectry-io/connectrylab-omnitrade-mcp/blob/main/LICENSE)

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

### 📉 Rich Price Charts
View price charts right in your conversation. 1h, 4h, 24h, 7d timeframes. Returns rich **SVG charts** — full color, no need to switch apps.

### 🔒 100% Local & Secure
Your API keys never leave your machine. No cloud, no telemetry, fully open source. Audit every line.

</td>
</tr>
<tr>
<td width="50%">

### 🖥️ TUI Dashboard *(v0.9.0)*
Full-screen Bloomberg Terminal-style interface in your terminal. Live prices, interactive charts, and a live portfolio panel — all in one view. Run `omnitrade dashboard` to launch.

</td>
<td width="50%">

### 📝 Paper Trading *(v0.9.0)*
Practice risk-free with a virtual $10,000 USDT wallet. Buy and sell at live market prices, track your portfolio, review trade history, and reset anytime. No real funds, full real data.

</td>
</tr>
</table>

<br />

## 🖥️ Desktop App

OmniTrade ships a native desktop GUI built with Tauri — Dashboard, Prices, Portfolio, Alerts, DCA, and Settings in a standalone app.

### Download

| Platform | File | Notes |
|----------|------|-------|
| macOS | `.dmg` | Built automatically on each release |
| Windows | `.msi` / `.exe` | Built automatically on each release |
| Linux (portable) | `.AppImage` | Run without installing |
| Linux (Debian/Ubuntu) | `.deb` | `dpkg -i OmniTrade_*.deb` |
| Linux (RedHat/Fedora) | `.rpm` | `rpm -i OmniTrade-*.rpm` |

👉 **[Download from GitHub Releases](https://github.com/Connectry-io/connectrylab-omnitrade-mcp/releases)**

The desktop app reads your existing `~/.omnitrade/config.json` — no extra setup needed after running `omnitrade setup`.

---

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

### Paper Trading

```
You: "Buy 0.01 BTC in paper trading"

Claude: ✅ Paper Trade Executed
        
        📄 BUY 0.01 BTC
        💵 Price: $42,312.00
        💸 Cost: $423.12 USDT
        
        Virtual Portfolio:
        ┌──────────────────────────────────────────┐
        │ USDT    $9,576.88  (available)           │
        │ BTC     0.01000    ≈ $423.12             │
        └──────────────────────────────────────────┘
        Total Value: $10,000.00
```

```
You: "Show my paper trading portfolio"

Claude: 📝 Paper Portfolio
        
        ┌─────────────────────────────────────────────┐
        │ Asset  │ Amount    │ Value       │ P&L       │
        ├─────────────────────────────────────────────┤
        │ USDT   │ 9,076.88  │ $9,076.88   │ —        │
        │ BTC    │ 0.0200    │ $856.40     │ +$10.16  │
        │ ETH    │ 0.5000    │ $914.25     │ +$22.50  │
        └─────────────────────────────────────────────┘
        Total: $10,847.53  |  All-time P&L: +$847.53 (+8.5%)
```

### SVG Chart

```
You: "Show me a 24h chart for ETH"

Claude: [renders rich SVG chart]
        
        ETH/USDT — 24h Chart (Binance)
        Full-color candlestick chart with volume bars,
        gridlines, and price annotations.
        
        Open: $3,245.20 → Close: $3,312.50
        Change: ↑ +$67.30 (+2.07%)
```

<br />

## 🖥️ TUI Dashboard

Launch a full-screen Bloomberg Terminal-style interface directly in your terminal — live prices, charts, and your portfolio panel updating in real time.

```bash
omnitrade dashboard
```

The dashboard opens in full-screen and shows:

- **Live price ticker** — Watchlist of your configured pairs, updating every few seconds
- **Price chart panel** — Interactive candlestick chart for the selected pair (1h, 4h, 24h, 7d)
- **Portfolio panel** — Current holdings and real-time P&L across all connected exchanges

**Keyboard shortcuts:**

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate the watchlist |
| `1` `4` `D` `W` | Switch chart timeframe (1h / 4h / 24h / 7d) |
| `Tab` | Cycle between panels |
| `q` / `Ctrl+C` | Exit dashboard |

The dashboard reads from the same `~/.omnitrade/config.json` as the MCP server — no extra setup required.

<br />

## 📝 Paper Trading

Practice risk-free with a virtual wallet before committing real funds. Paper trading uses **live market prices** from your connected exchanges, so your results reflect what would actually happen.

**Starting balance:** $10,000 USDT

```bash
# Buy in paper mode
omnitrade paper buy BTC 0.01

# Sell in paper mode
omnitrade paper sell ETH 0.5

# View your virtual portfolio
omnitrade paper portfolio

# Review trade history
omnitrade paper history

# Reset back to $10,000 USDT
omnitrade paper reset
```

| Command | Description |
|---------|-------------|
| `omnitrade paper buy <ASSET> <AMOUNT>` | Buy at current live price, deducting from virtual USDT balance |
| `omnitrade paper sell <ASSET> <AMOUNT>` | Sell at current live price, crediting virtual USDT balance |
| `omnitrade paper portfolio` | Show all virtual holdings with live valuations and P&L |
| `omnitrade paper history` | View the full list of paper trades with timestamps and prices |
| `omnitrade paper reset` | Wipe trade history and reset balance to $10,000 USDT |

Paper trading state is stored locally in `~/.omnitrade/paper.json` — separate from your live trading config. It has no impact on real orders.

<br />

## 🖥 CLI Commands

OmniTrade ships with a standalone CLI for setup, monitoring, and background operation — separate from the MCP server that Claude uses.

### Daemon — Background Price Monitoring

The daemon runs in the background and fires notifications when your price alerts trigger, even when Claude isn't open.

```bash
# Start the background daemon
omnitrade daemon start

# Check if the daemon is running (shows PID, uptime, recent log)
omnitrade daemon status

# Stop the daemon
omnitrade daemon stop
```

| Command | Description |
|---------|-------------|
| `omnitrade daemon start` | Spawns the daemon as a detached background process. Writes a PID file to `~/.omnitrade/daemon.pid`. Logs to `~/.omnitrade/daemon.log`. |
| `omnitrade daemon status` | Shows whether the daemon is running, its PID, uptime, and the last 5 lines of the activity log. |
| `omnitrade daemon stop` | Sends SIGTERM to the daemon for a clean shutdown (waits up to 5s, then force-kills if needed). |

The daemon poll interval defaults to **60 seconds** and is configurable in `~/.omnitrade/config.json`:

```json
{
  "daemon": {
    "pollInterval": 30
  }
}
```

### Watch — Live Terminal Price Ticker

Stream live prices for one or more assets directly in your terminal. Updates every 5 seconds.

```bash
# Watch a single asset (defaults to USDT pair)
omnitrade watch BTC

# Watch multiple assets simultaneously
omnitrade watch BTC ETH SOL

# Watch full trading pairs
omnitrade watch BTC/USDT ETH/BTC SOL/ETH
```

The ticker auto-detects your configured exchange (falls back to public Binance data if no config exists). Each row shows the current price, direction indicator (▲ / ▼), and the change since the previous poll. If a symbol is **invalid or not available** on the exchange, the row is displayed in red with `⚠ INVALID` — it will never silently show `$0.00`.

Press **Ctrl+C** to exit the watch view cleanly.

### Setup — Interactive Configuration Wizard

Configure everything in ~2 minutes with the interactive setup wizard.

```bash
omnitrade setup
```

The wizard walks you through:

1. **Exchange API keys** — Binance, Coinbase, Kraken, and 104+ more
2. **Security settings** — order size limits, allowed pairs, testnet mode
3. **Notification channels** — choose how to receive price alerts:

| Channel | How to configure |
|---------|-----------------|
| **Native OS** | Zero setup — uses system notifications on macOS, Windows, and Linux |
| **Telegram** | Create a bot via [@BotFather](https://t.me/BotFather) → get the **Bot Token** (long string like `7481234567:AAHdqTcvCH1v...`), then get your **Chat ID** (numeric, from the getUpdates URL) |
| **Discord** | Create a webhook in your server's channel settings, paste the URL |

> **API key input:** Keys and secrets are masked as you type — nothing shown in plaintext in the terminal.

4. **Claude integration** — auto-writes to Claude Desktop config and optionally `~/.claude/settings.json` for Claude Code

You can re-run `omnitrade setup` at any time to update credentials or add new notification channels.

> **Tip:** Re-running setup won't wipe your existing config. It detects your current keys and lets you keep, update, or skip each exchange individually.

### Dashboard — Full-Screen TUI *(v0.9.0)*

Launch the Bloomberg Terminal-style interface with live prices, charts, and portfolio panel.

```bash
omnitrade dashboard
```

| Command | Description |
|---------|-------------|
| `omnitrade dashboard` | Opens the full-screen TUI. Press `q` or `Ctrl+C` to exit. No arguments required — reads your existing config. |

### Paper — Risk-Free Practice Trading *(v0.9.0)*

Trade against live prices using a virtual $10,000 USDT wallet. State persists between sessions.

```bash
# Buy and sell with virtual funds
omnitrade paper buy BTC 0.01
omnitrade paper sell ETH 0.5

# Review your positions and history
omnitrade paper portfolio
omnitrade paper history

# Start fresh
omnitrade paper reset
```

| Command | Description |
|---------|-------------|
| `omnitrade paper buy <ASSET> <AMOUNT>` | Buy at the current live price. Deducts USDT from virtual wallet. |
| `omnitrade paper sell <ASSET> <AMOUNT>` | Sell at the current live price. Credits USDT to virtual wallet. |
| `omnitrade paper portfolio` | Show all virtual holdings with live valuations and total P&L. |
| `omnitrade paper history` | List every paper trade with timestamp, price, and value at execution. |
| `omnitrade paper reset` | Reset virtual wallet to $10,000 USDT and clear trade history. |

<br />

## 🛠 Tools

OmniTrade provides **40 tools** organized by category:

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
| `get_chart` | Rich SVG price charts (1h/4h/24h/7d) |
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

<details>
<summary><b>Paper Trading</b> — Risk-free practice with live prices <em>(v0.9.0)</em></summary>

| Tool | Description |
|------|-------------|
| `paper_buy` | Buy an asset in the virtual wallet at the current live price |
| `paper_sell` | Sell an asset from the virtual wallet at the current live price |
| `get_paper_portfolio` | View virtual holdings, live valuations, and total P&L |
| `get_paper_history` | List all paper trades with timestamps and execution prices |
| `reset_paper_wallet` | Reset virtual wallet to $10,000 USDT and clear trade history |

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
- ✅ **Open source** — [Audit the code yourself](https://github.com/Connectry-io/connectrylab-omnitrade-mcp)

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
git clone https://github.com/Connectry-io/connectrylab-omnitrade-mcp.git
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
  <a href="https://github.com/Connectry-io/connectrylab-omnitrade-mcp">GitHub</a> •
  <a href="https://www.npmjs.com/package/omnitrade-mcp">npm</a> •
  <a href="https://connectry.io/labs/omnitrade">Website</a>
</p>
