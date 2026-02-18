// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use commands::{alerts, config, daemon, dca, portfolio, prices};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::Mutex;

#[derive(Default)]
pub struct AppState {
    pub prices_cache: Arc<Mutex<Vec<prices::PriceData>>>,
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            // Prices
            prices::get_prices,
            // Portfolio
            portfolio::get_paper_portfolio,
            portfolio::get_live_portfolio,
            // Alerts
            alerts::get_alerts,
            alerts::add_alert,
            alerts::remove_alert,
            // Config
            config::get_config,
            config::save_exchange,
            // Daemon
            daemon::get_daemon_status,
            daemon::start_daemon,
            daemon::stop_daemon,
            daemon::get_daemon_log,
            // DCA
            dca::get_dca_configs,
            dca::toggle_dca,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            
            // Spawn background task for price updates
            tauri::async_runtime::spawn(async move {
                price_update_loop(handle).await;
            });
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn price_update_loop(app: AppHandle) {
    let symbols = vec![
        "BTCUSDT".to_string(),
        "ETHUSDT".to_string(),
        "SOLUSDT".to_string(),
        "BNBUSDT".to_string(),
        "XRPUSDT".to_string(),
        "ADAUSDT".to_string(),
    ];
    
    loop {
        match prices::fetch_prices_from_binance(&symbols).await {
            Ok(price_data) => {
                // Emit price update event to frontend
                let _ = app.emit("prices-update", &price_data);
                
                // Update cache in state
                if let Some(state) = app.try_state::<AppState>() {
                    let mut cache = state.prices_cache.lock().await;
                    *cache = price_data;
                }
            }
            Err(e) => {
                eprintln!("Failed to fetch prices: {}", e);
            }
        }
        
        // Wait 5 seconds before next update
        tokio::time::sleep(Duration::from_secs(5)).await;
    }
}
