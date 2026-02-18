/**
 * SVG Chart Generator for OmniTrade
 * Dark-theme minimal line chart with price history
 * Used by the MCP get_chart tool
 */

import type { KlineData } from '../paper/wallet.js';

// Re-export KlineData for convenience
export type { KlineData };

export interface SvgChartOptions {
  width?: number;
  height?: number;
  symbol?: string;
  timeframe?: string;
  exchangeName?: string;
}

// ─── Theme ────────────────────────────────────────────────────

const THEME = {
  bg: '#0d1117',
  gridLine: '#21262d',
  axisBorder: '#30363d',
  axisLabel: '#8b949e',
  titleText: '#f0f6fc',
  statsText: '#8b949e',
  lineUp: '#3fb950',
  lineDown: '#f85149',
  areaUpStart: '#3fb950',
  areaDownStart: '#f85149',
  fontFamily: "'Courier New', Courier, monospace",
} as const;

// ─── Helpers ──────────────────────────────────────────────────

function fmtPrice(p: number): string {
  if (p >= 100_000) return `$${(p / 1000).toFixed(1)}k`;
  if (p >= 10_000) return `$${p.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (p >= 1_000) return `$${p.toFixed(0)}`;
  if (p >= 100) return `$${p.toFixed(1)}`;
  if (p >= 10) return `$${p.toFixed(2)}`;
  if (p >= 1) return `$${p.toFixed(3)}`;
  return `$${p.toFixed(5)}`;
}

function fmtTime(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours();
  const m = d.getMinutes();
  // Show date label at midnight
  if (h === 0 && m < 30) {
    return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
  }
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function fmtChange(change: number, pct: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${fmtPrice(Math.abs(change))} (${sign}${pct.toFixed(2)}%)`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ─── Main export ──────────────────────────────────────────────

export function generateSvgChart(klines: KlineData[], options: SvgChartOptions = {}): string {
  const {
    width = 800,
    height = 420,
    symbol = '',
    timeframe = '24h',
    exchangeName = 'Binance',
  } = options;

  if (klines.length < 2) {
    return errorSvg(width, height, 'Insufficient data');
  }

  // ── Layout ───────────────────────────────────────────────────
  const pad = { top: 52, right: 76, bottom: 56, left: 80 };
  const cw = width - pad.left - pad.right; // chart area width
  const ch = height - pad.top - pad.bottom; // chart area height

  // ── Price range with 5% padding ──────────────────────────────
  const closes = klines.map((k) => k.close);
  const rawMin = Math.min(...closes);
  const rawMax = Math.max(...closes);
  const rawRange = rawMax - rawMin || rawMin * 0.01; // avoid zero
  const pMin = rawMin - rawRange * 0.08;
  const pMax = rawMax + rawRange * 0.08;
  const pRange = pMax - pMin;

  const toX = (i: number) => pad.left + (i / (klines.length - 1)) * cw;
  const toY = (price: number) => pad.top + ((pMax - price) / pRange) * ch;

  // ── Build polyline points ─────────────────────────────────────
  const pts = klines.map((k, i) => `${toX(i).toFixed(1)},${toY(k.close).toFixed(1)}`);
  const polyline = pts.join(' ');

  // ── Area path (gradient fill under the line) ──────────────────
  const firstX = toX(0).toFixed(1);
  const lastX = toX(klines.length - 1).toFixed(1);
  const baseY = (pad.top + ch).toFixed(1);
  const areaPath = `M${pts[0]} ${pts.slice(1).map((p) => `L${p}`).join(' ')} L${lastX},${baseY} L${firstX},${baseY} Z`;

  // ── Colors based on price direction ──────────────────────────
  const firstClose = klines[0]!.close;
  const lastClose = klines[klines.length - 1]!.close;
  const isUp = lastClose >= firstClose;
  const lineColor = isUp ? THEME.lineUp : THEME.lineDown;
  const areaColorTop = isUp ? THEME.areaUpStart : THEME.areaDownStart;

  // ── Y-axis labels (6 levels) ──────────────────────────────────
  const yLevels = 6;
  const yLabelItems = Array.from({ length: yLevels + 1 }, (_, i) => {
    const price = pMin + (pRange * i) / yLevels;
    const y = toY(price);
    return { price, y };
  });

  // ── X-axis labels (up to 7) ───────────────────────────────────
  const maxXLabels = 7;
  const step = Math.max(1, Math.floor(klines.length / maxXLabels));
  const xLabelItems: { x: number; label: string }[] = [];
  for (let i = 0; i < klines.length; i += step) {
    xLabelItems.push({ x: toX(i), label: fmtTime(klines[i]!.time) });
  }
  // Always include last
  if (xLabelItems[xLabelItems.length - 1]?.x !== toX(klines.length - 1)) {
    xLabelItems.push({ x: toX(klines.length - 1), label: fmtTime(klines[klines.length - 1]!.time) });
  }

  // ── Stats ──────────────────────────────────────────────────────
  const change = lastClose - firstClose;
  const changePct = (change / firstClose) * 100;
  const changeStr = fmtChange(change, changePct);
  const titleStr = escapeXml(`${symbol} — ${timeframe} Chart`);
  const subStr = escapeXml(`${exchangeName}  ·  ${klines.length} candles`);
  const openStr = escapeXml(`Open: ${fmtPrice(firstClose)}`);
  const closeStr = escapeXml(`Close: ${fmtPrice(lastClose)}`);
  const changeLabel = escapeXml(`Change: ${changeStr}`);

  // ── Volume bars (mini, bottom 15% of chart area) ──────────────
  const maxVol = Math.max(...klines.map((k) => k.volume));
  const volHeight = ch * 0.12;
  const volBars = klines
    .map((k, i) => {
      const barH = (k.volume / maxVol) * volHeight;
      const bx = toX(i) - (cw / klines.length / 2) * 0.6;
      const bw = Math.max(0.8, (cw / klines.length) * 0.6);
      const by = pad.top + ch - barH;
      const bColor = k.close >= k.open ? THEME.lineUp : THEME.lineDown;
      return `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${barH.toFixed(1)}" fill="${bColor}" opacity="0.25"/>`;
    })
    .join('\n    ');

  // ── Grid lines ────────────────────────────────────────────────
  const gridLines = yLabelItems
    .map(
      ({ y }) =>
        `<line x1="${pad.left}" y1="${y.toFixed(1)}" x2="${(pad.left + cw).toFixed(1)}" y2="${y.toFixed(1)}" stroke="${THEME.gridLine}" stroke-width="0.5" stroke-dasharray="4 4"/>`
    )
    .join('\n    ');

  // ── Y-axis labels ─────────────────────────────────────────────
  const yLabelsHtml = yLabelItems
    .map(
      ({ price, y }) =>
        `<text x="${(pad.left - 6).toFixed(0)}" y="${(y + 4).toFixed(0)}" fill="${THEME.axisLabel}" font-family="${THEME.fontFamily}" font-size="11" text-anchor="end">${escapeXml(fmtPrice(price))}</text>`
    )
    .join('\n    ');

  // ── X-axis labels ─────────────────────────────────────────────
  const xLabelsHtml = xLabelItems
    .map(
      ({ x, label }) =>
        `<text x="${x.toFixed(0)}" y="${(pad.top + ch + 22).toFixed(0)}" fill="${THEME.axisLabel}" font-family="${THEME.fontFamily}" font-size="10" text-anchor="middle">${escapeXml(label)}</text>`
    )
    .join('\n    ');

  // ── Last price indicator (right-edge label) ───────────────────
  const lastY = toY(lastClose);
  const lastPriceLabel = escapeXml(fmtPrice(lastClose));

  // ── Assemble SVG ──────────────────────────────────────────────
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="areaGrad_${symbol.replace(/\//g, '_')}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${areaColorTop}" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="${areaColorTop}" stop-opacity="0.0"/>
    </linearGradient>
    <clipPath id="chartClip">
      <rect x="${pad.left}" y="${pad.top}" width="${cw}" height="${ch}"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="${THEME.bg}" rx="4"/>

  <!-- Title -->
  <text x="${width / 2}" y="20" fill="${THEME.titleText}" font-family="${THEME.fontFamily}" font-size="14" font-weight="bold" text-anchor="middle">${titleStr}</text>
  <text x="${width / 2}" y="38" fill="${THEME.statsText}" font-family="${THEME.fontFamily}" font-size="11" text-anchor="middle">${subStr}</text>

  <!-- Chart border -->
  <rect x="${pad.left}" y="${pad.top}" width="${cw}" height="${ch}" fill="none" stroke="${THEME.axisBorder}" stroke-width="1"/>

  <!-- Grid lines -->
  ${gridLines}

  <!-- Volume bars (clipped) -->
  <g clip-path="url(#chartClip)">
    ${volBars}
  </g>

  <!-- Area fill (clipped) -->
  <path d="${areaPath}" fill="url(#areaGrad_${symbol.replace(/\//g, '_')})" clip-path="url(#chartClip)"/>

  <!-- Price line (clipped) -->
  <polyline points="${polyline}" fill="none" stroke="${lineColor}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" clip-path="url(#chartClip)"/>

  <!-- Y-axis labels -->
  ${yLabelsHtml}

  <!-- Last price label (right side) -->
  <rect x="${(pad.left + cw + 2).toFixed(0)}" y="${(lastY - 9).toFixed(0)}" width="70" height="16" fill="${lineColor}" rx="2"/>
  <text x="${(pad.left + cw + 37).toFixed(0)}" y="${(lastY + 4).toFixed(0)}" fill="${THEME.bg}" font-family="${THEME.fontFamily}" font-size="10" font-weight="bold" text-anchor="middle">${lastPriceLabel}</text>

  <!-- X-axis labels -->
  ${xLabelsHtml}

  <!-- Bottom stats bar -->
  <text x="${pad.left}" y="${(height - 10).toFixed(0)}" fill="${THEME.statsText}" font-family="${THEME.fontFamily}" font-size="11">${openStr}</text>
  <text x="${width / 2}" y="${(height - 10).toFixed(0)}" fill="${lineColor}" font-family="${THEME.fontFamily}" font-size="11" text-anchor="middle">${changeLabel}</text>
  <text x="${(width - pad.right + 72).toFixed(0)}" y="${(height - 10).toFixed(0)}" fill="${THEME.statsText}" font-family="${THEME.fontFamily}" font-size="11" text-anchor="end">${closeStr}</text>
</svg>`;
}

// ─── Error SVG ────────────────────────────────────────────────

function errorSvg(width: number, height: number, message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="${THEME.bg}" rx="4"/>
  <text x="${width / 2}" y="${height / 2}" fill="${THEME.lineDown}" font-family="${THEME.fontFamily}" font-size="14" text-anchor="middle">${escapeXml(message)}</text>
</svg>`;
}
