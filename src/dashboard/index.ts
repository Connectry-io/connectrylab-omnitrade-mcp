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
 * Keyboard: q=quit, t=toggle panels, arrow keys=navigate
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  fetch24hTicker,
  fetchKlines,
  loadWallet,
  getPortfolioSummary,
  normalizeBinanceSymbol,
  type Ticker24h,
} from '../paper/wallet.js';

// ─── Config ───────────────────────────────────────────────────

interface DashboardConfig {
  symbols: string[];      // symbols to track (base assets like BTC, ETH, SOL)
  chartSymbol: string;    // which symbol to show in the chart panel
  refreshMs: number;      // data refresh interval
}

const DEFAULT_CONFIG: DashboardConfig = {
  symbols: ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX'],
  chartSymbol: 'BTC',
  refreshMs: 8_000,
};

// ─── Dashboard ────────────────────────────────────────────────

export async function startDashboard(config: Partial<DashboardConfig> = {}): Promise<void> {
  const cfg: DashboardConfig = { ...DEFAULT_CONFIG, ...config };

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
    columnWidth: [10, 14, 9, 16],
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
    columnWidth: [10, 14, 14, 14, 16, 14, 10],
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

  // Arrow key navigation handled by blessed widgets natively

  // ── State ──────────────────────────────────────────────────
  let lastUpdate = 'never';
  let connectionStatus = '● CONNECTING';
  let connectionColor = '{yellow-fg}';

  // ── Render status bar ──────────────────────────────────────
  function renderStatus() {
    const helpStr = '{gray-fg}q{/} quit  {gray-fg}t{/} toggle panels  {gray-fg}Tab{/} navigate';
    statusBar.setContent(
      `${connectionColor}${connectionStatus}{/}   {gray-fg}│{/}   {white-fg}Updated: ${lastUpdate}{/}   {gray-fg}│{/}   ${helpStr}   {gray-fg}│{/}   {cyan-fg}OmniTrade v0.8.1{/}`
    );
    screen.render();
  }

  // ── Fetch & render prices ──────────────────────────────────
  async function refreshPrices() {
    try {
      const tickers = await Promise.allSettled(
        cfg.symbols.map((s) => fetch24hTicker(s))
      );

      const headers = ['Symbol', 'Price', '24h %', 'Volume (USDT)'];
      const rows: string[][] = [];

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

  // ── Fetch & render chart ──────────────────────────────────
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

  // ── Fetch & render portfolio ──────────────────────────────
  async function refreshPortfolio() {
    try {
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
      portfolioTable.setData({
        headers,
        data: rows,
      });

      portfolioTable.options.label =
        ` PORTFOLIO  Total: $${summary.totalValue.toFixed(2)}  │  P&L: ${pnlSign}$${Math.abs(summary.totalPnl).toFixed(2)} (${pnlSign}${summary.totalPnlPct.toFixed(2)}%) `;
    } catch {
      // Portfolio refresh failed silently
    }
    screen.render();
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

  // ── Initial render ────────────────────────────────────────
  renderStatus();
  screen.render();

  // Show loading state
  priceTable.setData({ headers: ['Symbol', 'Price', '24h %', 'Volume'], data: [['Loading...', '', '', '']] });
  portfolioTable.setData({ headers: ['Asset', 'Amount', 'Price', 'Value', 'Avg Buy', 'P&L', 'Alloc %'], data: [['Loading...', '', '', '', '', '', '']] });
  screen.render();

  // ── First load ────────────────────────────────────────────
  await Promise.all([refreshPrices(), refreshChart(), refreshPortfolio()]);

  // ── Auto-refresh loop ─────────────────────────────────────
  const priceTimer = setInterval(async () => {
    await refreshPrices();
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
