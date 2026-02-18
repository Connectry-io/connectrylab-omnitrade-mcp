use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use chrono::Utc;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Alert {
    pub id: String,
    pub symbol: String,
    pub condition: String,
    pub target_price: f64,
    pub created_at: i64,
    pub triggered: bool,
    pub triggered_at: Option<i64>,
    pub exchange: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AlertsFile {
    alerts: Vec<Alert>,
}

fn get_omnitrade_dir() -> PathBuf {
    let home = dirs::home_dir().expect("Could not find home directory");
    home.join(".omnitrade")
}

fn get_alerts_path() -> PathBuf {
    get_omnitrade_dir().join("alerts.json")
}

fn load_alerts() -> Result<Vec<Alert>, String> {
    let alerts_path = get_alerts_path();
    
    if !alerts_path.exists() {
        return Ok(vec![]);
    }
    
    let content = fs::read_to_string(&alerts_path).map_err(|e| e.to_string())?;
    let file: AlertsFile = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    
    Ok(file.alerts)
}

fn save_alerts(alerts: &[Alert]) -> Result<(), String> {
    let alerts_path = get_alerts_path();
    let omnitrade_dir = get_omnitrade_dir();
    
    // Ensure directory exists
    if !omnitrade_dir.exists() {
        fs::create_dir_all(&omnitrade_dir).map_err(|e| e.to_string())?;
    }
    
    let file = AlertsFile {
        alerts: alerts.to_vec(),
    };
    
    let content = serde_json::to_string_pretty(&file).map_err(|e| e.to_string())?;
    fs::write(&alerts_path, content).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn get_alerts() -> Result<Vec<Alert>, String> {
    load_alerts()
}

#[tauri::command]
pub async fn add_alert(symbol: String, condition: String, price: f64) -> Result<Alert, String> {
    let mut alerts = load_alerts()?;
    
    let new_alert = Alert {
        id: format!("alert_{}_{}", Utc::now().timestamp_millis(), generate_id()),
        symbol,
        condition,
        target_price: price,
        created_at: Utc::now().timestamp_millis(),
        triggered: false,
        triggered_at: None,
        exchange: Some("binance".to_string()),
    };
    
    alerts.push(new_alert.clone());
    save_alerts(&alerts)?;
    
    Ok(new_alert)
}

#[tauri::command]
pub async fn remove_alert(id: String) -> Result<(), String> {
    let mut alerts = load_alerts()?;
    alerts.retain(|a| a.id != id);
    save_alerts(&alerts)?;
    Ok(())
}

fn generate_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap();
    format!("{:x}", duration.as_nanos() & 0xFFFFFF)
}
