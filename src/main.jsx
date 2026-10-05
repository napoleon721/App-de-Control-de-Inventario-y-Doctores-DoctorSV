import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/common/ErrorBoundary';
import './index.css';

// Manejador global para chunks dinámicos obsoletos tras un nuevo despliegue en Firebase Hosting
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite detectó una nueva versión desplegada en el servidor. Recargando...', event);
  const lastReload = Number(sessionStorage.getItem('doctorsv_last_preload_reload') || '0');
  const now = Date.now();
  if (now - lastReload > 5000) {
    sessionStorage.setItem('doctorsv_last_preload_reload', String(now));
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
