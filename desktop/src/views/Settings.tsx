import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './Settings.css';

interface ExchangeConfig {
  name: string;
  apiKey: string;
  secret: string;
  testnet: boolean;
}

interface Config {
  exchanges: Record<string, ExchangeConfig>;
  notifications?: {
    native?: boolean;
    telegram?: {
      enabled: boolean;
      botToken?: string;
      chatId?: string;
    };
    discord?: {
      enabled: boolean;
      webhookUrl?: string;
    };
  };
}

interface DaemonStatus {
  running: boolean;
  pid?: number;
  uptime?: string;
}

export const Settings: React.FC = () => {
  const [config, setConfig] = useState<Config | null>(null);
  const [daemonStatus, setDaemonStatus] = useState<DaemonStatus>({ running: false });
  const [showAddExchange, setShowAddExchange] = useState(false);
  const [editingExchange, setEditingExchange] = useState<string | null>(null);
  const [newExchange, setNewExchange] = useState({
    name: 'binance',
    apiKey: '',
    secret: '',
    testnet: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [configData, statusData] = await Promise.all([
        invoke<Config>('get_config'),
        invoke<DaemonStatus>('get_daemon_status'),
      ]);
      setConfig(configData);
      setDaemonStatus(statusData);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSaveExchange = async () => {
    try {
      await invoke('save_exchange', {
        name: newExchange.name,
        apiKey: newExchange.apiKey,
        secret: newExchange.secret,
        testnet: newExchange.testnet,
      });
      setShowAddExchange(false);
      setEditingExchange(null);
      setNewExchange({ name: 'binance', apiKey: '', secret: '', testnet: false });
      loadData();
    } catch (error) {
      console.error('Failed to save exchange:', error);
    }
  };

  const handleStartDaemon = async () => {
    try {
      await invoke('start_daemon');
      loadData();
    } catch (error) {
      console.error('Failed to start daemon:', error);
    }
  };

  const handleStopDaemon = async () => {
    try {
      await invoke('stop_daemon');
      loadData();
    } catch (error) {
      console.error('Failed to stop daemon:', error);
    }
  };

  const maskApiKey = (key: string): string => {
    if (!key || key.length < 10) return '***';
    return `${key.slice(0, 5)}...${key.slice(-5)}`;
  };

  return (
    <div className="settings-view">
      <div className="view-header">
        <h2 className="view-title">Settings</h2>
      </div>

      {/* Exchange API Keys */}
      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">Exchange API Keys</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddExchange(true)}>
            + Add Exchange
          </button>
        </div>
        <div className="panel-content">
          {config && Object.keys(config.exchanges).length > 0 ? (
            <div className="exchanges-list">
              {Object.entries(config.exchanges).map(([name, exchange]) => (
                <div key={name} className="exchange-item">
                  <div className="exchange-info">
                    <span className="exchange-name">{name}</span>
                    <span className={`badge ${exchange.testnet ? 'badge-muted' : 'badge-green'}`}>
                      {exchange.testnet ? 'testnet' : 'live'}
                    </span>
                  </div>
                  <div className="exchange-key text-mono text-muted">
                    apiKey: {maskApiKey(exchange.apiKey)}
                  </div>
                  <div className="exchange-actions">
                    <button 
                      className="btn btn-sm btn-secondary"
                      onClick={() => {
                        setEditingExchange(name);
                        setNewExchange({
                          name,
                          apiKey: '',
                          secret: '',
                          testnet: exchange.testnet,
                        });
                        setShowAddExchange(true);
                      }}
                    >
                      Edit
                    </button>
                    <button className="btn btn-sm btn-danger">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No exchanges configured</p>
              <p className="text-muted">Add an exchange to enable live trading</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Exchange Modal */}
      {showAddExchange && (
        <div className="modal-overlay" onClick={() => setShowAddExchange(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingExchange ? `Edit ${editingExchange}` : 'Add Exchange'}
              </h3>
              <button className="modal-close" onClick={() => setShowAddExchange(false)}>×</button>
            </div>
            <div className="modal-body">
              {!editingExchange && (
                <div className="form-group">
                  <label className="form-label">Exchange</label>
                  <select
                    className="select"
                    value={newExchange.name}
                    onChange={(e) => setNewExchange({ ...newExchange, name: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="binance">Binance</option>
                    <option value="kraken">Kraken</option>
                    <option value="coinbase">Coinbase Pro</option>
                    <option value="kucoin">KuCoin</option>
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">API Key</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Enter API key"
                  value={newExchange.apiKey}
                  onChange={(e) => setNewExchange({ ...newExchange, apiKey: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Secret</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Enter secret"
                  value={newExchange.secret}
                  onChange={(e) => setNewExchange({ ...newExchange, secret: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="toggle-label">
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={newExchange.testnet}
                      onChange={(e) => setNewExchange({ ...newExchange, testnet: e.target.checked })}
                    />
                    <span className="toggle-track" />
                    <span className="toggle-thumb" />
                  </label>
                  <span>Use Testnet</span>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddExchange(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveExchange}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">Notifications</h3>
        </div>
        <div className="panel-content">
          <div className="settings-list">
            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-name">Native OS</span>
              </div>
              <label className="toggle">
                <input type="checkbox" defaultChecked />
                <span className="toggle-track" />
                <span className="toggle-thumb" />
              </label>
            </div>
            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-name">Telegram</span>
                {config?.notifications?.telegram?.enabled && (
                  <span className="setting-detail text-muted">
                    Chat ID: {config.notifications.telegram.chatId}
                  </span>
                )}
              </div>
              <div className="setting-actions">
                <label className="toggle">
                  <input 
                    type="checkbox" 
                    checked={config?.notifications?.telegram?.enabled || false}
                    readOnly
                  />
                  <span className="toggle-track" />
                  <span className="toggle-thumb" />
                </label>
                <button className="btn btn-sm btn-secondary">Edit</button>
              </div>
            </div>
            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-name">Discord</span>
              </div>
              <div className="setting-actions">
                <label className="toggle">
                  <input type="checkbox" checked={false} readOnly />
                  <span className="toggle-track" />
                  <span className="toggle-thumb" />
                </label>
                <button className="btn btn-sm btn-secondary">Configure</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daemon */}
      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">Daemon</h3>
        </div>
        <div className="panel-content">
          <div className="daemon-status">
            <div className="status-row">
              <span className="status-label">Status:</span>
              <span className={`status-indicator ${daemonStatus.running ? 'running' : 'stopped'}`}>
                {daemonStatus.running ? '● Running' : '○ Stopped'}
              </span>
            </div>
            {daemonStatus.running && (
              <>
                <div className="status-row">
                  <span className="status-label">PID:</span>
                  <span className="text-mono">{daemonStatus.pid}</span>
                </div>
                <div className="status-row">
                  <span className="status-label">Uptime:</span>
                  <span className="text-muted">{daemonStatus.uptime || 'Unknown'}</span>
                </div>
              </>
            )}
          </div>
          <div className="daemon-actions">
            {daemonStatus.running ? (
              <button className="btn btn-danger" onClick={handleStopDaemon}>
                Stop Daemon
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleStartDaemon}>
                Start Daemon
              </button>
            )}
            <button className="btn btn-secondary">View Full Log</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
