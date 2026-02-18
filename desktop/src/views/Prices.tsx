import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import './Prices.css';

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
}

interface Alert {
  id: string;
  symbol: string;
  condition: string;
  targetPrice: number;
}

export const Prices: React.FC = () => {
  const [prices, setPrices] = useState<PriceData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newAlertSymbol, setNewAlertSymbol] = useState<string | null>(null);
  const [alertCondition, setAlertCondition] = useState<'above' | 'below'>('above');
  const [alertPrice, setAlertPrice] = useState('');

  useEffect(() => {
    loadPrices();
    
    const unlisten = listen<PriceData[]>('prices-update', (event) => {
      setPrices(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const loadPrices = async () => {
    try {
      const symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT', 'ADA/USDT'];
      const data = await invoke<PriceData[]>('get_prices', { symbols });
      setPrices(data);
    } catch (error) {
      console.error('Failed to load prices:', error);
    }
  };

  const filteredPrices = prices.filter((p) =>
    p.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (value: number): string => {
    if (value >= 1000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value);
  };

  const formatVolume = (value: number): string => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value.toFixed(0)}`;
  };

  const formatPercent = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getChangeIcon = (change: number): string => {
    if (change > 0) return '▲';
    if (change < 0) return '▼';
    return '→';
  };

  const handleSetAlert = (symbol: string) => {
    setNewAlertSymbol(symbol);
    setAlertCondition('above');
    setAlertPrice('');
  };

  const handleCreateAlert = async () => {
    if (!newAlertSymbol || !alertPrice) return;
    
    try {
      await invoke<Alert>('add_alert', {
        symbol: newAlertSymbol,
        condition: alertCondition,
        price: parseFloat(alertPrice),
      });
      setNewAlertSymbol(null);
      setAlertPrice('');
    } catch (error) {
      console.error('Failed to create alert:', error);
    }
  };

  return (
    <div className="prices">
      {/* Header */}
      <div className="view-header">
        <h2 className="view-title">Prices</h2>
        <div className="view-actions">
          <div className="search-bar">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Search symbols..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Prices Table */}
      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Price</th>
              <th>24h Change</th>
              <th>24h Volume</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredPrices.map((priceData) => (
              <React.Fragment key={priceData.symbol}>
                <tr>
                  <td>
                    <span className="symbol-name">{priceData.symbol}</span>
                  </td>
                  <td className="text-mono">{formatCurrency(priceData.price)}</td>
                  <td className={`text-mono ${priceData.change24h >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {getChangeIcon(priceData.change24h)} {formatPercent(priceData.change24h)}
                  </td>
                  <td className="text-mono text-muted">{formatVolume(priceData.volume24h)}</td>
                  <td>
                    <button 
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleSetAlert(priceData.symbol)}
                    >
                      Set Alert
                    </button>
                  </td>
                </tr>
                
                {/* Inline Alert Form */}
                {newAlertSymbol === priceData.symbol && (
                  <tr className="alert-form-row">
                    <td colSpan={5}>
                      <div className="inline-alert-form">
                        <span className="alert-symbol">{priceData.symbol}</span>
                        <select
                          className="select"
                          value={alertCondition}
                          onChange={(e) => setAlertCondition(e.target.value as 'above' | 'below')}
                        >
                          <option value="above">above</option>
                          <option value="below">below</option>
                        </select>
                        <div className="price-input-wrapper">
                          <span className="price-prefix">$</span>
                          <input
                            type="number"
                            className="input price-input"
                            placeholder="Price"
                            value={alertPrice}
                            onChange={(e) => setAlertPrice(e.target.value)}
                          />
                        </div>
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={handleCreateAlert}
                        >
                          Confirm
                        </button>
                        <button 
                          className="btn btn-sm btn-secondary"
                          onClick={() => setNewAlertSymbol(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        
        {filteredPrices.length === 0 && (
          <div className="empty-state">
            <p>No symbols match your search</p>
          </div>
        )}
      </div>

      {/* Auto-refresh indicator */}
      <div className="refresh-indicator">
        <span className="refresh-dot" />
        <span className="text-muted">Auto-refreshing every 5s</span>
      </div>
    </div>
  );
};

export default Prices;
