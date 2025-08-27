// import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';

// Disable Sentry error reporting if it's injected by Vercel or other sources
if (typeof window !== 'undefined' && (window as any).Sentry) {
  (window as any).Sentry.init({
    beforeSend: () => null, // Disable all error reporting
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  // We have removed <React.StrictMode> to prevent double-running effects in dev mode.
  <BrowserRouter>
    <App />
    
  </BrowserRouter>
);