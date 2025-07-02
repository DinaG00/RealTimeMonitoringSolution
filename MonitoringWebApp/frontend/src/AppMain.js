import React from 'react';
import LogsViewer from './components/LogsViewer';
import ApplicationList from './components/ApplicationList';

function App() {
  return (
    <div>
      <h1>Real-Time Monitoring Dashboard</h1>
      <LogsViewer />
      <ApplicationList />
    </div>
  );
}

export default App;