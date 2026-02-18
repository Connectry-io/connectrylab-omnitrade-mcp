/**
 * OmniTrade TUI Dashboard
 * Full-screen Bloomberg Terminal-style terminal UI
 * Uses blessed + blessed-contrib for layout and charts
 *
 * Layout:
 *   ┌─────────────────────────┬────────────────────┐
 *   │  LIVE PRICES (table)    │  BTC/USDT CHART    │
 *   │                         │  (line chart)      │
 *   ├─────────────────────────┴────────────────────┤
 *   │  PORTFOLIO                                   │
 *   ├──────────────────────────────────────────────┤
 *   │  STATUS BAR                                  │
 *   └──────────────────────────────────────────────┘
 *
 * Keyboard: q=quit, t=toggle panels, tab=navigate
 *
 * Flags:
 *   --live        fetch real exchange balances via CCXT
 *   --symbols     override default symbols list
 *   --symbol      chart symbol
 *   --refresh     refresh interval in seconds
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createRequire } from 'module';
import {
  fetch24hTicker,
  fetchKlines,
  loadWallet,
  getPortfolioSummary,
  type Ticker24h,
} from '../paper/wallet.js';
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const _require = createRequire(import.meta.url);
const _pkg = _require('../package.json') as { version: string };
const VERSION = _pkg.version;

// ─── Config ───────────────────────────────────────────────────

interface DashboardConfig {
  symbols: string[];      // symbols to track (base assets like BTC, ETH, SOL)
  chartSymbol: string;    // which symbol to show in the chart panel
  refreshMs: number;      // data refresh interval
  live: boolean;          // use real exchange balances
}

const DEFAULT_SYMBOLS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX'];

const DEFAULT_CONFIG: DashboardConfig = {
  symbols: DEFAULT_SYMBOLS,
  chartSymbol: 'BTC',
  refreshMs: 8_000,
  live: false,
};

// ─── Exchange config types ────────────────────────────────────

interface ExchangeCfg {
  apiKey?: string;
  secret?: string;
  password?: string;
  testnet?: boolean;
}

interface OmniConfig {
  exchanges?: Record<string, ExchangeCfg>;
}

// ─── Live balance types ───────────────────────────────────────

interface LiveBalance {
  exchange: string;
  asset: string;
  free: number;
  total: number;
  usdValue: number;
  price: number;
}

// ─── Load omnitrade config ─────────────────────────────────────

function loadOmniConfig(): OmniConfig | null {
  const configPath = join(homedir(), '.omnitrade', 'config.json');
  if (!existsSync(configPath)) return null;
  try {
    return JSON.parse(readFileSync(configPath, 'utf-8')) as OmniConfig;
  } catch {
    return null;
  }
}

// ─── Fetch real balances from all configured exchanges ─────────

async function fetchLiveBalances(): Promise<LiveBalance[]> {
  const omniConfig = loadOmniConfig();
  if (!omniConfig?.exchanges) return [];

  const ccxt = await import('ccxt');
  const results: LiveBalance[] = [];

  for (const [name, cfg] of Object.entries(omniConfig.exchanges)) {
    if (!cfg.apiKey || !cfg.secret) continue;

    try {
      const ExchangeClass = (ccxt.default as unknown as Record<string, new (opts: object) => import('ccxt').Exchange>)[name];
      if (!ExchangeClass) continue;

      const exchange = new ExchangeClass({
        apiKey: cfg.apiKey,
        secret: cfg.secret,
        password: cfg.password,
        enableRateLimit: true,
      });

      if (cfg.testnet) exchange.setSandboxMode(true);

      const balance = await exchange.fetchBalance();

      // Get non-zero balances
      const balanceTotal = balance.total as unknown as Record<string, number>;
      for (const [asset, total] of Object.entries(balanceTotal)) {
        if (!total || total <= 0) continue;

        let usdValue = 0;
        let price = 0;

        if (asset === 'USDT' || asset === 'USD' || asset === 'BUSD' || asset === 'USDC') {
          price = 1;
          usdValue = total;
        } else {
          try {
            const ticker = await exchange.fetchTicker(`${asset}/USDT`);
            price = ticker.last ?? 0;
            usdValue = total * price;
          } catch {
            // Can't price this asset, skip
          }
        }

        const freeBalance = (balance.free as unknown as Record<string, number>)[asset] ?? 0;
        results.push({
          exchange: name,
          asset,
          free: freeBalance,
          total,
          usdValue,
          price,
        });
      }
    } catch {
      // Exchange fetch failed — skip silently
    }
  }

  return results;
}

// ─── Fetch prices from multiple exchanges ─────────────────────

interface ExchangePrice {
  exchange: string;
  price: number;
}

async function fetchMultiExchangePrices(symbol: string, exchangeNames: string[]): Promise<ExchangePrice[]> {
  const ccxt = await import('ccxt');
  const omniConfig = loadOmniConfig();
  const results: ExchangePrice[] = [];

  for (const name of exchangeNames) {
    const cfg = omniConfig?.exchanges?.[name];
    try {
      const ExchangeClass = (ccxt.default as unknown as Record<string, new (opts: object) => import('ccxt').Exchange>)[name];
      if (!ExchangeClass) continue;

      const exchange = new ExchangeClass({
        ...(cfg?.apiKey ? { apiKey: cfg.apiKey, secret: cfg.secret, password: cfg.password } : {}),
        enableRateLimit: true,
      });

      const ticker = await exchange.fetchTicker(`${symbol}/USDT`);
      if (ticker.last && ticker.last > 0) {
        results.push({ exchange: name, price: ticker.last });
      }
    } catch {
      // Skip this exchange for this symbol
    }
  }

  return results;
}

// ─── Dashboard ────────────────────────────────────────────────

export async function startDashboard(config: Partial<DashboardConfig> = {}): Promise<void> {
  const cfg: DashboardConfig = { ...DEFAULT_CONFIG, ...config };

  // Detect configured exchanges for multi-exchange price comparison
  const omniConfig = loadOmniConfig();
  const configuredExchangeNames = omniConfig?.exchanges ? Object.keys(omniConfig.exchanges) : [];
  const showMultiExchange = cfg.live && configuredExchangeNames.length > 1;

  // Lazy-load blessed + blessed-contrib (CJS modules)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const blessed = (await import('blessed' as string)).default as any;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const contrib = (await import('blessed-contrib' as string)).default as any;

  // ── Screen ─────────────────────────────────────────────────
  const screen = blessed.screen({
    smartCSR: true,
    fullUnicode: true,
    title: 'OmniTrade Dashboard',
  });

  // ── Grid layout: 12 rows × 12 cols ─────────────────────────
  const grid = new contrib.grid({ rows: 12, cols: 12, screen });

  // ── Widgets ────────────────────────────────────────────────

  // Price table: rows 0-6, cols 0-7
  const priceTable = grid.set(0, 0, 6, 7, contrib.table, {
    label: ' LIVE PRICES ',
    keys: true,
    vi: true,
    mouse: true,
    style: {
      header: { fg: 'cyan', bold: true },
      cell: { fg: 'white', selected: { fg: 'black', bg: 'cyan' } },
      border: { fg: 'cyan' },
      label: { fg: 'cyan' },
    },
    columnSpacing: 2,
    columnWidth: showMultiExchange ? [10, 14, 9, 12, 12] : [10, 14, 9, 16],
  });

  // Chart: rows 0-6, cols 7-12
  const lineChart = grid.set(0, 7, 6, 5, contrib.line, {
    label: ` ${cfg.chartSymbol}/USDT — 24h `,
    showLegend: false,
    wholeNumbersOnly: false,
    xLabelPadding: 2,
    xPadding: 5,
    style: {
      line: 'green',
      text: 'white',
      baseline: 'black',
      border: { fg: 'cyan' },
      label: { fg: 'cyan' },
    },
  });

  // Portfolio: rows 6-10, full width
  const portfolioTable = grid.set(6, 0, 4, 12, contrib.table, {
    label: ' PORTFOLIO ',
    keys: false,
    style: {
      header: { fg: 'yellow', bold: true },
      cell: { fg: 'white' },
      border: { fg: 'yellow' },
      label: { fg: 'yellow' },
    },
    columnSpacing: 2,
    columnWidth: cfg.live
      ? [10, 10, 14, 14, 14, 10]
      : [10, 14, 14, 14, 16, 14, 10],
  });

  // Status bar: rows 10-12, full width
  const statusBar = grid.set(10, 0, 2, 12, blessed.box, {
    tags: true,
    style: {
      fg: 'white',
      bg: 'black',
      border: { fg: 'gray' },
    },
    border: { type: 'line' },
    padding: { left: 1, right: 1, top: 0, bottom: 0 },
  });

  // ── Panel toggle state ─────────────────────────────────────
  let panelToggle = 0; // 0=all, 1=prices only, 2=portfolio only
  const panels = [priceTable, lineChart, portfolioTable];

  function applyPanelToggle() {
    if (panelToggle === 0) {
      panels.forEach((p) => p.show());
    } else if (panelToggle === 1) {
      priceTable.show();
      lineChart.show();
      portfolioTable.hide();
    } else {
      priceTable.hide();
      lineChart.hide();
      portfolioTable.show();
    }
    screen.render();
  }

  // ── Keyboard shortcuts ─────────────────────────────────────
  screen.key(['q', 'C-c'], () => {
    screen.destroy();
    process.exit(0);
  });

  screen.key(['t'], () => {
    panelToggle = (panelToggle + 1) % 3;
    applyPanelToggle();
  });

  screen.key(['tab'], () => {
    screen.focusNext();
    screen.render();
  });

  // ── State ──────────────────────────────────────────────────
  let lastUpdate = 'never';
  let connectionStatus = '● CONNECTING';
  let connectionColor = '{yellow-fg}';

  // ── Render status bar — in-place, no screen clear ──────────
  function renderStatus() {
    const modeStr = cfg.live ? '{green-fg}LIVE{/}' : '{yellow-fg}PAPER{/}';
    const helpStr = '{gray-fg}q{/} quit  {gray-fg}t{/} toggle panels  {gray-fg}Tab{/} navigate';
    statusBar.setContent(
      `${connectionColor}${connectionStatus}{/}   {gray-fg}│{/}   Mode: ${modeStr}   {gray-fg}│{/}   {white-fg}Updated: ${lastUpdate}{/}   {gray-fg}│{/}   ${helpStr}   {gray-fg}│{/}   {cyan-fg}OmniTrade v${VERSION}{/}`
    );
    // Never call process.stdout.write('\x1b[2J\x1b[H') — let blessed handle diffs
    screen.render();
  }

  // ── Fetch & render prices — in-place widget update ─────────
  async function refreshPrices() {
    try {
      const tickers = await Promise.allSettled(
        cfg.symbols.map((s) => fetch24hTicker(s))
      );

      let headers: string[];
      const rows: string[][] = [];

      if (showMultiExchange) {
        // Multi-exchange price comparison columns
        headers = ['Symbol', 'Price', '24h %', 'Binance', 'Best'];

        for (let i = 0; i < cfg.symbols.length; i++) {
          const result = tickers[i];
          const sym = cfg.symbols[i]!;

          if (result?.status === 'fulfilled') {
            const t: Ticker24h = result.value;
            const price = fmtTablePrice(t.lastPrice);
            const pct = t.priceChangePercent;
            const pctStr = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;

            // Fetch prices from all configured exchanges in background (show binance main + best)
            // We only do this if we have the data cached — keep it simple
            rows.push([sym, price, pctStr, price, '←best']);
          } else {
            rows.push([sym, '---', '---', '---', '---']);
          }
        }
      } else {
        headers = ['Symbol', 'Price', '24h %', 'Volume (USDT)'];

        for (let i = 0; i < cfg.symbols.length; i++) {
          const result = tickers[i];
          const sym = cfg.symbols[i]!;

          if (result?.status === 'fulfilled') {
            const t: Ticker24h = result.value;
            const price = fmtTablePrice(t.lastPrice);
            const pct = t.priceChangePercent;
            const pctStr = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
            const vol = fmtVolume(t.quoteVolume);
            rows.push([sym, price, pctStr, vol]);
          } else {
            rows.push([sym, '---', '---', '---']);
          }
        }
      }

      // In-place update — setData + render, no screen clear
      priceTable.setData({ headers, data: rows });

      connectionStatus = '● CONNECTED';
      connectionColor = '{green-fg}';
      lastUpdate = new Date().toLocaleTimeString();
    } catch {
      connectionStatus = '● RECONNECTING';
      connectionColor = '{red-fg}';
    }
    renderStatus();
  }

  // ── Multi-exchange detailed price fetch (async, lower priority) ─
  async function refreshMultiExchangePrices() {
    if (!showMultiExchange || configuredExchangeNames.length < 2) return;

    try {
      const headers = ['Symbol', 'Price', '24h %', 'Exchange', 'Note'];
      const rows: string[][] = [];

      for (const sym of cfg.symbols.slice(0, 4)) { // limit to top 4 for performance
        // Fetch main Binance price
        let mainPrice = 0;
        try {
          const t = await fetch24hTicker(sym);
          mainPrice = t.lastPrice;
          const pct = t.priceChangePercent;
          const pctStr = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
          rows.push([sym, fmtTablePrice(mainPrice), pctStr, 'binance', '']);
        } catch {
          rows.push([sym, '---', '---', '---', '']);
        }

        // Fetch from other configured exchanges
        const otherExchanges = configuredExchangeNames.filter((e) => e !== 'binance').slice(0, 2);
        if (otherExchanges.length > 0) {
          const exchangePrices = await fetchMultiExchangePrices(sym, otherExchanges);
          let bestPrice = mainPrice;
          let bestExchange = 'binance';

          for (const ep of exchangePrices) {
            if (ep.price < bestPrice || bestPrice === 0) {
              bestPrice = ep.price;
              bestExchange = ep.exchange;
            }
            rows.push(['', fmtTablePrice(ep.price), '', ep.exchange, ep.exchange === bestExchange ? '← best' : '']);
          }

          // Mark best on the appropriate row (findLastIndex not in ES2022)
          let bestIdx = -1;
          for (let ri = rows.length - 1; ri >= 0; ri--) {
            if (rows[ri]?.[3] === bestExchange) { bestIdx = ri; break; }
          }
          if (bestIdx >= 0 && rows[bestIdx]) {
            rows[bestIdx]![4] = '← best';
          }
        }
      }

      priceTable.setData({ headers, data: rows });
      screen.render();
    } catch {
      // Silently fail — main price refresh will still run
    }
  }

  // ── Fetch & render chart — in-place widget update ─────────
  async function refreshChart() {
    try {
      const klines = await fetchKlines(cfg.chartSymbol, '1h', 24);
      if (klines.length < 2) return;

      const x = klines.map((k) => {
        const d = new Date(k.time);
        return `${d.getHours().toString().padStart(2, '0')}:00`;
      });
      const y = klines.map((k) => k.close);

      const firstPrice = y[0]!;
      const lastPrice = y[y.length - 1]!;
      const isUp = lastPrice >= firstPrice;

      lineChart.options.label = ` ${cfg.chartSymbol}/USDT — 24h  ${isUp ? '▲' : '▼'} ${fmtTablePrice(lastPrice)} `;
      lineChart.options.style.line = isUp ? 'green' : 'red';

      // In-place update — setData only, no screen clear
      lineChart.setData([
        {
          title: cfg.chartSymbol,
          x,
          y,
          style: { line: isUp ? 'green' : 'red' },
        },
      ]);
    } catch {
      // Chart fetch failed silently — don't disrupt dashboard
    }
    screen.render();
  }

  // ── Fetch & render portfolio — in-place widget update ─────
  async function refreshPortfolio() {
    try {
      if (cfg.live) {
        // Live exchange balances
        await refreshLivePortfolio();
      } else {
        // Paper wallet
        await refreshPaperPortfolio();
      }
    } catch {
      // Portfolio refresh failed silently
    }
    screen.render();
  }

  async function refreshPaperPortfolio() {
    const wallet = loadWallet();
    const summary = await getPortfolioSummary(wallet);

    const headers = ['Asset', 'Amount', 'Price', 'Value', 'Avg Buy', 'P&L', 'Alloc %'];
    const rows: string[][] = [];

    // USDT row
    const usdtPct = summary.totalValue > 0
      ? ((summary.usdtBalance / summary.totalValue) * 100).toFixed(1)
      : '0.0';
    rows.push([
      'USDT',
      summary.usdtBalance.toFixed(2),
      '$1.00',
      `$${summary.usdtBalance.toFixed(2)}`,
      '---',
      '---',
      `${usdtPct}%`,
    ]);

    // Holdings
    for (const h of summary.holdings) {
      const pnlSign = h.pnl >= 0 ? '+' : '';
      rows.push([
        h.asset,
        fmtAmount(h.amount),
        fmtTablePrice(h.price),
        `$${h.value.toFixed(2)}`,
        fmtTablePrice(h.avgBuyPrice),
        `${pnlSign}$${h.pnl.toFixed(2)}`,
        `${h.allocation.toFixed(1)}%`,
      ]);
    }

    const pnlSign = summary.totalPnl >= 0 ? '+' : '';
    portfolioTable.setData({ headers, data: rows });
    portfolioTable.options.label =
      ` PORTFOLIO (paper)  Total: $${summary.totalValue.toFixed(2)}  │  P&L: ${pnlSign}$${Math.abs(summary.totalPnl).toFixed(2)} (${pnlSign}${summary.totalPnlPct.toFixed(2)}%) `;
  }

  async function refreshLivePortfolio() {
    const balances = await fetchLiveBalances();

    if (balances.length === 0) {
      portfolioTable.setData({
        headers: ['Asset', 'Exchange', 'Amount', 'Price', 'USD Value', 'Alloc %'],
        data: [['No live data', '---', '---', '---', '---', '---']],
      });
      portfolioTable.options.label = ' PORTFOLIO (live) — no exchange data ';
      return;
    }

    // Aggregate by asset across exchanges
    const aggregated = new Map<string, { total: number; usdValue: number; exchanges: string[] }>();
    const totalUSD = balances.reduce((s, b) => s + b.usdValue, 0);

    for (const b of balances) {
      const existing = aggregated.get(b.asset);
      if (existing) {
        existing.total += b.total;
        existing.usdValue += b.usdValue;
        existing.exchanges.push(b.exchange);
      } else {
        aggregated.set(b.asset, { total: b.total, usdValue: b.usdValue, exchanges: [b.exchange] });
      }
    }

    const headers = ['Asset', 'Exchange', 'Amount', 'Price', 'USD Value', 'Alloc %'];
    const rows: string[][] = [];

    // Sort by USD value descending
    const sorted = Array.from(aggregated.entries()).sort((a, b) => b[1].usdValue - a[1].usdValue);

    for (const [asset, data] of sorted) {
      const alloc = totalUSD > 0 ? ((data.usdValue / totalUSD) * 100).toFixed(1) : '0.0';
      // Show per-exchange breakdown as sub-rows
      const assetBalances = balances.filter((b) => b.asset === asset);

      if (assetBalances.length === 1) {
        const b = assetBalances[0]!;
        rows.push([
          asset,
          b.exchange,
          fmtAmount(data.total),
          b.price > 0 ? fmtTablePrice(b.price) : '---',
          `$${data.usdValue.toFixed(2)}`,
          `${alloc}%`,
        ]);
      } else {
        // Aggregate row
        rows.push([
          asset,
          `(${assetBalances.length} exch)`,
          fmtAmount(data.total),
          '---',
          `$${data.usdValue.toFixed(2)}`,
          `${alloc}%`,
        ]);
        // Per-exchange sub-rows
        for (const b of assetBalances) {
          rows.push([
            '',
            `  ${b.exchange}`,
            fmtAmount(b.total),
            b.price > 0 ? fmtTablePrice(b.price) : '---',
            `$${b.usdValue.toFixed(2)}`,
            '',
          ]);
        }
      }
    }

    portfolioTable.setData({ headers, data: rows });
    portfolioTable.options.label =
      ` PORTFOLIO (live)  Total: $${totalUSD.toFixed(2)} across ${configuredExchangeNames.length} exchange(s) `;
  }

  // ── Formatting helpers ────────────────────────────────────
  function fmtTablePrice(p: number): string {
    if (p >= 10_000) return `$${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (p >= 100) return `$${p.toFixed(2)}`;
    if (p >= 1) return `$${p.toFixed(4)}`;
    return `$${p.toFixed(6)}`;
  }

  function fmtVolume(v: number): string {
    if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    return `$${v.toFixed(2)}`;
  }

  function fmtAmount(a: number): string {
    if (a >= 1000) return a.toFixed(2);
    if (a >= 1) return a.toFixed(4);
    if (a >= 0.001) return a.toFixed(6);
    return a.toFixed(8);
  }

  // ── Initial render — no screen clear, use widget updates ──
  renderStatus();
  screen.render();

  // Show loading state via setData (in-place)
  priceTable.setData({ headers: ['Symbol', 'Price', '24h %', 'Volume'], data: [['Loading...', '', '', '']] });
  portfolioTable.setData({ headers: ['Asset', 'Amount', 'Price', 'Value', 'Avg Buy', 'P&L', 'Alloc %'], data: [['Loading...', '', '', '', '', '', '']] });
  screen.render();

  // ── First load ────────────────────────────────────────────
  await Promise.all([refreshPrices(), refreshChart(), refreshPortfolio()]);

  // If live + multi-exchange, run detailed comparison (lower priority, after initial load)
  if (showMultiExchange) {
    refreshMultiExchangePrices().catch(() => {/* silent */});
  }

  // ── Auto-refresh loop — in-place updates only ─────────────
  const priceTimer = setInterval(async () => {
    await refreshPrices();
    if (showMultiExchange) {
      refreshMultiExchangePrices().catch(() => {/* silent */});
    }
  }, cfg.refreshMs);

  const chartTimer = setInterval(async () => {
    await refreshChart();
  }, cfg.refreshMs * 3); // chart refreshes less often

  const portfolioTimer = setInterval(async () => {
    await refreshPortfolio();
  }, cfg.refreshMs * 2);

  // Cleanup on exit
  screen.on('destroy', () => {
    clearInterval(priceTimer);
    clearInterval(chartTimer);
    clearInterval(portfolioTimer);
  });

  // Focus price table by default
  priceTable.focus();
  screen.render();
}
