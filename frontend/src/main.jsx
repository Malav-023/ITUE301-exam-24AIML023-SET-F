import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import { logger } from './utils/logger';
import './index.css';

// Last-resort logging for errors React never sees
window.addEventListener('error', (e) =>
  logger.error('Uncaught error', { message: e.message, source: e.filename, line: e.lineno })
);
window.addEventListener('unhandledrejection', (e) => logger.error('Unhandled promise rejection', e.reason));

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
