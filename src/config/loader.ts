import { readFileSync, existsSync, statSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { ConfigSchema, type Config } from '../types/index.js';

// Config file search paths (in order of priority)
const CONFIG_PATHS = [
  join(homedir(), '.omnitrade', 'config.json'),
  join(process.cwd(), 'omnitrade.config.json'),
  join(process.cwd(), '.omnitrade.json'),
];

/**
 * Load and validate configuration from file
 * @throws Error if config not found or invalid
 */
export function loadConfig(): Config {
  for (const configPath of CONFIG_PATHS) {
    if (existsSync(configPath)) {
      // Security check: warn if file is world-readable
      checkFilePermissions(configPath);

      const raw = readFileSync(configPath, 'utf-8');
      
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error(`Invalid JSON in config file: ${configPath}`);
      }

      // Validate with Zod
      const result = ConfigSchema.safeParse(parsed);
      if (!result.success) {
        const errors = result.error.issues
          .map((e) => `  - ${e.path.join('.')}: ${e.message}`)
          .join('\n');
        throw new Error(`Invalid config at ${configPath}:\n${errors}`);
      }

      // Log which config was loaded (to stderr, not stdout which is for MCP)
      console.error(`✓ Config loaded from: ${configPath}`);
      console.error(`✓ Exchanges configured: ${Object.keys(result.data.exchanges).join(', ')}`);

      return result.data;
    }
  }

  // No config found - provide helpful error
  throw new Error(
    `Config file not found.\n\n` +
    `Create a config file at: ${CONFIG_PATHS[0]}\n\n` +
    `Example config:\n` +
    JSON.stringify(
      {
        exchanges: {
          binance: {
            apiKey: 'YOUR_API_KEY',
            secret: 'YOUR_SECRET',
            testnet: true,
          },
        },
        security: {
          maxOrderSize: 100,
          confirmTrades: true,
        },
      },
      null,
      2
    ) +
    `\n\nThen set permissions: chmod 600 ${CONFIG_PATHS[0]}\n` +
    `\nDocs: https://github.com/Connectry-io/omnitrade-mcp#configuration`
  );
}

/**
 * Check file permissions and warn if insecure
 */
function checkFilePermissions(configPath: string): void {
  try {
    const stats = statSync(configPath);
    const mode = stats.mode & 0o777;

    // Check if file is readable by group or others
    if (mode & 0o044) {
      console.error(`\n⚠️  SECURITY WARNING: Config file is readable by others!`);
      console.error(`   File: ${configPath}`);
      console.error(`   Current permissions: ${mode.toString(8)}`);
      console.error(`   Recommended: Run 'chmod 600 ${configPath}'\n`);
    }
  } catch {
    // Can't check permissions, continue anyway
  }
}

/**
 * Get the expected config path for documentation
 */
export function getConfigPath(): string {
  return CONFIG_PATHS[0]!;
}
