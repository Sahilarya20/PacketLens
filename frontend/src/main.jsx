import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { DPIProvider } from './context/DPIContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DPIProvider>
      <App />
    </DPIProvider>
  </React.StrictMode>
);
