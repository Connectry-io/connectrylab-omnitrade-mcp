import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './Alerts.css';

interface Alert {
  id: string;
  symbol: string;
  condition: string;
  targetPrice: number;
  createdAt: number;
  triggered: boolean;
  triggeredAt?: number;
}

export const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showNewAlert, setShowNewAlert] = useState(false);
  const [newSymbol, setNewSymbol] = useState('BTC/USDT');
  const [newCondition, setNewCondition] = useState<'above' | 'below'>('above');
  const [newPrice, setNewPrice] = useState('');

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const data = await invoke<Alert[]>('get_alerts');
      setAlerts(data);
    } catch (error) {
      console.error('Failed to load alerts:', error);
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

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const handleCreateAlert = async () => {
    if (!newSymbol || !newPrice) return;
    
    try {
      await invoke<Alert>('add_alert', {
        symbol: newSymbol,
        condition: newCondition,
        price: parseFloat(newPrice),
      });
      setShowNewAlert(false);
      setNewPrice('');
      loadAlerts();
    } catch (error) {
      console.error('Failed to create alert:', error);
    }
  };

  const handleRemoveAlert = async (id: string) => {
    try {
      await invoke('remove_alert', { id });
      loadAlerts();
    } catch (error) {
      console.error('Failed to remove alert:', error);
    }
  };

  const activeAlerts = alerts.filter((a) => !a.triggered);
  const triggeredAlerts = alerts.filter((a) => a.triggered).slice(0, 10);

  return (
    <div className="alerts-view">
      {/* Header */}
      <div className="view-header">
        <h2 className="view-title">Alerts</h2>
        <button className="btn btn-primary" onClick={() => setShowNewAlert(true)}>
          + New Alert
        </button>
      </div>

      {/* New Alert Modal */}
      {showNewAlert && (
        <div className="modal-overlay" onClick={() => setShowNewAlert(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Alert</h3>
              <button className="modal-close" onClick={() => setShowNewAlert(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Symbol</label>
                <select
                  className="select"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="BTC/USDT">BTC/USDT</option>
                  <option value="ETH/USDT">ETH/USDT</option>
                  <option value="SOL/USDT">SOL/USDT</option>
                  <option value="BNB/USDT">BNB/USDT</option>
                  <option value="XRP/USDT">XRP/USDT</option>
                  <option value="ADA/USDT">ADA/USDT</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Condition</label>
                <select
                  className="select"
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value as 'above' | 'below')}
                  style={{ width: '100%' }}
                >
                  <option value="above">Price goes above</option>
                  <option value="below">Price goes below</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Target Price</label>
                <input
                  type="number"
                  className="input"
                  placeholder="0.00"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowNewAlert(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreateAlert}>
                Create Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Alerts */}
      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">Active Alerts</h3>
          <span className="badge badge-teal">{activeAlerts.length} active</span>
        </div>
        <div className="panel-content">
          {activeAlerts.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Condition</th>
                  <th>Target</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeAlerts.map((alert) => (
                  <tr key={alert.id}>
                    <td><span className="symbol-name">{alert.symbol}</span></td>
                    <td>{alert.condition}</td>
                    <td className="text-mono">{formatCurrency(alert.targetPrice)}</td>
                    <td className="text-muted">{formatTimeAgo(alert.createdAt)}</td>
                    <td>
                      <button 
                        className="btn btn-sm btn-danger"
                        onClick={() => handleRemoveAlert(alert.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <p>No active alerts</p>
              <p className="text-muted">Create an alert to get notified when prices move</p>
            </div>
          )}
        </div>
      </div>

      {/* Triggered Alerts */}
      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">Triggered</h3>
          <span className="badge badge-muted">{triggeredAlerts.length} recent</span>
        </div>
        <div className="panel-content">
          {triggeredAlerts.length > 0 ? (
            <table className="table triggered-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Condition</th>
                  <th>Target</th>
                  <th>Triggered</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {triggeredAlerts.map((alert) => (
                  <tr key={alert.id} className="triggered-row">
                    <td><span className="symbol-name">{alert.symbol}</span></td>
                    <td>{alert.condition}</td>
                    <td className="text-mono">{formatCurrency(alert.targetPrice)}</td>
                    <td className="text-muted">
                      {alert.triggeredAt ? formatTimeAgo(alert.triggeredAt) : 'Unknown'}
                    </td>
                    <td>
                      <span className="badge badge-green">✓ triggered</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <p className="text-muted">No triggered alerts yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Alerts;
