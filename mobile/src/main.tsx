import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { NavigationGuard } from '@shared/navigation/NavigationGuard';
import './index.css';
import './lib/pwaStore';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename="/mobile">
        <NavigationGuard>
          <App />
        </NavigationGuard>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
