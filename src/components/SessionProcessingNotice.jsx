import React from 'react';

export default function SessionProcessingNotice({ message }) {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#0f172a'
    }}>
      <div style={{
        maxWidth: '460px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        padding: '36px 28px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
        textAlign: 'center',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎬</div>
        <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 12px 0', color: '#0f172a' }}>
          Recording Processing
        </h1>
        <p style={{ color: '#64748b', fontSize: '15px', lineHeight: 1.6, margin: '0 0 24px 0' }}>
          {message || "Today's session has concluded and the recording is being prepared. It will be ready shortly — please check back soon!"}
        </p>
      </div>
    </div>
  );
}
