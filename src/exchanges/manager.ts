import ccxt, { type Exchange } from 'ccxt';
import type { Config, ExchangeConfig } from '../types/index.js';

/**
 * Manages connections to multiple cryptocurrency exchanges
 */
export class ExchangeManager {
  private exchanges: Map<string, Exchange> = new Map();
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.initializeExchanges();
  }

  /**
   * Initialize exchange connections from config
   */
  private initializeExchanges(): void {
    for (const [name, exchangeConfig] of Object.entries(this.config.exchanges)) {
      try {
        const exchange = this.createExchange(name, exchangeConfig);
        if (exchange) {
          this.exchanges.set(name, exchange);
          console.error(`✓ Exchange initialized: ${name}${exchangeConfig.testnet ? ' (testnet)' : ''}`);
        }
      } catch (error) {
        console.error(`✗ Failed to initialize ${name}: ${(error as Error).message}`);
      }
    }

    if (this.exchanges.size === 0) {
      throw new Error('No exchanges could be initialized. Check your config.');
    }
  }

  /**
   * Create a CCXT exchange instance
   */
  private createExchange(name: string, config: ExchangeConfig): Exchange | null {
    // Check if exchange is supported by CCXT
    const exchangeId = name.toLowerCase();
    if (!ccxt.exchanges.includes(exchangeId)) {
      console.error(`✗ Unknown exchange: ${name}. Supported: ${ccxt.exchanges.slice(0, 10).join(', ')}...`);
      return null;
    }

    // Get the exchange class
    const ExchangeClass = (ccxt as unknown as Record<string, typeof Exchange>)[exchangeId];
    if (!ExchangeClass) {
      console.error(`✗ Could not load exchange class: ${name}`);
      return null;
    }

    // Create exchange instance
    const exchange = new ExchangeClass({
      apiKey: config.apiKey,
      secret: config.secret,
      password: config.password,
      enableRateLimit: true, // Respect rate limits
      options: {
        defaultType: 'spot', // Default to spot trading
        adjustForTimeDifference: true, // Handle time sync issues
      },
    });

    // Enable sandbox/testnet mode if configured
    if (config.testnet) {
      try {
        exchange.setSandboxMode(true);
      } catch {
        // Some exchanges don't support sandbox mode
        console.error(`⚠ ${name} does not support testnet mode, using production`);
      }
    }

    return exchange;
  }

  /**
   * Get a specific exchange by name
   */
  get(name: string): Exchange | undefined {
    return this.exchanges.get(name.toLowerCase());
  }

  /**
   * Get all initialized exchanges
   */
  getAll(): Map<string, Exchange> {
    return this.exchanges;
  }

  /**
   * Get list of initialized exchange names
   */
  getNames(): string[] {
    return Array.from(this.exchanges.keys());
  }

  /**
   * Get the default exchange (first configured or explicitly set)
   */
  getDefault(): Exchange | undefined {
    if (this.config.defaultExchange) {
      return this.exchanges.get(this.config.defaultExchange.toLowerCase());
    }
    // Return first exchange if no default set
    return this.exchanges.values().next().value;
  }

  /**
   * Get default exchange name
   */
  getDefaultName(): string | undefined {
    if (this.config.defaultExchange) {
      return this.config.defaultExchange.toLowerCase();
    }
    return this.exchanges.keys().next().value;
  }

  /**
   * Check if an exchange is in testnet mode
   */
  isTestnet(name: string): boolean {
    const config = this.config.exchanges[name];
    return config?.testnet ?? true;
  }
}
