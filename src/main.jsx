import React, { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ExplanationGeneratorPage from './pages/ExplanationGeneratorPage.jsx'

const LazyApp = lazy(() => import('./App.jsx'));
const LazyAppProvider = lazy(() => import('./context/AppContext.jsx').then(m => ({ default: m.AppProvider })));

const path = typeof window !== 'undefined' ? window.location.pathname.toLowerCase().replace(/\/$/, '') : '';
const isClassroomApp = 
  path === '/classroom' || 
  path.startsWith('/classroom/') || 
  path === '/stage' || 
  path.startsWith('/stage/') ||
  path === '/live';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isClassroomApp ? (
      <Suspense fallback={<div style={{ minHeight: '100vh', background: '#F7F7F8' }}></div>}>
        <LazyAppProvider>
          <LazyApp />
        </LazyAppProvider>
      </Suspense>
    ) : (
      <ExplanationGeneratorPage />
    )}
  </StrictMode>
);
