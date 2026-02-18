/**
 * OmniTrade Paper Trading — Virtual Wallet
 * Persisted to ~/.omnitrade/paper-wallet.json
 * Uses Binance public API for real prices (no auth needed)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// ─── Constants ────────────────────────────────────────────────

const WALLET_DIR = join(homedir(), '.omnitrade');
const WALLET_PATH = join(WALLET_DIR, 'paper-wallet.json');
const INITIAL_USDT = 10_000;
const FEE_RATE = 0.001; // 0.1% (Binance spot taker fee)
const BINANCE_API = 'https://api.binance.com/api/v3';

// ─── Types ────────────────────────────────────────────────────

export interface Holding {
  asset: string;
  amount: number;
  avgBuyPrice: number;
  totalCost: number; // sum of (price * amount) for all buys, reduced on sells
}

export interface Trade {
  id: string;
  timestamp: number;
  side: 'buy' | 'sell';
  asset: string;
  symbol: string;
  amount: number;
  price: number;
  usdtValue: number;
  fee: number;
  feeAsset: 'USDT';
  balanceAfter: number; // USDT balance after trade
}

export interface PaperWallet {
  version: 1;
  createdAt: number;
  usdt: number;
  holdings: Record<string, Holding>;
  trades: Trade[];
}

export interface PortfolioSummary {
  totalValue: number;
  usdtBalance: number;
  holdingsValue: number;
  initialValue: number;
  totalPnl: number;
  totalPnlPct: number;
  holdings: HoldingWithValue[];
}

export interface HoldingWithValue {
  asset: string;
  amount: number;
  price: number;
  value: number;
  avgBuyPrice: number;
  pnl: number;
  pnlPct: number;
  allocation: number; // % of portfolio
}

// ─── Wallet I/O ───────────────────────────────────────────────

export function loadWallet(): PaperWallet {
  if (!existsSync(WALLET_PATH)) {
    return createFreshWallet();
  }
  try {
    const raw = readFileSync(WALLET_PATH, 'utf-8');
    return JSON.parse(raw) as PaperWallet;
  } catch {
    console.warn('⚠ Paper wallet corrupted, creating fresh wallet');
    return createFreshWallet();
  }
}

function createFreshWallet(): PaperWallet {
  const wallet: PaperWallet = {
    version: 1,
    createdAt: Date.now(),
    usdt: INITIAL_USDT,
    holdings: {},
    trades: [],
  };
  saveWallet(wallet);
  return wallet;
}

export function saveWallet(wallet: PaperWallet): void {
  if (!existsSync(WALLET_DIR)) {
    mkdirSync(WALLET_DIR, { recursive: true });
  }
  writeFileSync(WALLET_PATH, JSON.stringify(wallet, null, 2));
}

// ─── Binance Public API ───────────────────────────────────────

/**
 * Normalize a symbol to Binance format: BTC → BTCUSDT, BTC/USDT → BTCUSDT
 */
export function normalizeBinanceSymbol(input: string): string {
  const upper = input.toUpperCase().replace('/', '');
  // If it already ends with USDT, BTC, ETH, BNB — leave it
  if (/^[A-Z0-9]+USDT$/.test(upper)) return upper;
  if (/^[A-Z0-9]+(BTC|ETH|BNB|USDC|BUSD)$/.test(upper)) return upper;
  // Otherwise append USDT
  return `${upper}USDT`;
}

export async function fetchCurrentPrice(asset: string): Promise<number> {
  const symbol = normalizeBinanceSymbol(asset);
  const url = `${BINANCE_API}/ticker/price?symbol=${symbol}`;

  const resp = await fetch(url);
  if (!resp.ok) {
    const body = await resp.text().catch(() => resp.statusText);
    throw new Error(`Binance price fetch failed for ${symbol}: ${body}`);
  }

  const data = (await resp.json()) as { price: string };
  return parseFloat(data.price);
}

export interface Ticker24h {
  symbol: string;
  lastPrice: number;
  priceChangePercent: number;
  volume: number;
  quoteVolume: number;
  highPrice: number;
  lowPrice: number;
}

export async function fetch24hTicker(asset: string): Promise<Ticker24h> {
  const symbol = normalizeBinanceSymbol(asset);
  const url = `${BINANCE_API}/ticker/24hr?symbol=${symbol}`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`24hr ticker fetch failed: ${resp.statusText}`);

  const data = (await resp.json()) as Record<string, string>;
  return {
    symbol,
    lastPrice: parseFloat(data['lastPrice'] ?? '0'),
    priceChangePercent: parseFloat(data['priceChangePercent'] ?? '0'),
    volume: parseFloat(data['volume'] ?? '0'),
    quoteVolume: parseFloat(data['quoteVolume'] ?? '0'),
    highPrice: parseFloat(data['highPrice'] ?? '0'),
    lowPrice: parseFloat(data['lowPrice'] ?? '0'),
  };
}

export interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function fetchKlines(
  asset: string,
  interval: string = '1h',
  limit: number = 24
): Promise<KlineData[]> {
  const symbol = normalizeBinanceSymbol(asset);
  const url = `${BINANCE_API}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Klines fetch failed: ${resp.statusText}`);

  const raw = (await resp.json()) as (string | number)[][];
  return raw.map((k) => ({
    time: Number(k[0]),
    open: parseFloat(String(k[1])),
    high: parseFloat(String(k[2])),
    low: parseFloat(String(k[3])),
    close: parseFloat(String(k[4])),
    volume: parseFloat(String(k[5])),
  }));
}

// ─── Trading Operations ───────────────────────────────────────

export interface TradeResult {
  trade: Trade;
  wallet: PaperWallet;
}

export async function executeBuy(
  wallet: PaperWallet,
  asset: string,
  amount: number
): Promise<TradeResult> {
  if (amount <= 0) throw new Error('Amount must be positive');

  const assetUpper = asset.toUpperCase();
  const price = await fetchCurrentPrice(assetUpper);
  const usdtRequired = amount * price;
  const fee = usdtRequired * FEE_RATE;
  const totalCost = usdtRequired + fee;

  if (wallet.usdt < totalCost) {
    throw new Error(
      `Insufficient USDT. Need $${totalCost.toFixed(2)}, have $${wallet.usdt.toFixed(2)}`
    );
  }

  const existing = wallet.holdings[assetUpper];
  const prevAmount = existing?.amount ?? 0;
  const prevCost = existing?.totalCost ?? 0;
  const newTotalCost = prevCost + usdtRequired;
  const newAmount = prevAmount + amount;
  const newAvgBuyPrice = newTotalCost / newAmount;

  wallet.usdt -= totalCost;
  wallet.holdings[assetUpper] = {
    asset: assetUpper,
    amount: newAmount,
    avgBuyPrice: newAvgBuyPrice,
    totalCost: newTotalCost,
  };

  const trade: Trade = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    side: 'buy',
    asset: assetUpper,
    symbol: `${assetUpper}/USDT`,
    amount,
    price,
    usdtValue: usdtRequired,
    fee,
    feeAsset: 'USDT',
    balanceAfter: wallet.usdt,
  };

  wallet.trades.push(trade);
  saveWallet(wallet);

  return { trade, wallet };
}

export async function executeSell(
  wallet: PaperWallet,
  asset: string,
  amount: number
): Promise<TradeResult> {
  if (amount <= 0) throw new Error('Amount must be positive');

  const assetUpper = asset.toUpperCase();
  const holding = wallet.holdings[assetUpper];
  const available = holding?.amount ?? 0;

  if (!holding || available < amount - 1e-10) {
    throw new Error(
      `Insufficient ${assetUpper}. Need ${amount}, have ${available.toFixed(8)}`
    );
  }

  const price = await fetchCurrentPrice(assetUpper);
  const grossUsdt = amount * price;
  const fee = grossUsdt * FEE_RATE;
  const netUsdt = grossUsdt - fee;

  const newAmount = holding.amount - amount;
  if (newAmount < 1e-10) {
    delete wallet.holdings[assetUpper];
  } else {
    wallet.holdings[assetUpper] = {
      ...holding,
      amount: newAmount,
      totalCost: holding.avgBuyPrice * newAmount, // proportionally reduce cost basis
    };
  }

  wallet.usdt += netUsdt;

  const trade: Trade = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    side: 'sell',
    asset: assetUpper,
    symbol: `${assetUpper}/USDT`,
    amount,
    price,
    usdtValue: grossUsdt,
    fee,
    feeAsset: 'USDT',
    balanceAfter: wallet.usdt,
  };

  wallet.trades.push(trade);
  saveWallet(wallet);

  return { trade, wallet };
}

// ─── Portfolio Valuation ──────────────────────────────────────

export async function getPortfolioSummary(wallet: PaperWallet): Promise<PortfolioSummary> {
  const holdingsWithValues: HoldingWithValue[] = [];
  let holdingsValue = 0;

  for (const [asset, holding] of Object.entries(wallet.holdings)) {
    const price = await fetchCurrentPrice(asset);
    const value = holding.amount * price;
    const pnl = value - holding.totalCost;
    const pnlPct = holding.totalCost > 0 ? (pnl / holding.totalCost) * 100 : 0;

    holdingsValue += value;
    holdingsWithValues.push({
      asset,
      amount: holding.amount,
      price,
      value,
      avgBuyPrice: holding.avgBuyPrice,
      pnl,
      pnlPct,
      allocation: 0, // calculated below
    });
  }

  const totalValue = wallet.usdt + holdingsValue;

  // Calculate allocations
  for (const h of holdingsWithValues) {
    h.allocation = totalValue > 0 ? (h.value / totalValue) * 100 : 0;
  }
  holdingsWithValues.sort((a, b) => b.value - a.value);

  const totalPnl = totalValue - INITIAL_USDT;
  const totalPnlPct = (totalPnl / INITIAL_USDT) * 100;

  return {
    totalValue,
    usdtBalance: wallet.usdt,
    holdingsValue,
    initialValue: INITIAL_USDT,
    totalPnl,
    totalPnlPct,
    holdings: holdingsWithValues,
  };
}

// ─── Formatting helpers ───────────────────────────────────────

export function formatPrice(price: number): string {
  if (price >= 10_000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 100) return `$${price.toFixed(2)}`;
  if (price >= 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

export function formatPnl(pnl: number, pct: number): string {
  const sign = pnl >= 0 ? '+' : '';
  return `${sign}$${Math.abs(pnl).toFixed(2)} (${sign}${pct.toFixed(2)}%)`;
}

export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}
