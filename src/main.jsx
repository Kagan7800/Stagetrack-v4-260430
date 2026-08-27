// src/main.jsx
// Entry point with lightweight path-based routing:
//   /profile-builder  → standalone lead-capture page (no AppProvider needed)
//   everything else   → full Music Fun classroom app

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AppProvider } from './context/AppContext.jsx'
import ProfileBuilderPage from './pages/ProfileBuilderPage.jsx'

const path = window.location.pathname;
const isProfileBuilder =
  path === '/profile-builder' ||
  path === '/profile-builder/' ||
  path.startsWith('/profile-builder/');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isProfileBuilder ? (
      // Standalone marketing page — no AppProvider required
      <ProfileBuilderPage />
    ) : (
      // Full classroom app
      <AppProvider>
        <App />
      </AppProvider>
    )}
  </StrictMode>,
)
