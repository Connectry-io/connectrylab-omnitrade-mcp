use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExchangeConfig {
    pub api_key: String,
    pub secret: String,
    pub testnet: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SecurityConfig {
    pub max_order_size: f64,
    pub confirm_trades: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationConfig {
    pub native: Option<bool>,
    pub telegram: Option<TelegramConfig>,
    pub discord: Option<DiscordConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TelegramConfig {
    pub enabled: bool,
    pub bot_token: Option<String>,
    pub chat_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscordConfig {
    pub enabled: bool,
    pub webhook_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    pub exchanges: HashMap<String, ExchangeConfig>,
    pub security: Option<SecurityConfig>,
    pub notifications: Option<NotificationConfig>,
}

fn get_omnitrade_dir() -> PathBuf {
    let home = dirs::home_dir().expect("Could not find home directory");
    home.join(".omnitrade")
}

fn get_config_path() -> PathBuf {
    get_omnitrade_dir().join("config.json")
}

fn mask_key(key: &str) -> String {
    if key.len() < 10 {
        return "***".to_string();
    }
    format!("{}...{}", &key[..5], &key[key.len()-5..])
}

#[tauri::command]
pub async fn get_config() -> Result<Config, String> {
    let config_path = get_config_path();
    
    if !config_path.exists() {
        // Return empty config if not exists
        return Ok(Config {
            exchanges: HashMap::new(),
            security: Some(SecurityConfig {
                max_order_size: 100.0,
                confirm_trades: true,
            }),
            notifications: None,
        });
    }
    
    let content = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
    let mut config: Config = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    
    // Mask sensitive fields before returning
    for (_, exchange) in config.exchanges.iter_mut() {
        exchange.api_key = mask_key(&exchange.api_key);
        exchange.secret = "********".to_string();
    }
    
    Ok(config)
}

#[tauri::command]
pub async fn save_exchange(
    name: String,
    api_key: String,
    secret: String,
    testnet: bool,
) -> Result<(), String> {
    let config_path = get_config_path();
    let omnitrade_dir = get_omnitrade_dir();
    
    // Ensure directory exists
    if !omnitrade_dir.exists() {
        fs::create_dir_all(&omnitrade_dir).map_err(|e| e.to_string())?;
    }
    
    // Load existing config or create new
    let mut config: Config = if config_path.exists() {
        let content = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).map_err(|e| e.to_string())?
    } else {
        Config {
            exchanges: HashMap::new(),
            security: Some(SecurityConfig {
                max_order_size: 100.0,
                confirm_trades: true,
            }),
            notifications: None,
        }
    };
    
    // Update or add exchange
    config.exchanges.insert(name, ExchangeConfig {
        api_key,
        secret,
        testnet,
    });
    
    // Save config
    let content = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(&config_path, content).map_err(|e| e.to_string())?;
    
    Ok(())
}
