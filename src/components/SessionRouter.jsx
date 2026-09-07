import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { evaluateSessionState, SESSION_STATES } from '../utils/sessionRouterLogic';
import SessionCountdown from './SessionCountdown';
import SessionRecordingPlayer from './SessionRecordingPlayer';
import SessionExpiredNotice from './SessionExpiredNotice';
import SessionProcessingNotice from './SessionProcessingNotice';

export default function SessionRouter({ children }) {
  const [user, setUser] = useState(null);
  const [programId, setProgramId] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

  // 1. Listen for authenticated user and extract programId claim
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const idTokenResult = await currentUser.getIdTokenResult();
          const pId = idTokenResult.claims.programId || 'default';
          setProgramId(pId);
        } catch {
          setProgramId('default');
        }
      } else {
        setProgramId(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time subscription to current/upcoming session for the user's programId
  useEffect(() => {
    if (!programId) {
      setLoading(false);
      return;
    }

    const db = getFirestore();
    const sessionsRef = collection(db, 'sessions');
    const q = query(
      sessionsRef,
      where('programId', '==', programId),
      orderBy('startsAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          setSession({ id: doc.id, ...doc.data() });
        } else {
          setSession(null);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('[SessionRouter] Firestore snapshot subscription error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [programId]);

  // Periodic tick every 10 seconds to re-evaluate state transitions when idle
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#64748b',
      }}>
        <p>Loading your Music Fun session...</p>
      </div>
    );
  }

  const viewState = evaluateSessionState(session, Date.now());

  switch (viewState.state) {
    case SESSION_STATES.NO_SESSION:
      return (
        <div style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8fafc',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <div style={{
            maxWidth: '440px',
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '36px 28px',
            textAlign: 'center',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e2e8f0',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎶</div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 12px 0', color: '#0f172a' }}>
              Welcome to Music Fun
            </h1>
            <p style={{ color: '#64748b', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
              {viewState.message}
            </p>
          </div>
        </div>
      );

    case SESSION_STATES.COUNTDOWN:
      return <SessionCountdown session={session} onLobbyOpen={() => setTick((t) => t + 1)} />;

    case SESSION_STATES.LOBBY:
      // Renders the interactive Lobby / Stage container
      return children || null;

    case SESSION_STATES.PROCESSING:
      return <SessionProcessingNotice message={viewState.message} />;

    case SESSION_STATES.RECORDING:
      return <SessionRecordingPlayer session={session} />;

    case SESSION_STATES.EXPIRED:
      return <SessionExpiredNotice message={viewState.message} />;

    default:
      return children || null;
  }
}
