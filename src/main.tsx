import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { NavigationGuard } from '@shared/navigation/NavigationGuard';
import './index.css';
import './styles/pulse-aesthetic.css';
import './lib/pwaStore';
import { initSentry } from './lib/sentry';

initSentry();

// Remove static pre-render SEO shell immediately before mounting React root
if (typeof document !== 'undefined') {
  document.getElementById('pulse-seo-shell')?.remove();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <NavigationGuard>
          <App />
        </NavigationGuard>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
