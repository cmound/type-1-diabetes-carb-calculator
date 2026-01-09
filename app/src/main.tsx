import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { initDb } from './data/init';
import './styles/globals.css';
import App from './App.tsx';

// Register service worker for PWA (only in production)
if (import.meta.env.PROD) {
  registerSW({ immediate: true });
}

// Initialize database (fire-and-forget)
initDb();

// Load database test utilities in dev mode
if (import.meta.env.DEV) {
  import('./test-db');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
