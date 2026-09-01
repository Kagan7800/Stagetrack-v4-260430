// src/pages/ExplanationGeneratorPage.jsx
// Standalone full-page wrapper for the profile generator route.

import { useEffect } from 'react';
import PersonalizedExplanationGenerator from '../components/PersonalizedExplanationGenerator';

export default function ExplanationGeneratorPage() {
  useEffect(() => {
    document.title = 'Personalized Profile Builder | Music Fun With Your Little One';
  }, []);

  return (
    <div style={{ minHeight: '100vh', width: '100vw', background: '#F7F7F8', margin: 0, padding: 0, boxSizing: 'border-box' }}>
      <PersonalizedExplanationGenerator onClose={null} standalone={true} />
    </div>
  );
}
