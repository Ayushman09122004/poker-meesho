import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log('%c♠ Felt & Friends™ — made by Ayushman Ranjan', 'color:#f5d78a;font-size:16px;font-weight:bold');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Installability is a nice-to-have; never let a failed SW registration break the app.
    });
  });
}
