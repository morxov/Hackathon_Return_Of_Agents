import React from 'react';
import EventFeed from './components/EventFeed';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Omi Audio Monitor</h1>
      </header>
      <main className="app-main">
        <EventFeed />
      </main>
    </div>
  );
}

export default App;
