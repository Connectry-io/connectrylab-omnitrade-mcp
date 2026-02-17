# OmniTrade Roadmap

> Parked 2026-02-17. Revisit when ready to invest further.

---

## Vision

OmniTrade started as a showcase/experiment. With the right enhancements, it becomes a legitimate downloadable product — the "Bloomberg Terminal lite" for retail crypto traders powered by Claude.

---

## Phase 1 — Make It Feel Alive (Weeks 1–2)

### 1. Background Daemon (foundational prerequisite for everything below)

**Why:** Currently OmniTrade is purely on-demand — Claude calls a tool, gets a result, conversation ends, nothing persists. A daemon unlocks real alerts, live tickers, and scheduled DCA.

**Commands:**
```bash
omnitrade daemon start    # run in background
omnitrade daemon stop
omnitrade daemon status
```

**Prerequisites:** None beyond existing codebase. Store PID file, poll exchanges on schedule.

---

### 2. `omnitrade watch` — Live Terminal Price Ticker

**Why:** Instantly makes the product feel alive. Great for screenshots, demos, social posts.

**What it does:** Real-time price feed in the terminal. ETH, BTC, SOL updating every few seconds with green/red color. Run standalone, no Claude needed.

```bash
omnitrade watch BTC ETH SOL
```

**Prerequisites:**
- Polling loop (REST is fine, no WebSocket needed)
- Terminal color library (likely already present)
- Graceful Ctrl+C handling

**Effort:** 1–2 days

---

### 3. Real Alerts via Telegram

**Why:** Right now "I'll alert you when BTC drops" is a lie — Claude forgets the moment the conversation ends. Real notifications = real utility = users who depend on it daily.

**Setup via wizard:**
```
omnitrade setup
? Also set up Telegram alerts? (Y/n)
  → Message @BotFather, create a bot, paste token here
  → Send /start to your bot to get your chat ID
  ✓ Telegram configured!
```

**Prerequisites:**
- Telegram Bot token (free, 5 min setup via @BotFather)
- `node-telegram-bot-api` npm package
- Daemon (above) to actually monitor and fire alerts

**Effort:** 2–3 days (1 day if daemon already built)

---

## Phase 2 — Make It Impressive (Weeks 3–4)

### 4. Paper Trading Mode

**Why:** Biggest adoption blocker right now is needing real API keys and real money to see anything. Paper trading = anyone can try OmniTrade in 60 seconds.

```bash
omnitrade setup --paper   # no API keys needed
```

**What it does:** Simulates trades against real live prices. Tracks a virtual portfolio. Full P&L history.

**Prerequisites:**
- Virtual wallet JSON store (`~/.omnitrade/paper-wallet.json`)
- Order simulation engine (buy/sell against real prices via CCXT)
- P&L tracker
- No external deps needed

**Effort:** 2–3 days

---

### 5. `omnitrade dashboard` — TUI (Terminal UI)

**Why:** The "wow" moment. Full-screen terminal dashboard — portfolio breakdown, live prices, recent trades, P&L — like a Bloomberg Terminal. Screenshots beautifully for press/social.

**Prerequisites:**
- `blessed-contrib` npm package (terminal charts, tables, grids — industry standard)
- Daemon/polling architecture (Phase 1)

**Effort:** 3–4 days

---

### 6. SVG Charts Returned to Claude

**Why:** Instead of ASCII art, return proper SVG charts that Claude renders inline. Makes "Show me ETH chart" genuinely impressive.

**Prerequisites:**
- Pure SVG math (no extra deps — can hand-write path data)
- MCP resource response type support (verify current implementation)

**Effort:** 1–2 days

---

## Phase 3 — Make It a Product (Month 2+)

### 7. Downloadable Desktop App (Tauri)

**Why:** Right now getting OmniTrade running requires npm, terminal, JSON editing. A downloadable app opens it to non-developers — completely different (and much larger) market.

**What it is:** Native `.dmg` (Mac) + `.exe/.msi` (Windows) desktop app:
- Portfolio dashboard with real charts
- Live price ticker
- Native OS notifications for alerts
- Settings UI for exchange API keys (no JSON editing)
- Bundles the MCP server (no npm install needed at all)
- Auto-updater built in

**Why Tauri over Electron:**
- Bundle size: ~8MB vs Electron's ~150MB
- Native OS feel
- TypeScript/web frontend (reuse existing code)
- Auto-updater built in
- What modern apps use (Zed editor, etc.)

**Menu bar / System Tray version (simpler first step):**
- Portfolio value + 24h change in menu bar
- Native alert popups when prices hit targets
- Click → open mini-dashboard
- Could build this version in a weekend with Electron

**Prerequisites:**
- Rust (for Tauri — one-time install)
- Tauri CLI
- Dashboard UI (React or vanilla)
- Existing TypeScript core is mostly reusable

**Effort:** 2–3 weeks for a solid v1

---

## Monetization Strategy

### Immediate (zero extra work)
- **Exchange referral commissions** — Binance, Coinbase, Kraken all pay 20–40% of trading fees for referred users. Add referral links to the setup wizard. Passive income at scale.

### Medium-term
- **OmniTrade Pro** — Keep base free (MIT), sell premium CLI addon:
  - Backtesting engine
  - Advanced alert types (RSI triggers, moving averages)
  - Copy trading
  - Commercial license (not MIT)

### Long-term
- **OmniTrade Cloud** — Hosted layer at $10–20/month:
  - 24/7 alert monitoring without your machine being on
  - Portfolio sync across devices
  - This is the recurring revenue path

- **White-label licensing** — Fintech companies building AI trading tools pay to embed OmniTrade under their brand.

### On MIT License
MIT is the right call for a showcase/experiment. It doesn't block monetization — most profitable OSS companies build on MIT. The cloud service and Pro version can use commercial licenses regardless.

---

## Marketing (Parked — revisit when product is more mature)

### awesome-mcp-servers Lists (highest ROI, zero cost)

Two main lists to target:
- `punkpeye/awesome-mcp-servers` — most popular, has Awesome badge, web directory at glama.ai
- `wong2/awesome-mcp-servers` — also widely referenced

**How to get listed:** Simple PR. No quality bar beyond working code and a clear description.

**OmniTrade listing entry:**
```
- [OmniTrade](https://github.com/Connectry-io/omnitrade-mcp) 📇 ☁️ 🍎 🪟 🐧 - 
  Multi-exchange crypto trading via natural language. 35 tools covering portfolio 
  management, price alerts, DCA, auto-rebalancing, arbitrage detection, and ASCII 
  charts across 107 exchanges.
```

**Category:** Finance & Fintech 💰

### Current OmniTrade Rating for awesome-mcp lists: 6/10

**What it has:**
- ✅ TypeScript (📇) — preferred language on the lists
- ✅ Published on npm (easy install)
- ✅ Cross-platform (🍎 🪟 🐧)
- ✅ Clear category (Finance & Fintech)
- ✅ Good README with clear description
- ✅ 35 tools (impressive breadth)
- ✅ CONTRIBUTING.md, SECURITY.md (professional signals)

**What's missing:**
- ❌ No demo GIF or screenshot showing it in action
- ❌ Zero GitHub stars (fresh repo, no social proof)
- ❌ No real users yet
- ❌ Alerts don't actually fire (they look real but aren't persistent)

### Rating with Phase 1+2 enhancements: 9/10

Once the daemon, real Telegram alerts, and paper trading exist:
- The product actually delivers on its promises
- Paper trading = viral potential (anyone can try it)
- Live ticker = great demo content
- TUI dashboard = hero image for README and social

### Other marketing channels (for later)
- Hacker News Show HN post
- Reddit: r/algotrading, r/MachineLearning, r/ClaudeAI
- dev.to / Medium launch article
- Product Hunt launch
- Twitter/X thread with demo video

---

## Phase 4 — Ecosystem & Distribution

### 8. TradingView Webhook Integration

**Why:** TradingView has millions of active traders who already set up alerts and strategies. OmniTrade becomes their execution layer — no new learning required.

**What it does:**
- Expose a webhook endpoint OmniTrade listens on
- TradingView alert fires → OmniTrade executes the trade
- Supports any TradingView strategy/indicator trigger
- Massive existing audience that already knows what they want

**Prerequisites:**
- HTTP webhook server (simple Express endpoint)
- Webhook auth/secret validation
- Trade execution mapped from TradingView payload format
- Optionally: ngrok/tunnel for local setups, or hosted version

**Effort:** 2–3 days

---

### 9. Crypto Tax Export

**Why:** Crypto tax reporting is genuinely painful. People will use OmniTrade just for this feature, completely separate from the AI/trading angle. Real utility, real retention.

**What it does:**
- Pull full trade history from all connected exchanges via CCXT
- Export as Koinly/CoinTracker/CryptoTaxCalculator-compatible CSV
- `omnitrade tax --year 2025 --format koinly`

**Prerequisites:**
- CCXT trade history fetching (already have CCXT)
- CSV formatter matching Koinly/CoinTracker column specs
- Date range filtering

**Effort:** 2–3 days

---

### 10. Strategy Backtesting

**Why:** Makes DCA and strategy features feel credible instead of theoretical. "How would buying $50 of BTC every Monday for the last year have performed?" — answers that make people trust and use OmniTrade.

**What it does:**
- Fetch historical OHLCV data via CCXT
- Simulate DCA/conditional strategies over historical data
- Show P&L, drawdown, win rate
- Compare strategies side-by-side

**Prerequisites:**
- CCXT historical OHLCV data fetching (already have CCXT)
- Backtesting engine (simulation loop over historical prices)
- Report formatting (ASCII table or SVG chart)

**Effort:** 3–5 days

---

### 11. Anthropic MCP Marketplace

**Why:** Anthropic is building an official MCP ecosystem. Getting OmniTrade listed there = massive distribution from Anthropic's own platform, far more than GitHub lists.

**What's needed:**
- Monitor when Anthropic opens official MCP marketplace submissions
- Ensure OmniTrade meets any quality/security requirements
- Submit early (first-mover advantage)

**Effort:** Track & submit when ready. No build work needed.

---

## Build Order Recommendation

```
Week 1:  Daemon + watch command      ← feels alive immediately
Week 2:  Telegram alerts             ← actually useful
Week 3:  Paper trading               ← removes adoption blocker  
Week 4:  TUI dashboard               ← the "wow" moment
Week 5:  SVG charts + tax export     ← polish + real utility
Week 6:  TradingView webhooks        ← existing trader audience
Week 7:  Backtesting                 ← makes strategies credible
Month 2: Tauri desktop app           ← the real product launch
Ongoing: Watch for Anthropic MCP marketplace
```

---

## Full Feature List (Summary)

| # | Feature | Why it matters | Effort |
|---|---------|---------------|--------|
| 1 | Background daemon | Foundation for everything else | 1–2 days |
| 2 | `omnitrade watch` live ticker | Feels alive, great for demos | 1–2 days |
| 3 | Telegram alerts | Actually useful, real notifications | 2–3 days |
| 4 | Paper trading | Removes adoption blocker, try without real money | 2–3 days |
| 5 | TUI dashboard | The "wow" moment, Bloomberg Terminal lite | 3–4 days |
| 6 | SVG charts in Claude | Makes chart responses genuinely impressive | 1–2 days |
| 7 | Tauri desktop app | Real product, non-developer audience | 2–3 weeks |
| 8 | TradingView webhooks | Existing trader audience, no learning curve | 2–3 days |
| 9 | Crypto tax export | Solves real pain, retention driver | 2–3 days |
| 10 | Strategy backtesting | Makes DCA credible, builds trust | 3–5 days |
| 11 | Anthropic MCP marketplace | Massive distribution, zero build cost | Track & submit |

## Monetization Summary

| Strategy | Timeline | Revenue type |
|----------|----------|-------------|
| Exchange referral commissions | Now — zero extra work | Passive |
| OmniTrade Pro (premium CLI features) | After Phase 1–2 | One-time / subscription |
| OmniTrade Cloud (hosted, 24/7 alerts) | Month 2+ | Recurring SaaS |
| White-label licensing | When product is mature | Deal-based |

---

*Documented by Clawdy — 2026-02-17*
