// import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root')!).render(
  // We have removed <React.StrictMode> to prevent double-running effects in dev mode.
  <BrowserRouter>
    <App />
  </BrowserRouter>
);