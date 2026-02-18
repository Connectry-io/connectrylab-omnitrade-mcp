import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import './Dashboard.css';

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
}

interface PaperWallet {
  usdt: number;
  holdings: Record<string, { asset: string; amount: number; avgBuyPrice: number; totalCost: number }>;
}

interface Alert {
  id: string;
  symbol: string;
  condition: string;
  targetPrice: number;
  triggered: boolean;
}

interface DCAConfig {
  id: string;
  asset: string;
  amount: number;
  frequency: string;
  enabled: boolean;
}

interface DaemonStatus {
  running: boolean;
  pid?: number;
  uptime?: string;
}

interface ActivityItem {
  timestamp: string;
  message: string;
}

export const Dashboard: React.FC = () => {
  const [portfolio, setPortfolio] = useState<PaperWallet | null>(null);
  const [prices, setPrices] = useState<PriceData[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dcaConfigs, setDcaConfigs] = useState<DCAConfig[]>([]);
  const [daemonStatus, setDaemonStatus] = useState<DaemonStatus>({ running: false });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [totalValue, setTotalValue] = useState<number>(0);
  const [pnl24h, setPnl24h] = useState<{ value: number; percent: number }>({ value: 0, percent: 0 });

  useEffect(() => {
    loadData();
    
    // Listen for price updates
    const unlisten = listen<PriceData[]>('prices-update', (event) => {
      setPrices(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    if (portfolio && prices.length > 0) {
      calculateTotalValue();
    }
  }, [portfolio, prices]);

  const loadData = async () => {
    try {
      const [portfolioData, alertsData, dcaData, statusData, logData] = await Promise.all([
        invoke<PaperWallet>('get_paper_portfolio'),
        invoke<Alert[]>('get_alerts'),
        invoke<DCAConfig[]>('get_dca_configs'),
        invoke<DaemonStatus>('get_daemon_status'),
        invoke<string[]>('get_daemon_log', { lines: 5 }),
      ]);
      
      setPortfolio(portfolioData);
      setAlerts(alertsData);
      setDcaConfigs(dcaData);
      setDaemonStatus(statusData);
      
      // Parse log entries into activities
      const activityItems = logData.map((line) => {
        const match = line.match(/\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] (.+)/);
        if (match) {
          return { timestamp: match[1], message: match[2] };
        }
        return { timestamp: '', message: line };
      }).filter(a => a.message);
      setActivities(activityItems);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const calculateTotalValue = () => {
    if (!portfolio) return;
    
    let total = portfolio.usdt;
    let totalCost = 0;
    
    Object.values(portfolio.holdings).forEach((holding) => {
      const priceData = prices.find((p) => p.symbol.startsWith(holding.asset));
      if (priceData) {
        total += holding.amount * priceData.price;
        totalCost += holding.totalCost;
      }
    });
    
    setTotalValue(total);
    
    // Calculate P&L (simplified - would need historical data for accurate 24h P&L)
    const pnlValue = total - (portfolio.usdt + totalCost);
    const pnlPercent = totalCost > 0 ? (pnlValue / totalCost) * 100 : 0;
    setPnl24h({ value: pnlValue, percent: pnlPercent });
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const activeAlerts = alerts.filter((a) => !a.triggered);
  const enabledDCA = dcaConfigs.filter((d) => d.enabled);

  return (
    <div className="dashboard">
      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-card-label">Total Value</div>
          <div className="stat-card-value">{formatCurrency(totalValue)}</div>
          <div className="stat-card-subtitle">across 1 exch.</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-card-label">24h P&L</div>
          <div className={`stat-card-value ${pnl24h.value >= 0 ? 'text-positive' : 'text-negative'}`}>
            {formatCurrency(pnl24h.value)} {formatPercent(pnl24h.percent)}
          </div>
          <div className="stat-card-subtitle">{pnl24h.value >= 0 ? '▲' : '▼'}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-card-label">Active Alerts</div>
          <div className="stat-card-value">{activeAlerts.length}</div>
          <div className="stat-card-subtitle">
            {activeAlerts.length === 1 ? '1 active' : `${activeAlerts.length} active`}
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-card-label">DCA Running</div>
          <div className="stat-card-value">{enabledDCA.length}</div>
          <div className="stat-card-subtitle">
            {enabledDCA.length > 0 
              ? `$${enabledDCA[0]?.amount}/week ${enabledDCA[0]?.asset}` 
              : 'No strategies'}
          </div>
        </div>
      </div>

      {/* Panels Row */}
      <div className="panels-row">
        {/* Portfolio Panel */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">Portfolio Allocation</h3>
          </div>
          <div className="panel-content">
            <div className="holdings-list">
              {portfolio && Object.values(portfolio.holdings).map((holding) => {
                const priceData = prices.find((p) => p.symbol.startsWith(holding.asset));
                const value = priceData ? holding.amount * priceData.price : 0;
                const allocation = totalValue > 0 ? (value / totalValue) * 100 : 0;
                
                return (
                  <div key={holding.asset} className="holding-row">
                    <div className="holding-asset">
                      <span className="asset-symbol">{holding.asset}</span>
                      <span className="asset-amount text-mono">
                        {holding.amount.toFixed(6)}
                      </span>
                    </div>
                    <div className="holding-value">
                      <span className="text-mono">{formatCurrency(value)}</span>
                      <span className="text-muted">{allocation.toFixed(1)}%</span>
                    </div>
                    <div className="holding-bar">
                      <div 
                        className="holding-bar-fill" 
                        style={{ width: `${allocation}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              
              {portfolio && (
                <div className="holding-row">
                  <div className="holding-asset">
                    <span className="asset-symbol">USDT</span>
                    <span className="asset-amount text-mono">
                      {portfolio.usdt.toFixed(2)}
                    </span>
                  </div>
                  <div className="holding-value">
                    <span className="text-mono">{formatCurrency(portfolio.usdt)}</span>
                    <span className="text-muted">
                      {totalValue > 0 ? ((portfolio.usdt / totalValue) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chart Panel */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">7-Day Portfolio Value</h3>
          </div>
          <div className="panel-content chart-placeholder">
            <div className="chart-area">
              {/* Simplified chart representation */}
              <svg viewBox="0 0 200 100" className="mini-chart">
                <polyline
                  fill="none"
                  stroke="var(--color-teal)"
                  strokeWidth="2"
                  points="0,80 30,70 60,75 90,50 120,55 150,40 180,30 200,35"
                />
                <polygon
                  fill="url(#chartGradient)"
                  points="0,100 0,80 30,70 60,75 90,50 120,55 150,40 180,30 200,35 200,100"
                />
                <defs>
                  <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="var(--color-teal)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="var(--color-teal)" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Panel */}
      <div className="panel activity-panel">
        <div className="panel-header">
          <h3 className="panel-title">Recent Activity</h3>
          <span className="badge badge-teal">
            {daemonStatus.running ? '● Running' : '○ Stopped'}
          </span>
        </div>
        <div className="panel-content">
          <div className="activity-feed">
            {activities.length > 0 ? (
              activities.map((activity, index) => (
                <div key={index} className="activity-item">
                  <span className="activity-timestamp">{activity.timestamp}</span>
                  <span className="activity-message">{activity.message}</span>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
