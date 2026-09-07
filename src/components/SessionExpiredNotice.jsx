import React from 'react';

export default function SessionExpiredNotice({ message }) {
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
        maxWidth: '440px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        padding: '36px 28px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
        textAlign: 'center',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
        <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 12px 0', color: '#0f172a' }}>
          Recording Expired
        </h1>
        <p style={{ color: '#64748b', fontSize: '15px', lineHeight: 1.6, margin: '0 0 24px 0' }}>
          {message || 'The recording for this session was available for 7 days and has now expired. See you in the next live session!'}
        </p>
      </div>
    </div>
  );
}
