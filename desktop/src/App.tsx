import React, { useState } from 'react';
import { Sidebar, ViewType } from './components/Sidebar';
import Dashboard from './views/Dashboard';
import Portfolio from './views/Portfolio';
import Prices from './views/Prices';
import Alerts from './views/Alerts';
import DCA from './views/DCA';
import Settings from './views/Settings';
import './styles/global.css';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'portfolio':
        return <Portfolio />;
      case 'prices':
        return <Prices />;
      case 'alerts':
        return <Alerts />;
      case 'dca':
        return <DCA />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="main-content">
        {renderView()}
      </main>
    </div>
  );
};

export default App;
