/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect } from 'react';
import { db } from '../firebase'; // Firestore instance
import { doc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';

/**
 * Custom hook to manage the Live Guest Container (gc) state from the Instructor (ic) perspective
 */
export function useGuestContainer(sessionId, instructorId = "instructor-ic") {
  const [gcUsers, setGcUsers] = useState([]);
  const [isFirebaseUpdating, setIsFirebaseUpdating] = useState(false);

  // 1. Initialize the session container with exactly ONE user: the Instructor (ic)
  useEffect(() => {
    if (!sessionId) return;

    const sessionRef = doc(db, "sessions", sessionId);
    
    const initializeContainer = async () => {
      // Set the structural layout baseline: gc starts with just the ic profile
      const currentRole = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('stagetrack_role') : null;
      if (currentRole === 'student') {
        console.log("Student client, skipping container initialization");
        return;
      }

      const initialPayload = {
        activeUsers: [
          {
            uid: instructorId,
            role: 'ic', // Instructor
            joinedAt: Date.now(),
            slotIndex: 0
          }
        ],
        inviteActive: false,
        createdAt: Date.now()
      };

      try {
        await setDoc(sessionRef, initialPayload, { merge: true });
        console.log("GC successfully initialized with 1 user: IC");
      } catch (err) {
        console.error("Failed to initialize structural gc:", err);
      }
    };

    initializeContainer();

    // 2. Listen for incoming live guest connections real-time
    const unsubscribe = onSnapshot(sessionRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.activeUsers) {
          setGcUsers(data.activeUsers);
        }
      }
    });

    return () => unsubscribe();
  }, [sessionId, instructorId]);

  // 3. Action trigger to activate the live invitation without interrupting current state
  const handleToggleInvite = async () => {
    if (isFirebaseUpdating) return; // Serial queue locking mechanism
    setIsFirebaseUpdating(true);

    try {
      const sessionRef = doc(db, "sessions", sessionId);
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '0.0.0.0';
      const baseOrigin = isLocalhost ? 'https://stagetrack-v4-260430-461-92681.web.app' : window.location.origin;
      const inviteUrl = `${baseOrigin}/?session=${sessionId}&role=guest`;
      
      // Update invite state and copy link to clipboard programmatically
      await updateDoc(sessionRef, { inviteActive: true });
      await navigator.clipboard.writeText(inviteUrl);
      
      console.log("Invite link copied to clipboard cleanly:", inviteUrl);
      alert(`Invite link copied to clipboard cleanly!\nURL: ${inviteUrl}`);
    } catch (err) {
      console.error("Invite toggle execution failed:", err);
      // Fallback prompt if clipboard API fails
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '0.0.0.0';
      const baseOrigin = isLocalhost ? 'https://stagetrack-v4-260430-461-92681.web.app' : window.location.origin;
      const inviteUrl = `${baseOrigin}/?session=${sessionId}&role=guest`;
      prompt("Copy this link:", inviteUrl);
    } finally {
      setIsFirebaseUpdating(false); // Release network lock
    }
  };

  return { gcUsers, handleToggleInvite, isFirebaseUpdating };
}

/**
 * Layout Component displaying the structural grid starting with the Instructor
 */
export function StudioLiveLayoutView({ sessionId, sharedState }) {
  // Use state from AppContext if provided (sharedState), otherwise use local instance of hook
  const localState = useGuestContainer(sessionId);
  const { gcUsers, handleToggleInvite, isFirebaseUpdating } = sharedState || localState;

  // Premium inline styles to support high fidelity visual presentation without tailwind utilities
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      padding: '24px',
      maxWidth: '1024px',
      width: '100%',
      margin: '0 auto',
      boxSizing: 'border-box',
      zIndex: 10
    },
    controlStrip: {
      display: 'flex',
      justifyContent: 'flex-start',
      alignItems: 'center',
      gap: '16px'
    },
    inviteButton: {
      padding: '10px 24px',
      borderRadius: '8px',
      fontWeight: 'bold',
      color: '#ffffff',
      letterSpacing: '0.05em',
      transition: 'all 0.2s ease',
      border: 'none',
      cursor: 'pointer',
      backgroundColor: '#2563eb', // blue-600
      fontSize: '14px',
      boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.25)'
    },
    inviteButtonDisabled: {
      backgroundColor: '#334155', // slate-700
      opacity: 0.5,
      cursor: 'not-allowed',
      boxShadow: 'none'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '16px',
      width: '100%'
    },
    userCard: {
      position: 'relative',
      borderRadius: '12px',
      aspectRatio: '16 / 9',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      transition: 'all 0.2s ease',
      boxSizing: 'border-box'
    },
    instructorCard: {
      backgroundColor: 'rgba(15, 23, 42, 0.75)', // slate-900/60
      borderColor: 'rgba(234, 179, 8, 0.5)', // yellow-500/50
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 0 15px rgba(234, 179, 8, 0.25)'
    },
    guestCard: {
      backgroundColor: 'rgba(30, 41, 59, 0.5)', // slate-800/40
      borderColor: 'rgba(255, 255, 255, 0.15)',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)'
    },
    badge: {
      position: 'absolute',
      top: '8px',
      left: '8px',
      fontSize: '9px',
      fontWeight: '900',
      padding: '2px 6px',
      borderRadius: '4px',
      backgroundColor: '#020617', // slate-950
      color: '#94a3b8', // slate-400
      letterSpacing: '0.05em'
    },
    avatar: {
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      backgroundColor: '#334155', // slate-700
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      color: '#ffffff',
      fontSize: '18px'
    },
    placeholder: {
      border: '1px dashed rgba(255, 255, 255, 0.1)',
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
      borderRadius: '12px',
      aspectRatio: '16 / 9',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#64748b', // slate-500
      fontWeight: '500',
      fontSize: '13px',
      boxSizing: 'border-box'
    }
  };

  return (
    <div style={styles.container}>
      {/* Control Strip matching your visual panel */}
      <div style={styles.controlStrip}>
        <button
          onClick={handleToggleInvite}
          disabled={isFirebaseUpdating}
          style={{
            ...styles.inviteButton,
            ...(isFirebaseUpdating ? styles.inviteButtonDisabled : {})
          }}
          onMouseEnter={(e) => {
            if (!isFirebaseUpdating) e.currentTarget.style.backgroundColor = '#1d4ed8';
          }}
          onMouseLeave={(e) => {
            if (!isFirebaseUpdating) e.currentTarget.style.backgroundColor = '#2563eb';
          }}
        >
          {isFirebaseUpdating ? 'Generating...' : 'INVITE 🔗'}
        </button>
      </div>

      {/* The Dynamic Guest Container (gc) Grid */}
      <div style={styles.grid}>
        {gcUsers.map((user) => {
          const isIc = user.role === 'ic';
          return (
            <div 
              key={user.uid} 
              style={{
                ...styles.userCard,
                ...(isIc ? styles.instructorCard : styles.guestCard)
              }}
            >
              {/* Structural role badges */}
              <span style={styles.badge}>
                {isIc ? 'INSTRUCTOR' : 'GUEST'}
              </span>
              
              <div style={styles.avatar}>
                {isIc ? 'I' : 'G'}
              </div>
            </div>
          );
        })}
        
        {/* Visual placeholders for remaining empty slots if grid only contains instructor */}
        {gcUsers.length === 1 && (
          <>
            <div style={styles.placeholder}>Empty Guest Slot 1</div>
            <div style={styles.placeholder}>Empty Guest Slot 2</div>
          </>
        )}
      </div>
    </div>
  );
}
