// src/pages/ProfileBuilderPage.jsx
// Standalone full-page wrapper for the /profile-builder route.
// Renders without AppProvider (gracefully degrades context usage).

import { useEffect } from 'react';
import ChildProfileBuilder from '../components/ChildProfileBuilder';

export default function ProfileBuilderPage() {
  // Set page metadata for standalone route
  useEffect(() => {
    document.title = 'Discover Your Child\'s Musical Personality | Music Fun With Your Little One';
    // Add meta description dynamically
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content',
      'Get a free personalized musical profile for your toddler — delivered to your email & phone in seconds. ' +
      'Powered by Gemini AI and crafted by music education experts.'
    );
  }, []);

  return (
    <ChildProfileBuilder
      standalone={true}
      onClose={null}
    />
  );
}
