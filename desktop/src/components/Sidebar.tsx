import React from 'react';
import { Logo } from './Logo';
import './Sidebar.css';

export type ViewType = 'dashboard' | 'portfolio' | 'prices' | 'alerts' | 'dca' | 'settings';

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const navItems: { id: ViewType; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '◉' },
  { id: 'portfolio', label: 'Portfolio', icon: '◎' },
  { id: 'prices', label: 'Prices', icon: '◈' },
  { id: 'alerts', label: 'Alerts', icon: '◆' },
  { id: 'dca', label: 'DCA', icon: '◇' },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Logo width={150} height={30} />
      </div>
      
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => onViewChange(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
        
        <div className="nav-divider" />
        
        <button
          className={`nav-item ${activeView === 'settings' ? 'active' : ''}`}
          onClick={() => onViewChange('settings')}
        >
          <span className="nav-icon">⚙</span>
          <span className="nav-label">Settings</span>
        </button>
      </nav>
      
      <div className="sidebar-footer">
        <span className="version-badge">v0.9.5</span>
      </div>
    </aside>
  );
};

export default Sidebar;
