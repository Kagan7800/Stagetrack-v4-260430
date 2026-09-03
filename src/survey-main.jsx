// src/survey-main.jsx
// Dedicated, zero-overhead standalone entry point for About Your Little One Survey

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AboutYourLittleOneSurvey from './pages/AboutYourLittleOneSurvey.jsx';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <AboutYourLittleOneSurvey />
    </StrictMode>
  );
}
