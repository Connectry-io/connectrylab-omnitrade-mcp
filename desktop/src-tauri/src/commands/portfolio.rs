use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Holding {
    pub asset: String,
    pub amount: f64,
    pub avg_buy_price: f64,
    pub total_cost: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaperWallet {
    pub version: i32,
    pub created_at: i64,
    pub usdt: f64,
    pub holdings: HashMap<String, Holding>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PortfolioData {
    pub total_value: f64,
    pub holdings: Vec<Holding>,
}

fn get_omnitrade_dir() -> PathBuf {
    let home = dirs::home_dir().expect("Could not find home directory");
    home.join(".omnitrade")
}

#[tauri::command]
pub async fn get_paper_portfolio() -> Result<PaperWallet, String> {
    let wallet_path = get_omnitrade_dir().join("paper-wallet.json");
    
    if !wallet_path.exists() {
        // Return default wallet if not exists
        return Ok(PaperWallet {
            version: 1,
            created_at: chrono::Utc::now().timestamp_millis(),
            usdt: 10000.0,
            holdings: HashMap::new(),
        });
    }
    
    let content = fs::read_to_string(&wallet_path).map_err(|e| e.to_string())?;
    let wallet: PaperWallet = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    
    Ok(wallet)
}

#[tauri::command]
pub async fn get_live_portfolio(_exchange: String) -> Result<PortfolioData, String> {
    // For now, return empty portfolio
    // In a full implementation, this would use the exchange's REST API with stored credentials
    Ok(PortfolioData {
        total_value: 0.0,
        holdings: vec![],
    })
}
