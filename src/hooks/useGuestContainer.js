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


      const mockGuests = [];

      const initialPayload = {
        activeUsers: [
          {
            uid: instructorId,
            role: 'ic', // Instructor
            joinedAt: Date.now(),
            slotIndex: 0
          },
          ...mockGuests
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
