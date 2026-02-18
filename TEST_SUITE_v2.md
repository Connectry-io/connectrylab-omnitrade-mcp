# OmniTrade v0.9.4 — Complete E2E Test Guide

---

## PART 0 — INSTALL / UPGRADE

The tester must be on v0.9.4. Run this first:

```bash
npm install -g omnitrade-mcp@0.9.4
```

Verify it worked:
```bash
omnitrade --version
```
**Expected output:**
```
omnitrade v0.9.4
```

If `omnitrade` is not found after install, close and reopen your terminal (PATH refresh).

> **Note:** v0.3.0 only had `omnitrade-mcp` as the binary.  
> v0.9.4 adds `omnitrade` as the main command. Both work identically.

---

## PART 1 — TERMINAL TESTS (CLI)

All commands below are run directly in your terminal.  
No Claude needed. No API keys needed for most tests.

---

### 1.1 — VERSION

```bash
omnitrade --version
```
✅ Output is exactly: `omnitrade v0.9.4`

```bash
omnitrade -v
```
✅ Output is exactly: `omnitrade v0.9.4`

```bash
omnitrade version
```
✅ Output is exactly: `omnitrade v0.9.4`

```bash
omnitrade-mcp --version
```
✅ Output is exactly: `omnitrade v0.9.4`  
(both binary names point to the same file)

---

### 1.2 — HELP

```bash
omnitrade help
```

✅ Big block ASCII art banner appears (purple left column, white letters)  
✅ Subtitle reads: `v0.9.4  •  One AI. 107 Exchanges. Natural language trading.`  
✅ `by Connectry Labs  •  https://connectry.io`  
✅ Section headings visible: `QUICK START`, `COMMANDS`, `WHAT YOU CAN DO`, `SECURITY`, `LINKS`  
✅ Every command listed: `setup`, `start`, `daemon start`, `daemon stop`, `daemon status`, `watch`, `dashboard`, `paper buy`, `paper sell`, `paper portfolio`, `paper history`, `test`, `config`, `exchanges`, `help`  
✅ Security section says: `Keys stored locally at ~/.omnitrade/config.json`  
✅ Links section shows: `github.com/Connectry-io/omnitrade-mcp`

---

### 1.3 — UNKNOWN COMMAND

```bash
omnitrade blah
```
✅ Output contains: `Unknown: blah`  
✅ Output contains: `Run omnitrade help`

---

### 1.4 — EXCHANGES LIST

```bash
omnitrade exchanges
```
✅ First line: `o-o OmniTrade v0.9.4 • Connectry` (compact logo)  
✅ Shows: `SUPPORTED EXCHANGES (111)` — number must be > 100  
✅ `★ TIER 1` row lists: `binance, bybit, okx, gate, kucoin, bitget, htx, mexc, cryptocom, bitmex`  
✅ `★ TIER 2` row lists: `coinbase, kraken, bitstamp, gemini, bitfinex, poloniex, deribit, upbit, bithumb, bitvavo`  
✅ Shows: `+ 91 more...`

---

### 1.5 — CONFIG (no config)

```bash
rm -f ~/.omnitrade/config.json
omnitrade config
```
✅ Output contains: `No configuration`  
✅ Output contains: `omnitrade setup`

---

### 1.6 — SETUP WIZARD

```bash
omnitrade setup
```

Step through the wizard:

1. Banner appears → press **Enter**
2. Exchange list shows `[1] Binance` through `[12]` + `[13] Other` + `[14] List all`  
   → Type `1` and press **Enter** (select Binance)
3. Binance instructions appear with URL: `https://www.binance.com/en/my/settings/api-management`  
   → Security warning box appears (orange ⚠)  
   → Press **Enter**
4. Enter credentials:  
   - `API Key:` → type `TESTKEY12345` and press Enter  
   - `Secret:` → type `TESTSECRET67890` and press Enter  
   - `Use testnet? (y/N):` → type `y` and press Enter
5. Notifications screen:  
   → Type `0` (skip) and press Enter
6. `✓ 1 EXCHANGE CONFIGURED` appears
7. `Auto-configure Claude Desktop? (Y/n):` → type `n`  
8. `Also configure Claude Code (terminal)? (Y/n):` → type `n`

✅ `✓ 1 EXCHANGE CONFIGURED` shown  
✅ Config saved — verify: `cat ~/.omnitrade/config.json`  
✅ File contains `"binance"` with `"apiKey": "TESTKEY12345"` and `"testnet": true`  
✅ File permissions are 600: `ls -la ~/.omnitrade/config.json` shows `-rw-------`

**Also test "List all" in setup:**
```bash
omnitrade setup
```
→ At exchange selection, type `14` and press Enter  
✅ Shows `ALL 107 SUPPORTED EXCHANGES` section  
✅ Groups listed: `Major:`, `Popular:`, `Futures:`, `DEX:`  
✅ After pressing Enter, wizard restarts at exchange selection

---

### 1.7 — CONFIG (after setup)

```bash
omnitrade config
```
✅ Compact logo on first line  
✅ `✓ Config loaded /root/.omnitrade/config.json` (or your home path)  
✅ Shows: `• binance (testnet)` (yellow label since we chose testnet)

---

### 1.8 — CONNECTION TEST

```bash
omnitrade test
```
With fake keys from setup:  
✅ Compact logo on first line  
✅ Shows: `TESTING`  
✅ Shows: `binance ...` then `✗` followed by an error message (max 40 chars, cut off)  
✅ Process exits cleanly (does not hang)

---

### 1.9 — WATCH (live prices — no API keys needed)

**Single valid symbol:**
```bash
omnitrade watch BTC
```
*(Press Ctrl+C to exit after 10 seconds)*

✅ Full-screen TUI renders immediately  
✅ Border uses double-line chars: `╔══╗`, `╠══╣`, `╚══╝`  
✅ Header shows: `OmniTrade Watch  •  binance  •  [current time]`  
✅ Row shows: `BTC/USDT` with a real price like `$66,223.11`  
✅ Arrow shows direction: `▲` (green) or `▼` (red) or `→` (gray)  
✅ After ~5 seconds screen refreshes and price may change  
✅ Footer shows: `Ctrl+C to stop  •  Updates every 5s`  
✅ Ctrl+C exits cleanly, shows: `✓ Watch stopped`

---

**Invalid symbol:**
```bash
omnitrade watch FAKECOIN
```
*(Press Ctrl+C after 6 seconds)*

✅ Row shows: `FAKECOIN/USDT`  
✅ Row shows: `⚠ INVALID` in red  
✅ Row shows: `symbol not found on exchange` in red  
✅ Does NOT show `$0.00` or any price — only the error text

---

**Mixed valid + invalid:**
```bash
omnitrade watch BTC FAKECOIN ETH
```
*(Press Ctrl+C after 6 seconds)*

✅ `BTC/USDT` row has real price  
✅ `FAKECOIN/USDT` row shows `⚠ INVALID`  
✅ `ETH/USDT` row has real price  
✅ All three rows visible simultaneously

---

**No symbols:**
```bash
omnitrade watch
```
✅ Output: `No symbols specified`  
✅ Output: `Usage: omnitrade watch BTC ETH SOL`  
✅ Exits immediately (no hang)

---

### 1.10 — DAEMON

**Start:**
```bash
omnitrade daemon start
```
✅ Output: `✓ Daemon started (PID 12345)` — PID is a real number  
✅ Output: `Log: /root/.omnitrade/daemon.log`  
✅ Output: `Polling alerts every 60s`  
✅ Process exits (you get your prompt back — daemon runs in background)  
✅ Verify log file exists: `ls -la ~/.omnitrade/daemon.log`  
✅ Verify PID file exists: `cat ~/.omnitrade/daemon.pid`

---

**Status (running):**
```bash
omnitrade daemon status
```
✅ `● Daemon: running` (green dot)  
✅ `PID: 12345` (matches the PID from daemon start)  
✅ `Uptime: Xm Xs` or `Xh Xm Xs`  
✅ `Recent activity:` section  
✅ Log lines like: `[2026-02-18T19:42:21.223Z] Poll complete — no active alerts`

---

**Start when already running:**
```bash
omnitrade daemon start
```
✅ `⚠ Daemon already running (PID 12345)`  
✅ `Run omnitrade daemon status for details`  
✅ Does NOT start a second daemon

---

**Stop:**
```bash
omnitrade daemon stop
```
✅ `Sent SIGTERM to PID 12345`  
✅ `Daemon stopped cleanly`  
✅ PID file is cleaned up: `cat ~/.omnitrade/daemon.pid` → file not found or empty

---

**Status (stopped):**
```bash
omnitrade daemon status
```
✅ `● Daemon: stopped`  
✅ `Run omnitrade daemon start to restart`  
✅ Does NOT say `running`

---

**Stop when already stopped:**
```bash
omnitrade daemon stop
```
✅ `⚠ Daemon is not running`

---

**Unknown subcommand:**
```bash
omnitrade daemon foobar
```
✅ `Unknown daemon subcommand: foobar`  
✅ `Usage: omnitrade daemon start|stop|status`

---

### 1.11 — PAPER TRADING (no API keys — uses public Binance prices)

**Step 1 — Reset to clean state:**
```bash
omnitrade paper reset
```
→ Type `y` and press Enter  
✅ `⚠ Reset paper wallet? This clears all trades and restarts with $10,000 (y/N):`  
✅ `Paper wallet reset to $10,000 USDT`

Verify: `cat ~/.omnitrade/paper-wallet.json`  
✅ File contains `"usdt": 10000`  
✅ File contains `"holdings": {}`  
✅ File contains `"trades": []`

---

**Cancel reset:**
```bash
omnitrade paper reset
```
→ Type `n` and press Enter  
✅ `Reset cancelled.`

---

**Paper help:**
```bash
omnitrade paper
```
✅ `PAPER TRADING`  
✅ `Risk-free trading with $10,000 virtual USDT`  
✅ `Real prices from Binance public API. No keys needed.`  
✅ All commands listed: `buy`, `sell`, `portfolio`, `history`, `reset`  
✅ `~/.omnitrade/paper-wallet.json`  
✅ `Fees: 0.1% per trade (matches Binance spot taker fee)`

---

**Empty portfolio:**
```bash
omnitrade paper portfolio
```
✅ `Fetching live prices...`  
✅ `PAPER PORTFOLIO`  
✅ `Total Value:  $10,000.00`  
✅ `P&L:` shows `$0.00` or near-zero amount `(0.00%)`  
✅ `USDT:         $10,000.00`  
✅ `Started with: $10,000`  
✅ `No holdings — use omnitrade paper buy BTC 0.01 to start`

---

**Buy BTC:**
```bash
omnitrade paper buy BTC 0.01
```
✅ `Fetching BTC price...`  
✅ `✓ BUY EXECUTED`  
✅ `Asset:     BTC`  
✅ `Amount:    0.01`  
✅ `Price:     $XX,XXX.XX` (a number greater than $10,000)  
✅ `Cost:      $XXX.XX + $X.XX fee` (cost = 0.01 × price, fee = cost × 0.001)  
✅ `Balance:   $X,XXX.XX USDT remaining` (must be less than $10,000)  
✅ `ID:` followed by a trade ID string (alphanumeric)

---

**Buy ETH:**
```bash
omnitrade paper buy ETH 0.1
```
✅ `✓ BUY EXECUTED`  
✅ `Asset:     ETH`  
✅ `Amount:    0.1`  
✅ `Price:     $X,XXX.XX` (roughly $1,500–$5,000 range)  
✅ `Balance:` lower than after BTC buy

---

**Buy SOL:**
```bash
omnitrade paper buy SOL 2
```
✅ `✓ BUY EXECUTED`  
✅ `Asset:     SOL`  
✅ `Amount:    2`  
✅ `Price:     $XX.XX` (roughly $80–$200 range)

---

**Portfolio with holdings:**
```bash
omnitrade paper portfolio
```
✅ `Fetching live prices...`  
✅ `PAPER PORTFOLIO`  
✅ `Total Value:` near $10,000 (slight P&L variance)  
✅ `P&L:` shows dollar amount and percentage (may be `+` or `-`)  
✅ `USDT:` shows remaining cash (less than $10,000)  
✅ Column headers: `Asset  Amount  Price  Value  Avg Buy  P&L  Alloc`  
✅ Row for `BTC` with `0.010000` amount, live price, value, avg buy price, P&L with `%`, allocation `%`  
✅ Row for `ETH` with `0.100000` amount  
✅ Row for `SOL` with `2.0000` amount

---

**Sell partial (sell 1 SOL, keeping the other):**
```bash
omnitrade paper sell SOL 1
```
✅ `Fetching SOL price...`  
✅ `✓ SELL EXECUTED`  
✅ `Asset:     SOL`  
✅ `Amount:    1`  
✅ `Price:     $XX.XX`  
✅ `Received:  $XX.XX - $X.XXXX fee = $XX.XX` (value minus fee = net)  
✅ `Balance:   $X,XXX.XX USDT` (higher than before the sell)

---

**Sell more than you own (should fail):**
```bash
omnitrade paper sell BTC 999
```
✅ `Fetching BTC price...`  
✅ `✗ Sell failed:` followed by an error message  
✅ Does NOT show `✓ SELL EXECUTED`  
✅ BTC balance unchanged (verify with `paper portfolio`)

---

**Buy with missing amount:**
```bash
omnitrade paper buy BTC
```
✅ `Usage: omnitrade paper buy <ASSET> <AMOUNT>`  
✅ `Example: omnitrade paper buy BTC 0.01`  
✅ No trade executed

---

**Sell with missing args:**
```bash
omnitrade paper sell ETH
```
✅ `Usage: omnitrade paper sell <ASSET> <AMOUNT>`  
✅ `Example: omnitrade paper sell ETH 0.5`  
✅ No trade executed

---

**Trade history:**
```bash
omnitrade paper history
```
✅ `TRADE HISTORY`  
✅ Shows `(last X of X)` — X should be at least 4 (3 buys + 1 sell from above)  
✅ Column headers: `Time  Side  Asset  Amount  Price  USDT Value  Fee`  
✅ Most recent trade at the top  
✅ BUY trades show `BUY` label  
✅ SELL trades show `SELL` label  
✅ Each row has: timestamp like `02/18/2026, 19:41:34`, side, asset, amount, price with `$`, USDT value with `$`, fee with `$`  
✅ Footer: `Total trades: X  │  Wallet: ~/.omnitrade/paper-wallet.json`

---

**History when no trades:**
```bash
omnitrade paper reset  # type y
omnitrade paper history
```
✅ `No trades yet. Use omnitrade paper buy BTC 0.01 to start.`

---

### 1.12 — MCP SERVER STARTUP

```bash
omnitrade start
```
*(This stays running — press Ctrl+C after reading the output)*

✅ Block ASCII banner prints to screen  
✅ `MCP Server v0.9.4`  
✅ `Loading configuration...`  
✅ `Initializing exchanges...`  
✅ `Starting MCP server...`  
✅ All tool lines:
```
✓ Core tools: get_balances, get_portfolio, get_prices, compare_prices, place_order, get_orders, cancel_order
✓ Advanced tools: get_arbitrage, execute_arbitrage, check_spread
✓ Alerts: set_price_alert, list_alerts, check_alerts, remove_alert, clear_triggered_alerts
✓ Charts: get_chart
✓ Portfolio: record_portfolio_snapshot, get_portfolio_history, clear_portfolio_history
✓ Rebalance: rebalance_portfolio
✓ DCA: setup_dca, list_dca_configs, execute_dca_orders, toggle_dca, remove_dca
✓ Conditional: set_conditional_order, list_conditional_orders, check_conditional_orders, remove_conditional_order
```
✅ `✅ OmniTrade MCP server is ready!`  
✅ `Waiting for Claude to connect via MCP...`  
✅ Process stays alive (does not exit on its own)

---

## PART 2 — CLAUDE TESTS (MCP)

These tests require OmniTrade connected to Claude Desktop or Claude Code.

---

### SETUP: Connect to Claude

**Claude Desktop (Mac):**
```bash
omnitrade setup
```
→ Go through wizard, at the end choose `Y` for "Auto-configure Claude Desktop"  
→ Choose `Y` for "Restart Claude Desktop"

**Claude Code (terminal):**
```bash
omnitrade setup
```
→ Go through wizard, at the end choose `Y` for "Also configure Claude Code"

**Manual (if auto fails):**  
Open `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac) and add:
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
Restart Claude Desktop.

**Verify connection:**  
In Claude, type: `What MCP tools do you have available?`  
✅ Claude should list omnitrade tools like `get_prices`, `get_balances`, `set_price_alert`, etc.

---

### 2.1 — PRICE QUERIES

**Prompt:**
```
What's the current BTC price?
```
✅ Claude calls `get_prices` tool  
✅ Returns a price like `$66,223.11`  
✅ Mentions the exchange (e.g. Binance)  
✅ No error message

---

**Prompt:**
```
What are BTC, ETH and SOL trading at right now?
```
✅ Claude calls `get_prices` with multiple symbols  
✅ Returns prices for all three in one response  
✅ Prices are realistic (BTC >$10k, ETH >$500, SOL >$20)

---

**Prompt:**
```
Compare the ETH price across all my configured exchanges
```
✅ Claude calls `compare_prices`  
✅ Returns ETH price per exchange  
✅ If only one exchange configured, says so

---

### 2.2 — BALANCE / PORTFOLIO

> **Note:** With fake/testnet keys these will return errors. If you have real keys, expect real data.

**Prompt:**
```
What's my portfolio worth?
```
✅ Claude calls `get_portfolio` or `get_balances`  
✅ With real keys: returns holdings and USD value  
✅ With fake keys: returns a clear error like `Authentication failed` — not a crash

---

**Prompt:**
```
Show my Binance balance
```
✅ Claude calls `get_balances` with exchange `binance`  
✅ With real keys: lists all non-zero balances  
✅ With fake keys: returns auth error message

---

### 2.3 — PRICE ALERTS

**Prompt:**
```
Alert me when BTC goes above $100,000
```
✅ Claude calls `set_price_alert`  
✅ Returns confirmation like: `Alert set: BTC above $100,000`  
✅ Alert is saved locally

---

**Prompt:**
```
Alert me when ETH drops below $1,000
```
✅ Claude calls `set_price_alert`  
✅ Returns confirmation: `Alert set: ETH below $1,000`

---

**Prompt:**
```
What price alerts do I have set?
```
✅ Claude calls `list_alerts`  
✅ Shows both alerts just set  
✅ Each alert shows: asset, condition (above/below), target price

---

**Prompt:**
```
Remove my ETH alert
```
✅ Claude calls `remove_alert`  
✅ Returns confirmation that alert was removed  
✅ Verify: ask `list alerts` again, ETH alert should be gone

---

**Prompt:**
```
Check if any of my alerts have triggered
```
✅ Claude calls `check_alerts`  
✅ Returns either "no alerts triggered" or lists triggered ones  
✅ No error

---

### 2.4 — ORDERS (view only, no real trading)

> Use with real keys for live data, or expect auth error with fake keys.

**Prompt:**
```
What are my open orders on Binance?
```
✅ Claude calls `get_orders`  
✅ With real keys: lists open orders or "no open orders"  
✅ With fake keys: returns auth error, not a crash

---

### 2.5 — ARBITRAGE

**Prompt:**
```
Is there any arbitrage opportunity for BTC right now?
```
✅ Claude calls `get_arbitrage` or `check_spread`  
✅ Returns spread data between configured exchanges  
✅ With one exchange: says insufficient exchanges for arbitrage  
✅ With multiple exchanges: shows price differences and potential spread %

---

### 2.6 — CHARTS

**Prompt:**
```
Show me a BTC price chart
```
✅ Claude calls `get_chart`  
✅ Returns ASCII chart or description of price movement  
✅ Shows OHLCV data or candlestick representation  
✅ No error

---

### 2.7 — DCA (Dollar Cost Averaging)

**Prompt:**
```
Set up a DCA strategy to buy $50 of BTC every week
```
✅ Claude calls `setup_dca`  
✅ Returns confirmation with DCA config summary  
✅ Shows: asset (BTC), amount ($50), frequency (weekly)

---

**Prompt:**
```
Show my DCA configurations
```
✅ Claude calls `list_dca_configs`  
✅ Shows the BTC DCA just configured  
✅ Shows: asset, amount, frequency, enabled status

---

**Prompt:**
```
Disable my BTC DCA
```
✅ Claude calls `toggle_dca`  
✅ Returns confirmation: DCA disabled  
✅ Verify with `list DCA configs` — shows disabled

---

### 2.8 — CONDITIONAL ORDERS

**Prompt:**
```
Set a conditional order: if BTC drops below $60,000, buy $100 worth
```
✅ Claude calls `set_conditional_order`  
✅ Returns confirmation with order details  
✅ Shows: condition (BTC < $60k), action (buy $100)

---

**Prompt:**
```
Show my conditional orders
```
✅ Claude calls `list_conditional_orders`  
✅ Shows the order just set  
✅ Shows trigger condition and action

---

### 2.9 — PORTFOLIO REBALANCING

**Prompt:**
```
Rebalance my portfolio to 60% BTC, 40% ETH
```
✅ Claude calls `rebalance_portfolio`  
✅ With real keys + balance: shows current allocation vs target + trade plan  
✅ With fake/empty keys: returns auth error or "insufficient balance", not a crash

---

### 2.10 — PORTFOLIO HISTORY

**Prompt:**
```
Take a snapshot of my portfolio right now
```
✅ Claude calls `record_portfolio_snapshot`  
✅ Returns confirmation snapshot recorded with timestamp

---

**Prompt:**
```
Show my portfolio performance history
```
✅ Claude calls `get_portfolio_history`  
✅ Shows snapshots taken (at least the one just recorded)  
✅ Shows portfolio value at each snapshot time

---

### 2.11 — NATURAL LANGUAGE EDGE CASES

**Prompt:**
```
What's FAKECOIN trading at?
```
✅ Claude calls `get_prices` with an invalid symbol  
✅ Returns a clear error: symbol not found or not supported  
✅ Does NOT return `$0` as a price  
✅ Does NOT crash

---

**Prompt:**
```
Buy 1 BTC
```
*(With safety limit of $100 max order in config)*  
✅ Claude calls `place_order`  
✅ Returns error: order size exceeds maximum limit ($100)  
✅ Does NOT execute the order  
✅ Explains the safety limit

---

## PASS / FAIL LOG

Fill this in as you test:

| Test | Description | Pass/Fail | Notes |
|------|-------------|-----------|-------|
| 0 | npm install -g omnitrade-mcp@0.9.4 | | |
| 1.1 | version flags | | |
| 1.2 | help banner | | |
| 1.3 | unknown command | | |
| 1.4 | exchanges list | | |
| 1.5 | config (no file) | | |
| 1.6 | setup wizard | | |
| 1.7 | config (with file) | | |
| 1.8 | connection test | | |
| 1.9a | watch BTC | | |
| 1.9b | watch FAKECOIN | | |
| 1.9c | watch BTC FAKECOIN ETH | | |
| 1.9d | watch (no args) | | |
| 1.10a | daemon start | | |
| 1.10b | daemon status | | |
| 1.10c | daemon start (duplicate) | | |
| 1.10d | daemon stop | | |
| 1.10e | daemon status (stopped) | | |
| 1.10f | daemon stop (already stopped) | | |
| 1.11a | paper reset | | |
| 1.11b | paper portfolio (empty) | | |
| 1.11c | paper buy BTC 0.01 | | |
| 1.11d | paper buy ETH 0.1 | | |
| 1.11e | paper buy SOL 2 | | |
| 1.11f | paper portfolio (with holdings) | | |
| 1.11g | paper sell SOL 1 | | |
| 1.11h | paper sell BTC 999 (over limit) | | |
| 1.11i | paper buy BTC (no amount) | | |
| 1.11j | paper history | | |
| 1.12 | MCP server startup | | |
| 2.1 | Claude: BTC price | | |
| 2.2 | Claude: portfolio/balance | | |
| 2.3 | Claude: price alerts | | |
| 2.4 | Claude: open orders | | |
| 2.5 | Claude: arbitrage | | |
| 2.6 | Claude: charts | | |
| 2.7 | Claude: DCA setup | | |
| 2.8 | Claude: conditional orders | | |
| 2.9 | Claude: rebalance | | |
| 2.10 | Claude: portfolio history | | |
| 2.11a | Claude: invalid symbol | | |
| 2.11b | Claude: order over safety limit | | |
