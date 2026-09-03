import React, { StrictMode, Suspense, lazy, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import AboutYourLittleOneSurvey from './pages/AboutYourLittleOneSurvey.jsx'

const LazyApp = lazy(() => {
  import('./index.css');
  return import('./App.jsx');
});
const LazyAppProvider = lazy(() => import('./context/AppContext.jsx').then(m => ({ default: m.AppProvider })));

function isSurveyRoute() {
  if (typeof window === 'undefined') return true;
  const p = window.location.pathname.toLowerCase();
  const h = window.location.hash.toLowerCase();
  const s = window.location.search.toLowerCase();

  // If URL explicitly matches stage or classroom room path, route to stage
  const isStagePath = p === '/stage' || p === '/room' || p.includes('/stage') || p.includes('/class');
  if (isStagePath) return false;

  // Otherwise, default all survey and lead capture routes directly to AboutYourLittleOneSurvey
  return (
    p.includes('about-your-little-one') ||
    p.includes('profile-generator') ||
    p.includes('profile-builder') ||
    p.includes('profilegenerator') ||
    p.includes('profilebuilder') ||
    p.includes('profile') ||
    p.includes('survey') ||
    p.includes('explanation') ||
    h.includes('about-your-little-one') ||
    h.includes('profile-generator') ||
    h.includes('profile') ||
    h.includes('survey') ||
    s.includes('profile-generator') ||
    s.includes('about-your-little-one') ||
    s.includes('survey') ||
    p === '/' || p === ''
  );
}

function Root() {
  const [isSurvey, setIsSurvey] = useState(isSurveyRoute);

  useEffect(() => {
    const handleLocationChange = () => {
      setIsSurvey(isSurveyRoute());
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  if (isSurvey) {
    return <AboutYourLittleOneSurvey />;
  }

  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#D9EFFF' }}></div>}>
      <LazyAppProvider>
        <LazyApp />
      </LazyAppProvider>
    </Suspense>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
