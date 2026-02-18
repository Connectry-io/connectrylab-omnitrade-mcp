import { z } from 'zod';

// ============================================
// Configuration Schemas
// ============================================

export const ExchangeConfigSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  secret: z.string().min(1, 'Secret is required'),
  password: z.string().optional(), // For exchanges requiring passphrase (Coinbase, KuCoin)
  testnet: z.boolean().default(true), // Default to testnet for safety
});

export const SecurityConfigSchema = z.object({
  confirmTrades: z.boolean().default(true),
  maxOrderSize: z.number().positive().default(100), // Max USD per order
  allowedPairs: z.array(z.string()).optional(), // Whitelist of trading pairs
  testnetOnly: z.boolean().default(false), // Force testnet mode globally
  disableWithdrawals: z.boolean().default(true), // Extra safety (we don't support withdrawals anyway)
});

export const NotificationConfigSchema = z.object({
  telegram: z.object({
    enabled: z.boolean().default(false),
    botToken: z.string().optional(),
    chatId: z.string().optional(),
  }).optional(),
  discord: z.object({
    enabled: z.boolean().default(false),
    webhookUrl: z.string().optional(),
  }).optional(),
  native: z.object({
    enabled: z.boolean().default(false),
  }).optional(),
});

export const DaemonConfigSchema = z.object({
  pollInterval: z.number().int().positive().default(60), // seconds between price checks
  logFile: z.string().optional(), // custom log path (default: ~/.omnitrade/daemon.log)
});

export const ConfigSchema = z.object({
  exchanges: z.record(z.string(), ExchangeConfigSchema),
  security: SecurityConfigSchema.optional(),
  defaultExchange: z.string().optional(),
  notifications: NotificationConfigSchema.optional(),
  daemon: DaemonConfigSchema.optional(),
});

export type Config = z.infer<typeof ConfigSchema>;
export type ExchangeConfig = z.infer<typeof ExchangeConfigSchema>;
export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;
export type NotificationConfig = z.infer<typeof NotificationConfigSchema>;
export type DaemonConfig = z.infer<typeof DaemonConfigSchema>;

// ============================================
// Response Types
// ============================================

export interface Balance {
  exchange: string;
  asset: string;
  free: number;
  locked: number;
  total: number;
  usdValue?: number;
}

export interface BalanceError extends Balance {
  error: string;
}

export interface Price {
  exchange: string;
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  timestamp: number;
}

export interface PriceComparison {
  recommendation: string;
  bestExchange: string;
  bestPrice: number;
  allPrices: Array<{ exchange: string; price: number }>;
  savings: {
    amount: number;
    percent: string;
    vs: string;
  };
}

export interface Order {
  id: string;
  exchange: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  amount: number;
  price?: number;
  filled: number;
  remaining: number;
  cost?: number;
  status: string;
  timestamp: number;
}

export interface OrderResult {
  success: boolean;
  orderId: string;
  exchange: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  amount: number;
  filled: number;
  remaining: number;
  price?: number;
  cost?: number;
  status: string;
  timestamp: number;
}

export interface ArbitrageOpportunity {
  symbol: string;
  buyExchange: string;
  buyPrice: number;
  sellExchange: string;
  sellPrice: number;
  spreadPercent: number;
  potentialProfit: number;
}

export interface ArbitrageResult {
  found: number;
  opportunities: ArbitrageOpportunity[];
  note: string;
}

// ============================================
// MCP Tool Response
// ============================================

export interface ToolResponse {
  [key: string]: unknown;
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}
