import React, { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Users, Check, X, CheckCheck, AlertTriangle, Sparkles } from 'lucide-react';

export default function InstructorAdmitQueue({ sessionId }) {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [lobbyCount, setLobbyCount] = useState(0);
  const [admittingAll, setAdmittingAll] = useState(false);
  const [error, setError] = useState(null);

  // 1. Real-time subscription to pending join requests
  useEffect(() => {
    if (!sessionId) return;
    const db = getFirestore();
    const q = query(
      collection(db, 'joinRequests'),
      where('sessionId', '==', sessionId),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setPendingRequests(list);
    }, (err) => {
      console.warn('[InstructorAdmitQueue] Requests subscription error:', err);
    });

    return () => unsubscribe();
  }, [sessionId]);

  // 2. Real-time subscription to unjoined lobby presence (Count Only)
  useEffect(() => {
    if (!sessionId) return;
    const db = getFirestore();
    const presenceCol = collection(db, 'lobbyPresence', sessionId, 'active');

    const unsubscribe = onSnapshot(presenceCol, (snapshot) => {
      const now = Date.now();
      // Count only non-stale presence heartbeats within the last 45 seconds
      const activeCount = snapshot.docs.filter((d) => {
        const data = d.data();
        const hb = data.heartbeatAt?.toMillis ? data.heartbeatAt.toMillis() : (data.heartbeatAt || 0);
        return now - hb < 45000;
      }).length;

      setLobbyCount(activeCount);
    }, (err) => {
      console.warn('[InstructorAdmitQueue] Presence subscription error:', err);
    });

    return () => unsubscribe();
  }, [sessionId]);

  // Handlers for Admit, Deny, and Admit All
  const handleAdmit = async (requestId) => {
    try {
      const db = getFirestore();
      await updateDoc(doc(db, 'joinRequests', requestId), {
        status: 'admitted',
      });
    } catch (err) {
      setError(err.message || 'Failed to admit request.');
    }
  };

  const handleDeny = async (requestId) => {
    try {
      const db = getFirestore();
      await updateDoc(doc(db, 'joinRequests', requestId), {
        status: 'denied',
      });
    } catch (err) {
      setError(err.message || 'Failed to deny request.');
    }
  };

  const handleAdmitAll = async () => {
    try {
      setAdmittingAll(true);
      setError(null);
      const functions = getFunctions();
      const admitAllPending = httpsCallable(functions, 'admitAllPending');
      await admitAllPending({ sessionId });
    } catch (err) {
      setError(err.message || 'Failed to admit all requests.');
    } finally {
      setAdmittingAll(false);
    }
  };

  return (
    <div style={{
      backgroundColor: '#1e293b',
      borderRadius: '16px',
      padding: '20px',
      color: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
      border: '1px solid #334155',
      maxWidth: '480px',
      width: '100%',
    }}>
      {/* Header with Lobby Count Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Admit Queue</h2>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>
            {pendingRequests.length} waiting to join
          </span>
        </div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: '#0f172a',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          color: '#38bdf8',
          border: '1px solid #0284c7',
        }}>
          <Users size={14} />
          <span>{lobbyCount} in lobby</span>
        </div>
      </div>

      {error && (
        <div style={{ padding: '8px 12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: '8px', fontSize: '12px', marginBottom: '12px' }}>
          {error}
        </div>
      )}

      {/* Admit All Action Button */}
      {pendingRequests.length > 0 && (
        <button
          type="button"
          onClick={handleAdmitAll}
          disabled={admittingAll}
          style={{
            width: '100%',
            padding: '10px 16px',
            backgroundColor: '#22c55e',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '14px',
            cursor: admittingAll ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '16px',
            opacity: admittingAll ? 0.7 : 1,
          }}
        >
          <CheckCheck size={16} />
          <span>{admittingAll ? 'Admitting all...' : `Admit All (${pendingRequests.length})`}</span>
        </button>
      )}

      {/* Request Queue List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '360px', overflowY: 'auto' }}>
        {pendingRequests.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
            No pending join requests.
          </div>
        ) : (
          pendingRequests.map((req) => (
            <div
              key={req.id}
              style={{
                backgroundColor: '#0f172a',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderLeft: `4px solid ${req.borderColor || '#38bdf8'}`,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>
                  {req.adultName}
                  {req.childNames?.length > 0 && (
                    <span style={{ color: '#94a3b8', fontWeight: 500 }}> & {req.childNames.join(', ')}</span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
                  {req.sticker && (
                    <span style={{ fontSize: '11px', backgroundColor: '#1e293b', padding: '2px 6px', borderRadius: '4px', color: '#cbd5e1' }}>
                      {req.sticker}
                    </span>
                  )}
                  {req.birthdayThisWeek && (
                    <span style={{ fontSize: '11px', backgroundColor: '#854d0e', padding: '2px 6px', borderRadius: '4px', color: '#fef08a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                      <Sparkles size={10} /> Birthday
                    </span>
                  )}
                  {req.isNewDevice && (
                    <span style={{ fontSize: '11px', backgroundColor: '#7f1d1d', padding: '2px 6px', borderRadius: '4px', color: '#fca5a5', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                      <AlertTriangle size={10} /> New Device
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleAdmit(req.id)}
                  style={{
                    backgroundColor: '#15803d',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#ffffff',
                    padding: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Admit family"
                >
                  <Check size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeny(req.id)}
                  style={{
                    backgroundColor: '#991b1b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#ffffff',
                    padding: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Deny request"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
