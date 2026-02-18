# OmniTrade v0.9.4 — Full E2E Test Suite

> **For Claude Code execution.**  
> Run all commands from the repo root: `/root/clawd/connectry/omnitrade-mcp`  
> Command format: `node dist/cli.js <command>`  
> All expected output strings are stripped of ANSI color codes. Match on visible text only.

---

## SETUP BEFORE TESTING

```bash
# 1. Go to repo
cd /root/clawd/connectry/omnitrade-mcp

# 2. Verify build is current
node dist/cli.js version
# Expected: omnitrade v0.9.4

# 3. Back up existing wallet/config (so we can restore after tests)
cp ~/.omnitrade/config.json ~/.omnitrade/config.json.bak 2>/dev/null || true
cp ~/.omnitrade/paper-wallet.json ~/.omnitrade/paper-wallet.json.bak 2>/dev/null || true
```

---

## BLOCK 1 — VERSION & HELP

### TEST 1.1 — Version (all three flags)
```bash
node dist/cli.js version
node dist/cli.js --version
node dist/cli.js -v
```
**Expected (all three):** Exactly `omnitrade v0.9.4` — nothing else.

---

### TEST 1.2 — Help command
```bash
node dist/cli.js help
node dist/cli.js --help
node dist/cli.js -h
```
**Expected — ALL of the following strings must appear in the output:**
- `OMNITRADE` (block ASCII art, 6 rows)
- `v0.9.4` (version in subtitle line)
- `One AI. 107 Exchanges. Natural language trading.`
- `by Connectry Labs`
- `QUICK START`
- `omnitrade setup`
- `← 2-minute guided wizard`
- `COMMANDS`
- `setup`
- `start`
- `daemon start`
- `daemon stop`
- `daemon status`
- `watch`
- `dashboard`
- `paper buy BTC 0.01`
- `paper sell ETH 0.5`
- `paper portfolio`
- `paper history`
- `test`
- `config`
- `exchanges`
- `help`
- `WHAT YOU CAN DO`
- `Portfolio`
- `Prices`
- `Trading`
- `Analysis`
- `SECURITY`
- `Keys stored locally at`
- `~/.omnitrade/config.json`
- `Never transmitted anywhere`
- `LINKS`
- `github.com/Connectry-io/omnitrade-mcp`

**Also verify:** First 6 lines of output contain the block ASCII art. The left column of letters should have different coloring (purple) vs the rest (white/default). Look for the `█` block characters.

---

### TEST 1.3 — Unknown command
```bash
node dist/cli.js blah
node dist/cli.js foobar
```
**Expected:**
- Output contains: `Unknown: blah` (or `Unknown: foobar`)
- Output contains: `Run omnitrade help`
- Process exits (does not hang)

---

## BLOCK 2 — CONFIG

### TEST 2.1 — Config when no config file exists
```bash
rm -f ~/.omnitrade/config.json
node dist/cli.js config
```
**Expected:**
- Output contains: `No configuration`
- Output contains: `omnitrade setup`

---

### TEST 2.2 — Config when config exists
```bash
# Restore backup first
cp ~/.omnitrade/config.json.bak ~/.omnitrade/config.json
node dist/cli.js config
```
**Expected:**
- First line contains: `OmniTrade` + `v0.9.4` + `Connectry` (compact single-line logo)
- Output contains: `Config loaded`
- Output contains: `/root/.omnitrade/config.json`
- Output contains at least one exchange entry like: `• binance (live)` or `• binance (testnet)`

---

## BLOCK 3 — EXCHANGES LIST

### TEST 3.1 — List exchanges
```bash
node dist/cli.js exchanges
```
**Expected:**
- First line: compact logo (`OmniTrade  v0.9.4  • Connectry`)
- Output contains: `SUPPORTED EXCHANGES`
- Output contains: a number in parentheses like `(111)` — must be > 100
- Output contains: `★ TIER 1`
- TIER 1 includes: `binance, bybit, okx, gate, kucoin, bitget, htx, mexc, cryptocom, bitmex`
- Output contains: `★ TIER 2`
- TIER 2 includes: `coinbase, kraken, bitstamp, gemini, bitfinex, poloniex, deribit, upbit, bithumb, bitvavo`
- Output contains: `+ XX more...` where XX is a positive number

---

## BLOCK 4 — CONNECTION TEST

### TEST 4.1 — Test with no config
```bash
rm -f ~/.omnitrade/config.json
node dist/cli.js test
```
**Expected:**
- Output contains: `No configuration`
- Output contains: `omnitrade setup`

---

### TEST 4.2 — Test with live config (real API keys needed)
```bash
cp ~/.omnitrade/config.json.bak ~/.omnitrade/config.json
node dist/cli.js test
```
**Expected:**
- Compact logo on first line
- Output contains: `TESTING`
- For each configured exchange, output contains one of:
  - `binance ... ✓` followed by balance info like `BTC:0.001` OR `connected`
  - `binance ... ✗` followed by error message (max 40 chars)
- Process completes and exits (does not hang)
- **Note:** With testnet or fake keys, `✗` is expected. With real keys, `✓` expected.

---

## BLOCK 5 — WATCH (LIVE PRICES)

> **Note:** `watch` runs until Ctrl+C. For automated testing, run in background and kill after 12 seconds to observe at least 2 full render cycles (5s each).

### TEST 5.1 — Single valid symbol
```bash
timeout 12 node dist/cli.js watch BTC || true
```
**Expected output (strip ANSI, look for these strings):**
- `OmniTrade Watch`
- `binance` (exchange name in header)
- A time string like `7:46:46 PM`
- `BTC/USDT`
- A price like `$66,223.11` (dollar sign + numbers)
- Arrow character: `▲` OR `▼` OR `→`
- A percentage like `(+0.12%)` or `(-0.05%)`
- `Ctrl+C to stop`
- `Updates every 5s`
- Double-line border chars: `╔`, `╗`, `╚`, `╝`, `╠`, `╣`, `═`

**Verify:** The render repeats (screen clears and redraws). You should see the same structure appear at least twice in the raw output (look for `╔` appearing more than once).

---

### TEST 5.2 — Multiple valid symbols
```bash
timeout 12 node dist/cli.js watch BTC ETH SOL || true
```
**Expected:**
- All of: `BTC/USDT`, `ETH/USDT`, `SOL/USDT` appear in output
- Each has its own row with a price and arrow
- Three separate rows visible

---

### TEST 5.3 — Invalid symbol
```bash
timeout 12 node dist/cli.js watch FAKECOIN || true
```
**Expected:**
- `FAKECOIN/USDT` appears in output
- `⚠ INVALID` appears in the same row (red)
- `symbol not found on exchange` appears in the same row
- **Must NOT contain:** `$0.00` or `$0` as a price for FAKECOIN

---

### TEST 5.4 — Mixed valid and invalid symbols
```bash
timeout 12 node dist/cli.js watch BTC FAKECOIN ETH || true
```
**Expected:**
- `BTC/USDT` row with real price (e.g. `$66,000`)
- `FAKECOIN/USDT` row with `⚠ INVALID` + `symbol not found on exchange`
- `ETH/USDT` row with real price
- All three rows appear in the same render frame

---

### TEST 5.5 — No symbols provided
```bash
node dist/cli.js watch
```
**Expected:**
- Output contains: `No symbols specified`
- Output contains: `Usage:`
- Output contains: `omnitrade watch BTC ETH SOL`
- Process exits immediately (does not hang)

---

## BLOCK 6 — DAEMON

### TEST 6.1 — Status when daemon is running
```bash
node dist/cli.js daemon status
```
**Expected (if already running from earlier):**
- Compact logo on first line
- `Daemon: running`
- `PID:` followed by a number
- `Uptime:` followed by a duration like `18h 50m 5s` or `2m 14s`
- `Recent activity:` section
- Log lines like: `[2026-02-18T19:42:21.223Z] Poll complete — no active alerts`

---

### TEST 6.2 — Stop the daemon
```bash
node dist/cli.js daemon stop
```
**Expected:**
- Compact logo
- `Sent SIGTERM to PID` followed by the PID number
- `Daemon stopped cleanly` OR `Force-killed after 5s timeout`
- Process exits

---

### TEST 6.3 — Status after stop
```bash
node dist/cli.js daemon status
```
**Expected:**
- `Daemon: stopped`
- `Run omnitrade daemon start to restart` (or similar suggestion)
- **Must NOT contain:** `running`

---

### TEST 6.4 — Stop when already stopped
```bash
node dist/cli.js daemon stop
```
**Expected:**
- `Daemon is not running`
- Process exits cleanly

---

### TEST 6.5 — Start daemon
```bash
node dist/cli.js daemon start
```
**Expected:**
- Compact logo
- `Daemon started (PID` followed by a number and `)`
- `Log:` followed by a path like `/root/.omnitrade/daemon.log`
- `Polling alerts every 60s`
- Process exits (daemon runs in background)

**Verify daemon log exists:**
```bash
ls -la ~/.omnitrade/daemon.log
```
Expected: file exists, non-empty.

**Verify PID file exists:**
```bash
cat ~/.omnitrade/daemon.pid
```
Expected: contains a number (the PID).

---

### TEST 6.6 — Start when already running
```bash
node dist/cli.js daemon start
```
*(run immediately after 6.5)*  
**Expected:**
- `Daemon already running (PID` followed by the same PID number`)`
- `Run omnitrade daemon status for details`
- **Must NOT start a second daemon process**

---

### TEST 6.7 — Status after start
```bash
node dist/cli.js daemon status
```
**Expected:**
- `Daemon: running`
- PID matches what was shown in TEST 6.5
- Uptime shows a small value (just started)
- Recent activity shows log entries

---

## BLOCK 7 — PAPER TRADING

> **State note:** Paper wallet persists to `~/.omnitrade/paper-wallet.json`. Run TEST 7.1 (reset) first if you want a clean state.

### TEST 7.0 — Paper help (no subcommand)
```bash
node dist/cli.js paper
```
**Expected — ALL of these strings must appear:**
- `PAPER TRADING`
- `Risk-free trading with $10,000 virtual USDT`
- `Real prices from Binance public API. No keys needed.`
- `omnitrade paper buy BTC 0.01`
- `Buy 0.01 BTC at market`
- `omnitrade paper sell ETH 0.5`
- `Sell 0.5 ETH at market`
- `omnitrade paper portfolio`
- `Holdings + P&L`
- `omnitrade paper history`
- `Trade log`
- `omnitrade paper reset`
- `Start fresh with $10,000`
- `~/.omnitrade/paper-wallet.json`
- `Fees: 0.1% per trade`
- `Binance spot taker fee`

---

### TEST 7.1 — Reset wallet (clean state for testing)
```bash
echo "y" | node dist/cli.js paper reset
```
**Expected:**
- `Reset paper wallet? This clears all trades and restarts with $10,000 (y/N):`
- `Paper wallet reset to $10,000 USDT`

**Verify:**
```bash
cat ~/.omnitrade/paper-wallet.json
```
Expected: `"usdt": 10000` and `"holdings": {}` and `"trades": []`

---

### TEST 7.1b — Reset cancel
```bash
echo "n" | node dist/cli.js paper reset
```
**Expected:**
- `Reset cancelled.`
- Wallet file unchanged

---

### TEST 7.2 — Portfolio on fresh wallet
```bash
node dist/cli.js paper portfolio
```
**Expected:**
- `Fetching live prices...`
- `PAPER PORTFOLIO`
- `Total Value:  $10,000.00`
- `P&L:          $0.00 (0.00%)` — or equivalent zero P&L
- `USDT:         $10,000.00`
- `Started with: $10,000`
- `No holdings — use omnitrade paper buy BTC 0.01 to start`
- **Must NOT contain any holdings rows**

---

### TEST 7.3 — Buy BTC
```bash
node dist/cli.js paper buy BTC 0.01
```
**Expected:**
- `Fetching BTC price...`
- `✓ BUY EXECUTED`
- `Asset:     BTC`
- `Amount:    0.01`
- `Price:     $` followed by a number > 10000 (BTC price)
- `Cost:      $` followed by a number (0.01 * price) `+ $` followed by fee amount `fee`
- `Balance:   $` followed by remaining USDT (must be < $10,000)
- `ID:` followed by a trade ID string

---

### TEST 7.4 — Buy ETH
```bash
node dist/cli.js paper buy ETH 0.1
```
**Expected:**
- `✓ BUY EXECUTED`
- `Asset:     ETH`
- `Amount:    0.1`
- `Price:     $` followed by a number (ETH price, roughly $1000-$5000)
- `Cost:      $` followed by value `+ $` followed by fee `fee`
- `Balance:   $` followed by remaining USDT (less than after BTC buy)

---

### TEST 7.5 — Buy SOL
```bash
node dist/cli.js paper buy SOL 2
```
**Expected:**
- `✓ BUY EXECUTED`
- `Asset:     SOL`
- `Amount:    2`
- `Price:     $` followed by SOL price (roughly $50-$200)

---

### TEST 7.6 — Portfolio with holdings
```bash
node dist/cli.js paper portfolio
```
**Expected:**
- `Fetching live prices...`
- `PAPER PORTFOLIO`
- `Total Value:` followed by a dollar amount near $10,000 (slight P&L variance)
- `P&L:` followed by a dollar amount and percentage (may be positive or negative)
- `USDT:` followed by remaining cash balance
- `Started with: $10,000`
- Header row containing: `Asset`, `Amount`, `Price`, `Value`, `Avg Buy`, `P&L`, `Alloc`
- Row for `BTC` with amount `0.010000`, a price, a value, avg buy price, P&L, and allocation %
- Row for `ETH` with amount `0.100000`
- Row for `SOL` with amount `2.0000`
- All three assets visible

---

### TEST 7.7 — Sell partial (SOL)
```bash
node dist/cli.js paper sell SOL 1
```
**Expected:**
- `Fetching SOL price...`
- `✓ SELL EXECUTED`
- `Asset:     SOL`
- `Amount:    1`
- `Price:     $` followed by SOL price
- `Received:  $` followed by value `- $` followed by fee `= $` followed by net amount
- `Balance:   $` followed by updated USDT balance (higher than before)

---

### TEST 7.8 — Sell more than owned (should fail)
```bash
node dist/cli.js paper sell BTC 999
```
**Expected:**
- `Fetching BTC price...`
- `✗ Sell failed:` followed by an error message
- **Must NOT contain:** `✓ SELL EXECUTED`
- Wallet balance unchanged

---

### TEST 7.9 — Sell asset not held
```bash
node dist/cli.js paper sell DOGE 100
```
**Expected:**
- `Fetching DOGE price...`
- Either: `✗ Sell failed:` with error, OR the sell succeeds if DOGE price fetch fails
- **Must NOT silently succeed and deduct from USDT**

---

### TEST 7.10 — Trade history
```bash
node dist/cli.js paper history
```
**Expected:**
- `TRADE HISTORY`
- `(last X of X)` where X is the number of trades made (minimum 5: buy BTC, buy ETH, buy SOL, sell SOL, sell SOL partial)
- Header row: `Time`, `Side`, `Asset`, `Amount`, `Price`, `USDT Value`, `Fee`
- Trades listed in reverse-chronological order (most recent first)
- BUY trades labeled `BUY` 
- SELL trades labeled `SELL`
- Each row has: timestamp, side, asset name, numeric amount, price with `$`, USDT value with `$`, fee with `$`
- Footer: `Total trades: X  │  Wallet: ~/.omnitrade/paper-wallet.json`

---

### TEST 7.11 — Buy with missing amount arg
```bash
node dist/cli.js paper buy BTC
```
**Expected:**
- `Usage:` followed by `omnitrade paper buy <ASSET> <AMOUNT>`
- Example shown: `omnitrade paper buy BTC 0.01`
- **Must NOT execute a trade**

---

### TEST 7.12 — Buy with no args
```bash
node dist/cli.js paper buy
```
**Expected:**
- `Usage:` followed by `omnitrade paper buy <ASSET> <AMOUNT>`
- **Must NOT execute a trade**

---

### TEST 7.13 — Sell with missing args
```bash
node dist/cli.js paper sell ETH
node dist/cli.js paper sell
```
**Expected (both):**
- `Usage:` followed by `omnitrade paper sell <ASSET> <AMOUNT>`
- Example shown: `omnitrade paper sell ETH 0.5`

---

### TEST 7.14 — History when no trades
```bash
echo "y" | node dist/cli.js paper reset
node dist/cli.js paper history
```
**Expected:**
- `No trades yet. Use omnitrade paper buy BTC 0.01 to start.`

---

## BLOCK 8 — DAEMON SUBCOMMAND ERRORS

### TEST 8.1 — Unknown daemon subcommand
```bash
node dist/cli.js daemon foobar
```
**Expected:**
- `Unknown daemon subcommand: foobar`
- `Usage: omnitrade daemon start|stop|status`
- Process exits with non-zero code

---

## BLOCK 9 — MCP SERVER START

> **Note:** `omnitrade start` launches the MCP server which stays alive waiting for Claude. Run in background and capture stderr output for 3 seconds.

### TEST 9.1 — MCP server startup output
```bash
timeout 3 node dist/cli.js start 2>&1 || true
```
**Expected — ALL of these strings must appear (on stderr):**
- Block ASCII art (the `█` characters)
- `MCP Server v0.9.4`
- `One AI. 107 Exchanges. Natural language trading.`
- `by Connectry Labs`
- `Loading configuration...`
- `Initializing exchanges...`
- `Starting MCP server...`
- `✓ Core tools: get_balances, get_portfolio, get_prices, compare_prices, place_order, get_orders, cancel_order`
- `✓ Advanced tools: get_arbitrage, execute_arbitrage, check_spread`
- `✓ Alerts: set_price_alert, list_alerts, check_alerts, remove_alert, clear_triggered_alerts`
- `✓ Charts: get_chart`
- `✓ Portfolio: record_portfolio_snapshot, get_portfolio_history, clear_portfolio_history`
- `✓ Rebalance: rebalance_portfolio`
- `✓ DCA: setup_dca, list_dca_configs, execute_dca_orders, toggle_dca, remove_dca`
- `✓ Conditional: set_conditional_order, list_conditional_orders, check_conditional_orders, remove_conditional_order`
- `OmniTrade MCP server is ready!`
- `Waiting for Claude to connect via MCP...`

---

## BLOCK 10 — FILE SYSTEM STATE

### TEST 10.1 — Config file security
```bash
ls -la ~/.omnitrade/config.json
```
**Expected:**
- Permissions: `-rw-------` (600 — owner read/write only, no group/other access)
- File size > 0

### TEST 10.2 — Config file structure
```bash
cat ~/.omnitrade/config.json
```
**Expected:** Valid JSON containing:
- `"exchanges"` key with at least one exchange object
- Each exchange has `"apiKey"` and `"secret"` fields
- `"security"` key present

### TEST 10.3 — Paper wallet structure
```bash
cat ~/.omnitrade/paper-wallet.json
```
**Expected:** Valid JSON containing:
- `"version": 1`
- `"usdt"` — a number
- `"holdings"` — object
- `"trades"` — array
- `"createdAt"` — unix timestamp number

---

## TEARDOWN

```bash
# Restore original config and wallet
cp ~/.omnitrade/config.json.bak ~/.omnitrade/config.json 2>/dev/null || true
cp ~/.omnitrade/paper-wallet.json.bak ~/.omnitrade/paper-wallet.json 2>/dev/null || true

# Restart daemon (it was stopped during testing)
node dist/cli.js daemon start
```

---

## PASS/FAIL SUMMARY TABLE

| Block | Tests | Description |
|-------|-------|-------------|
| 1 | 1.1, 1.2, 1.3 | Version, Help, Unknown command |
| 2 | 2.1, 2.2 | Config display |
| 3 | 3.1 | Exchanges list |
| 4 | 4.1, 4.2 | Connection test |
| 5 | 5.1–5.5 | Live price watch |
| 6 | 6.1–6.7 | Daemon lifecycle |
| 7 | 7.0–7.14 | Paper trading |
| 8 | 8.1 | Daemon error handling |
| 9 | 9.1 | MCP server startup |
| 10 | 10.1–10.3 | File system state |

**Total: 32 tests**
