import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

async function init() {
  window.API_TOKEN = (await window.electronAPI?.getApiToken?.()) || "";
  
  const originalFetch = window.fetch;
  window.fetch = async (input, initArgs = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url && url.startsWith('http://localhost:8000')) {
      initArgs.headers = {
        ...initArgs.headers,
        'X-API-Token': window.API_TOKEN
      };
    }
    return originalFetch(input, initArgs);
  };

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

init();
