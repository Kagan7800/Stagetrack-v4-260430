import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function SessionRecordingPlayer({ session }) {
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchSignedUrl() {
      try {
        setLoading(true);
        setError(null);

        const functions = getFunctions();
        const getRecordingSignedUrl = httpsCallable(functions, 'getRecordingSignedUrl');
        const response = await getRecordingSignedUrl({ sessionId: session.id });

        if (isMounted) {
          if (response?.data?.signedUrl) {
            setSignedUrl(response.data.signedUrl);
          } else {
            setError('Could not retrieve recording.');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Error loading session recording.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (session?.id) {
      fetchSignedUrl();
    }

    return () => {
      isMounted = false;
    };
  }, [session?.id]);

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0f172a',
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#ffffff'
    }}>
      <div style={{
        maxWidth: '720px',
        width: '100%',
        backgroundColor: '#1e293b',
        borderRadius: '20px',
        padding: '28px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
        border: '1px solid #334155'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
            Session Recording & Archive
          </h1>
          <span style={{ fontSize: '12px', padding: '4px 10px', backgroundColor: '#334155', borderRadius: '12px', color: '#94a3b8' }}>
            Available for 7 days
          </span>
        </div>

        {loading && (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#94a3b8' }}>
            <p>Loading secure recording stream...</p>
          </div>
        )}

        {error && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#f87171', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px' }}>
            <p>{error}</p>
          </div>
        )}

        {signedUrl && !loading && (
          <video
            src={signedUrl}
            controls
            autoPlay={false}
            playsInline
            controlsList="nodownload"
            style={{
              width: '100%',
              maxHeight: '480px',
              borderRadius: '12px',
              backgroundColor: '#000000',
            }}
          />
        )}
      </div>
    </div>
  );
}
