use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DCAConfig {
    pub id: String,
    pub asset: String,
    pub amount: f64,
    pub frequency: String, // "daily", "weekly", "monthly"
    pub enabled: bool,
    pub last_run: Option<i64>,
    pub next_run: Option<i64>,
    pub executions: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct DCAFile {
    configs: Vec<DCAConfig>,
}

fn get_omnitrade_dir() -> PathBuf {
    let home = dirs::home_dir().expect("Could not find home directory");
    home.join(".omnitrade")
}

fn get_dca_path() -> PathBuf {
    get_omnitrade_dir().join("dca.json")
}

fn load_dca_configs() -> Result<Vec<DCAConfig>, String> {
    let dca_path = get_dca_path();
    
    if !dca_path.exists() {
        return Ok(vec![]);
    }
    
    let content = fs::read_to_string(&dca_path).map_err(|e| e.to_string())?;
    let file: DCAFile = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    
    Ok(file.configs)
}

fn save_dca_configs(configs: &[DCAConfig]) -> Result<(), String> {
    let dca_path = get_dca_path();
    let omnitrade_dir = get_omnitrade_dir();
    
    // Ensure directory exists
    if !omnitrade_dir.exists() {
        fs::create_dir_all(&omnitrade_dir).map_err(|e| e.to_string())?;
    }
    
    let file = DCAFile {
        configs: configs.to_vec(),
    };
    
    let content = serde_json::to_string_pretty(&file).map_err(|e| e.to_string())?;
    fs::write(&dca_path, content).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn get_dca_configs() -> Result<Vec<DCAConfig>, String> {
    load_dca_configs()
}

#[tauri::command]
pub async fn toggle_dca(id: String, enabled: bool) -> Result<(), String> {
    let mut configs = load_dca_configs()?;
    
    for config in configs.iter_mut() {
        if config.id == id {
            config.enabled = enabled;
            break;
        }
    }
    
    save_dca_configs(&configs)?;
    Ok(())
}
