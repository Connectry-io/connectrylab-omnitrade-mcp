use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PriceData {
    pub symbol: String,
    pub price: f64,
    pub change_24h: f64,
    pub volume_24h: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BinanceTicker {
    symbol: String,
    last_price: String,
    price_change_percent: String,
    quote_volume: String,
}

pub async fn fetch_prices_from_binance(symbols: &[String]) -> Result<Vec<PriceData>, String> {
    let symbols_json = serde_json::to_string(symbols).map_err(|e| e.to_string())?;
    let url = format!(
        "https://api.binance.com/api/v3/ticker/24hr?symbols={}",
        urlencoding::encode(&symbols_json)
    );
    
    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    let tickers: Vec<BinanceTicker> = response.json().await.map_err(|e| e.to_string())?;
    
    let prices: Vec<PriceData> = tickers
        .into_iter()
        .map(|ticker| {
            let symbol = format_symbol(&ticker.symbol);
            PriceData {
                symbol,
                price: ticker.last_price.parse().unwrap_or(0.0),
                change_24h: ticker.price_change_percent.parse().unwrap_or(0.0),
                volume_24h: ticker.quote_volume.parse().unwrap_or(0.0),
            }
        })
        .collect();
    
    Ok(prices)
}

fn format_symbol(binance_symbol: &str) -> String {
    // Convert BTCUSDT to BTC/USDT
    if binance_symbol.ends_with("USDT") {
        let base = &binance_symbol[..binance_symbol.len() - 4];
        return format!("{}/USDT", base);
    }
    binance_symbol.to_string()
}

#[tauri::command]
pub async fn get_prices(symbols: Vec<String>) -> Result<Vec<PriceData>, String> {
    // Convert symbols like "BTC/USDT" to "BTCUSDT" for Binance API
    let binance_symbols: Vec<String> = symbols
        .iter()
        .map(|s| s.replace("/", ""))
        .collect();
    
    fetch_prices_from_binance(&binance_symbols).await
}
