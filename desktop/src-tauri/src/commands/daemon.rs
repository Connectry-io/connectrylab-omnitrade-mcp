use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DaemonStatus {
    pub running: bool,
    pub pid: Option<u32>,
    pub uptime: Option<String>,
}

fn get_omnitrade_dir() -> PathBuf {
    let home = dirs::home_dir().expect("Could not find home directory");
    home.join(".omnitrade")
}

fn get_pid_path() -> PathBuf {
    get_omnitrade_dir().join("daemon.pid")
}

fn get_log_path() -> PathBuf {
    get_omnitrade_dir().join("daemon.log")
}

fn is_process_running(pid: u32) -> bool {
    #[cfg(unix)]
    {
        use std::process::Command;
        Command::new("kill")
            .args(["-0", &pid.to_string()])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
    #[cfg(windows)]
    {
        // On Windows, check if process exists
        Command::new("tasklist")
            .args(["/FI", &format!("PID eq {}", pid)])
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).contains(&pid.to_string()))
            .unwrap_or(false)
    }
}

#[tauri::command]
pub async fn get_daemon_status() -> Result<DaemonStatus, String> {
    let pid_path = get_pid_path();
    
    if !pid_path.exists() {
        return Ok(DaemonStatus {
            running: false,
            pid: None,
            uptime: None,
        });
    }
    
    let pid_str = fs::read_to_string(&pid_path).map_err(|e| e.to_string())?;
    let pid: u32 = pid_str.trim().parse().map_err(|e: std::num::ParseIntError| e.to_string())?;
    
    if is_process_running(pid) {
        // Calculate uptime from file modification time
        let metadata = fs::metadata(&pid_path).ok();
        let uptime = metadata
            .and_then(|m| m.modified().ok())
            .map(|modified| {
                let elapsed = modified.elapsed().unwrap_or_default();
                format_duration(elapsed.as_secs())
            });
        
        Ok(DaemonStatus {
            running: true,
            pid: Some(pid),
            uptime,
        })
    } else {
        // Process not running, clean up PID file
        let _ = fs::remove_file(&pid_path);
        Ok(DaemonStatus {
            running: false,
            pid: None,
            uptime: None,
        })
    }
}

fn format_duration(seconds: u64) -> String {
    let hours = seconds / 3600;
    let minutes = (seconds % 3600) / 60;
    
    if hours > 0 {
        format!("{}h {}m", hours, minutes)
    } else {
        format!("{}m", minutes)
    }
}

#[tauri::command]
pub async fn start_daemon() -> Result<(), String> {
    // Check if already running
    let status = get_daemon_status().await?;
    if status.running {
        return Err("Daemon is already running".to_string());
    }
    
    // Start the daemon using omnitrade CLI
    let output = Command::new("omnitrade")
        .args(["daemon", "start"])
        .output()
        .map_err(|e| format!("Failed to start daemon: {}", e))?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Daemon failed to start: {}", stderr));
    }
    
    Ok(())
}

#[tauri::command]
pub async fn stop_daemon() -> Result<(), String> {
    let status = get_daemon_status().await?;
    
    if !status.running {
        return Err("Daemon is not running".to_string());
    }
    
    if let Some(pid) = status.pid {
        #[cfg(unix)]
        {
            Command::new("kill")
                .args(["-TERM", &pid.to_string()])
                .output()
                .map_err(|e| format!("Failed to stop daemon: {}", e))?;
        }
        
        #[cfg(windows)]
        {
            Command::new("taskkill")
                .args(["/PID", &pid.to_string(), "/F"])
                .output()
                .map_err(|e| format!("Failed to stop daemon: {}", e))?;
        }
        
        // Clean up PID file
        let _ = fs::remove_file(get_pid_path());
    }
    
    Ok(())
}

#[tauri::command]
pub async fn get_daemon_log(lines: u32) -> Result<Vec<String>, String> {
    let log_path = get_log_path();
    
    if !log_path.exists() {
        return Ok(vec![]);
    }
    
    let content = fs::read_to_string(&log_path).map_err(|e| e.to_string())?;
    let all_lines: Vec<String> = content.lines().map(|s| s.to_string()).collect();
    
    // Return last N lines
    let start = if all_lines.len() > lines as usize {
        all_lines.len() - lines as usize
    } else {
        0
    };
    
    Ok(all_lines[start..].to_vec())
}
