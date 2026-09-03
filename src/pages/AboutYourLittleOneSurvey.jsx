// src/pages/AboutYourLittleOneSurvey.jsx
// Standalone full-page wrapper for About Your Little One - Survey

import { useEffect } from 'react';
import PersonalizedExplanationGenerator from '../components/PersonalizedExplanationGenerator';

export default function AboutYourLittleOneSurvey() {
  useEffect(() => {
    document.title = 'About Your Little One - Survey';
  }, []);

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: '#D9EFFF', margin: 0, padding: 0, boxSizing: 'border-box' }}>
      <PersonalizedExplanationGenerator onClose={null} standalone={true} />
    </div>
  );
}
