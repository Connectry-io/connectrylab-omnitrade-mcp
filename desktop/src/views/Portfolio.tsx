import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import './Portfolio.css';

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
}

interface Holding {
  asset: string;
  amount: number;
  avgBuyPrice: number;
  totalCost: number;
}

interface PaperWallet {
  usdt: number;
  holdings: Record<string, Holding>;
}

export const Portfolio: React.FC = () => {
  const [portfolio, setPortfolio] = useState<PaperWallet | null>(null);
  const [prices, setPrices] = useState<PriceData[]>([]);
  const [mode, setMode] = useState<'paper' | 'live'>('paper');
  const [totalValue, setTotalValue] = useState(0);
  const [totalPnl, setTotalPnl] = useState({ value: 0, percent: 0 });

  useEffect(() => {
    loadData();
    
    const unlisten = listen<PriceData[]>('prices-update', (event) => {
      setPrices(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    if (portfolio && prices.length > 0) {
      calculateTotals();
    }
  }, [portfolio, prices]);

  const loadData = async () => {
    try {
      const data = await invoke<PaperWallet>('get_paper_portfolio');
      setPortfolio(data);
    } catch (error) {
      console.error('Failed to load portfolio:', error);
    }
  };

  const calculateTotals = () => {
    if (!portfolio) return;
    
    let total = portfolio.usdt;
    let totalCost = portfolio.usdt; // USDT at 1:1
    
    Object.values(portfolio.holdings).forEach((holding) => {
      const priceData = prices.find((p) => p.symbol.startsWith(holding.asset));
      if (priceData) {
        total += holding.amount * priceData.price;
      }
      totalCost += holding.totalCost;
    });
    
    setTotalValue(total);
    
    const pnlValue = total - totalCost;
    const pnlPercent = totalCost > 0 ? (pnlValue / totalCost) * 100 : 0;
    setTotalPnl({ value: pnlValue, percent: pnlPercent });
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

  const getHoldingData = (holding: Holding) => {
    const priceData = prices.find((p) => p.symbol.startsWith(holding.asset));
    const currentPrice = priceData?.price || 0;
    const value = holding.amount * currentPrice;
    const pnl = value - holding.totalCost;
    const pnlPercent = holding.totalCost > 0 ? (pnl / holding.totalCost) * 100 : 0;
    const allocation = totalValue > 0 ? (value / totalValue) * 100 : 0;
    
    return { currentPrice, value, pnl, pnlPercent, allocation };
  };

  return (
    <div className="portfolio">
      {/* Header */}
      <div className="view-header">
        <div className="portfolio-summary">
          <div className="summary-item">
            <span className="summary-label">Total Value</span>
            <span className="summary-value text-mono">{formatCurrency(totalValue)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">P&L</span>
            <span className={`summary-value text-mono ${totalPnl.value >= 0 ? 'text-positive' : 'text-negative'}`}>
              {formatCurrency(totalPnl.value)} ({formatPercent(totalPnl.percent)})
            </span>
          </div>
        </div>
        
        <div className="view-actions">
          <div className="mode-toggle">
            <button 
              className={`mode-btn ${mode === 'paper' ? 'active' : ''}`}
              onClick={() => setMode('paper')}
            >
              Paper
            </button>
            <button 
              className={`mode-btn ${mode === 'live' ? 'active' : ''}`}
              onClick={() => setMode('live')}
            >
              Live
            </button>
          </div>
          <span className={`badge ${mode === 'paper' ? 'badge-teal' : 'badge-green'}`}>
            {mode === 'paper' ? 'Paper' : 'Live'}
          </span>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Amount</th>
              <th>Price</th>
              <th>Value</th>
              <th>Avg Buy</th>
              <th>P&L</th>
              <th>Alloc</th>
            </tr>
          </thead>
          <tbody>
            {portfolio && Object.values(portfolio.holdings).map((holding) => {
              const data = getHoldingData(holding);
              
              return (
                <tr key={holding.asset}>
                  <td>
                    <span className="asset-name">{holding.asset}</span>
                  </td>
                  <td className="text-mono">{holding.amount.toFixed(6)}</td>
                  <td className="text-mono">{formatCurrency(data.currentPrice)}</td>
                  <td className="text-mono">{formatCurrency(data.value)}</td>
                  <td className="text-mono">{formatCurrency(holding.avgBuyPrice)}</td>
                  <td className={`text-mono ${data.pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {formatCurrency(data.pnl)} {formatPercent(data.pnlPercent)}
                  </td>
                  <td className="text-mono">{data.allocation.toFixed(1)}%</td>
                </tr>
              );
            })}
            
            {/* USDT Row */}
            {portfolio && (
              <tr>
                <td>
                  <span className="asset-name">USDT</span>
                </td>
                <td className="text-mono">{portfolio.usdt.toFixed(2)}</td>
                <td className="text-mono">$1.00</td>
                <td className="text-mono">{formatCurrency(portfolio.usdt)}</td>
                <td className="text-mono">$1.00</td>
                <td className="text-mono text-muted">$0.00 +0.00%</td>
                <td className="text-mono">
                  {totalValue > 0 ? ((portfolio.usdt / totalValue) * 100).toFixed(1) : 0}%
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Portfolio;
