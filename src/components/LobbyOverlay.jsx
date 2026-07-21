// src/components/LobbyOverlay.jsx

import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

export default function LobbyOverlay() {
  const { sessionId, lobbyStatus, setLobbyStatus, pendingRequest } = useAppContext();
  const [guestName, setGuestName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isInstructor = sessionStorage.getItem('stagetrack_role') === 'instructor';

  // --- GUEST HANDLER: Submit request to join ---
  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    if (!guestName.trim() || !sessionId || isSubmitting) return;

    setIsSubmitting(true);
    const guestId = `active-joined-${Date.now()}`;
    sessionStorage.setItem('stagetrack_active_guest_id', guestId);

    try {
      const sessionRef = doc(db, "sessions", sessionId);
      await updateDoc(sessionRef, {
        lobbyRequest: {
          id: guestId,
          name: guestName.trim(),
          timestamp: Date.now()
        }
      });
      setLobbyStatus('pending');
    } catch (err) {
      console.error("Error submitting join request:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- INSTRUCTOR HANDLER: Accept incoming guest ---
  const handleAcceptGuest = async () => {
    if (!pendingRequest || !sessionId) return;

    try {
      const sessionRef = doc(db, "sessions", sessionId);
      await updateDoc(sessionRef, {
        activeUsers: arrayUnion({
          uid: pendingRequest.id,
          name: pendingRequest.name,
          role: 'student',
          isInstructor: false
        }),
        lobbyResponse: {
          approvedGuestId: pendingRequest.id,
          guestName: pendingRequest.name,
          status: 'approved'
        },
        lobbyRequest: null // Clear request box
      });
    } catch (err) {
      console.error("Error accepting guest:", err);
    }
  };

  // Don't render overlay for instructor unless a guest request is waiting
  if (isInstructor) {
    if (!pendingRequest) return null;

    return (
      <div className="lobby-overlay-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="lobby-modal" style={{ background: '#1e293b', padding: '30px', borderRadius: '16px', textAlign: 'center', color: '#fff', border: '2px solid #3b82f6' }}>
          <h2>Guest Waiting in Lobby</h2>
          <p style={{ fontSize: '1.2rem', margin: '15px 0' }}><strong>{pendingRequest.name}</strong> wants to join your session.</p>
          <button 
            onClick={handleAcceptGuest}
            style={{ padding: '12px 28px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Admit Guest
          </button>
        </div>
      </div>
    );
  }

  // Render for Guest Client
  return (
    <div className="lobby-overlay-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(11, 25, 46, 0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="lobby-modal" style={{ background: '#1e293b', padding: '40px', borderRadius: '20px', textAlign: 'center', color: '#fff', maxWidth: '400px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
        <img src="/assets/Logo_modern.png" alt="Music Fun" style={{ height: '60px', marginBottom: '20px' }} />
        
        {lobbyStatus === 'initial' && (
          <form onSubmit={handleJoinSubmit}>
            <h2 style={{ marginBottom: '10px' }}>Join Session</h2>
            <p style={{ color: '#94a3b8', marginBottom: '20px' }}>Enter your name to request entry</p>
            <input
              type="text"
              placeholder="Your Name..."
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: '#fff', marginBottom: '20px', fontSize: '1rem' }}
              required
            />
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ width: '100%', padding: '12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {isSubmitting ? 'Requesting...' : 'Request to Join'}
            </button>
          </form>
        )}

        {lobbyStatus === 'pending' && (
          <div>
            <h2 style={{ color: '#facc15', marginBottom: '10px' }}>Waiting for Instructor...</h2>
            <p style={{ color: '#94a3b8' }}>Please wait while the instructor admits you to the studio session.</p>
            <div className="spinner" style={{ margin: '20px auto', width: '40px', height: '40px', border: '4px solid #334155', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        )}

        {(lobbyStatus === 'rejected' || lobbyStatus === 'denied') && (
          <div>
            <h2 style={{ color: '#ef4444', marginBottom: '10px' }}>No Access</h2>
            <p style={{ color: '#94a3b8', marginBottom: '20px' }}>Access is not available now, please contact Admin.</p>
            <button
              onClick={() => setLobbyStatus('initial')}
              style={{ width: '100%', padding: '12px', background: '#475569', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}