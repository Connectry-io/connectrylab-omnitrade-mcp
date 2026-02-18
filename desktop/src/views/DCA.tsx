import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './DCA.css';

interface DCAConfig {
  id: string;
  asset: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  enabled: boolean;
  lastRun?: number;
  nextRun?: number;
  executions: number;
}

interface DCAExecution {
  timestamp: number;
  asset: string;
  amount: number;
  price: number;
  status: 'executed' | 'failed';
}

export const DCA: React.FC = () => {
  const [configs, setConfigs] = useState<DCAConfig[]>([]);
  const [executions, _setExecutions] = useState<DCAExecution[]>([]);
  const [showNewStrategy, setShowNewStrategy] = useState(false);
  const [newAsset, setNewAsset] = useState('BTC');
  const [newAmount, setNewAmount] = useState('');
  const [newFrequency, setNewFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await invoke<DCAConfig[]>('get_dca_configs');
      setConfigs(data);
      // Executions would come from daemon log parsing
    } catch (error) {
      console.error('Failed to load DCA configs:', error);
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTimeUntil = (timestamp: number): string => {
    const diff = timestamp - Date.now();
    if (diff < 0) return 'overdue';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `in ${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    return 'soon';
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await invoke('toggle_dca', { id, enabled: !enabled });
      loadData();
    } catch (error) {
      console.error('Failed to toggle DCA:', error);
    }
  };

  const handleCreateStrategy = async () => {
    if (!newAsset || !newAmount) return;
    
    // Note: This would need a new Tauri command to create DCA configs
    console.log('Creating strategy:', { newAsset, newAmount, newFrequency });
    setShowNewStrategy(false);
    setNewAmount('');
    // loadData();
  };

  const frequencyLabel = (freq: string): string => {
    switch (freq) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      default: return freq;
    }
  };

  return (
    <div className="dca-view">
      {/* Header */}
      <div className="view-header">
        <h2 className="view-title">Dollar Cost Average</h2>
        <button className="btn btn-primary" onClick={() => setShowNewStrategy(true)}>
          + New Strategy
        </button>
      </div>

      {/* New Strategy Modal */}
      {showNewStrategy && (
        <div className="modal-overlay" onClick={() => setShowNewStrategy(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create DCA Strategy</h3>
              <button className="modal-close" onClick={() => setShowNewStrategy(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Asset</label>
                <select
                  className="select"
                  value={newAsset}
                  onChange={(e) => setNewAsset(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="BTC">Bitcoin (BTC)</option>
                  <option value="ETH">Ethereum (ETH)</option>
                  <option value="SOL">Solana (SOL)</option>
                  <option value="BNB">BNB</option>
                  <option value="XRP">XRP</option>
                  <option value="ADA">Cardano (ADA)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Amount (USD)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="50"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Frequency</label>
                <select
                  className="select"
                  value={newFrequency}
                  onChange={(e) => setNewFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                  style={{ width: '100%' }}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowNewStrategy(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreateStrategy}>
                Create Strategy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Strategies */}
      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">Active Strategies</h3>
        </div>
        <div className="panel-content">
          {configs.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Amount</th>
                  <th>Frequency</th>
                  <th>Last Run</th>
                  <th>Next Run</th>
                  <th>Executions</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {configs.map((config) => (
                  <tr key={config.id}>
                    <td><span className="asset-name">{config.asset}</span></td>
                    <td className="text-mono">{formatCurrency(config.amount)}</td>
                    <td>{frequencyLabel(config.frequency)}</td>
                    <td className="text-muted">
                      {config.lastRun ? formatDate(config.lastRun) : 'Never'}
                    </td>
                    <td className="text-muted">
                      {config.nextRun ? formatTimeUntil(config.nextRun) : 'N/A'}
                    </td>
                    <td className="text-mono">{config.executions}</td>
                    <td>
                      <label className="toggle">
                        <input
                          type="checkbox"
                          checked={config.enabled}
                          onChange={() => handleToggle(config.id, config.enabled)}
                        />
                        <span className="toggle-track" />
                        <span className="toggle-thumb" />
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <p>No DCA strategies configured</p>
              <p className="text-muted">Create a strategy to automatically buy crypto on a schedule</p>
            </div>
          )}
        </div>
      </div>

      {/* Execution History */}
      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">Execution History</h3>
        </div>
        <div className="panel-content">
          {executions.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Asset</th>
                  <th>Amount</th>
                  <th>Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {executions.map((exec, index) => (
                  <tr key={index}>
                    <td className="text-muted">{formatDate(exec.timestamp)}</td>
                    <td><span className="asset-name">{exec.asset}</span></td>
                    <td className="text-mono">{formatCurrency(exec.amount)}</td>
                    <td className="text-mono">{formatCurrency(exec.price)}</td>
                    <td>
                      <span className={`badge ${exec.status === 'executed' ? 'badge-green' : 'badge-red'}`}>
                        {exec.status === 'executed' ? '✓ executed' : '✗ failed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <p className="text-muted">No executions yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DCA;
