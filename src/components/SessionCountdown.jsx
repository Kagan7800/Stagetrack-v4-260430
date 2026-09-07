import React, { useState, useEffect } from 'react';

export default function SessionCountdown({ session, onLobbyOpen }) {
  const [timeLeftMs, setTimeLeftMs] = useState(() => {
    const target = session?.lobbyOpensAt || (session?.startsAt ? session.startsAt - 15 * 60 * 1000 : Date.now());
    return Math.max(0, target - Date.now());
  });

  useEffect(() => {
    const target = session?.lobbyOpensAt || (session?.startsAt ? session.startsAt - 15 * 60 * 1000 : Date.now());
    
    const interval = setInterval(() => {
      const remaining = Math.max(0, target - Date.now());
      setTimeLeftMs(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        if (typeof onLobbyOpen === 'function') {
          onLobbyOpen();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session, onLobbyOpen]);

  const totalSeconds = Math.floor(timeLeftMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const startsDateStr = session?.startsAt
    ? new Date(session.startsAt).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Upcoming Session';

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
        maxWidth: '480px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        padding: '36px 28px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        textAlign: 'center',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{
          display: 'inline-flex',
          padding: '8px 16px',
          backgroundColor: '#eff6ff',
          borderRadius: '20px',
          color: '#2563eb',
          fontSize: '14px',
          fontWeight: 600,
          marginBottom: '16px'
        }}>
          🎶 Music Fun with My Little One
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px 0', color: '#0f172a' }}>
          Session Starts Soon
        </h1>
        <p style={{ color: '#64748b', fontSize: '15px', margin: '0 0 28px 0' }}>
          {startsDateStr}
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: days > 0 ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
          gap: '10px',
          marginBottom: '28px'
        }}>
          {days > 0 && (
            <div style={{ backgroundColor: '#f1f5f9', padding: '14px 8px', borderRadius: '12px' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#1e3a8a' }}>{days}</div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Days</div>
            </div>
          )}
          <div style={{ backgroundColor: '#f1f5f9', padding: '14px 8px', borderRadius: '12px' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#1e3a8a' }}>{hours}</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Hours</div>
          </div>
          <div style={{ backgroundColor: '#f1f5f9', padding: '14px 8px', borderRadius: '12px' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#1e3a8a' }}>{minutes}</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Min</div>
          </div>
          <div style={{ backgroundColor: '#f1f5f9', padding: '14px 8px', borderRadius: '12px' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#2563eb' }}>{seconds}</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Sec</div>
          </div>
        </div>

        <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>
          The lobby opens 15 minutes prior to class. This page will automatically transition when the lobby opens!
        </p>
      </div>
    </div>
  );
}
