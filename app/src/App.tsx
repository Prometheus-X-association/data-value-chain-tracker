import React from 'react';

import './App.css';
import { DataNodes } from './DataNodes/DataNodes';

function App() {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <p className="app-shell__eyebrow">Data Value Chain Tracker</p>
        <div className="app-shell__headline">
          <h1>Explore node relationships and incentive flow</h1>
          <p className="app-shell__summary">
            Inspect the full data network, focus on a specific subtree, and review
            node metadata.
          </p>
        </div>
      </header>

      <main className="app-shell__content">
        <DataNodes />
      </main>
    </div>
  );
}

export default App;
