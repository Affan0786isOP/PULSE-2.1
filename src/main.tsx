import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';
import './styles/pulse-aesthetic.css';
import './lib/pwaStore';
import { initSentry } from './lib/sentry';

initSentry();

// Remove the build-time SEO shell immediately before React takes over the page.
if (typeof document !== 'undefined') {
  document.getElementById('pulse-seo-shell')?.remove();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);

