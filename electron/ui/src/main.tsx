import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Disable noisy console logs (including in dev) to reduce IPC/render overhead
if (typeof window !== 'undefined' && window.console) {
  
  console.debug = () => {};
  console.info = () => {};
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
